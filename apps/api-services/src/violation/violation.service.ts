import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { ComplianceService } from '../compliance/compliance.service';
import { NotificationService } from '../notification/notification.service';
import { Actor } from '../common/actor';
import { generateCode } from '../common/codes';
import { assertTransition } from '../common/state-machine';
import { diffFields, parseDate } from '../common/diff';
import { Permission, roleHasPermission } from '../auth/permissions';

export const VIOLATION_TRANSITIONS = {
  PENDING_INVESTIGATION: ['UNDER_REVIEW', 'CONFIRMED', 'DISMISSED', 'RESOLVED'],
  UNDER_REVIEW: ['PENDING_INVESTIGATION', 'CONFIRMED', 'DISMISSED', 'RESOLVED'],
  CONFIRMED: ['UNDER_REVIEW', 'RESOLVED'],
  RESOLVED: ['UNDER_REVIEW'],
  DISMISSED: ['UNDER_REVIEW'],
} as const;

export const CLOSED_VIOLATION_STATUSES = ['RESOLVED', 'DISMISSED'];
const INITIAL_STATUSES = ['PENDING_INVESTIGATION', 'UNDER_REVIEW', 'CONFIRMED'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const EDITABLE_FIELDS = ['type', 'severity', 'evidence', 'productType', 'batchId', 'description', 'notes'] as const;

@Injectable()
export class ViolationService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private compliance: ComplianceService,
    private notifications: NotificationService,
  ) {}

  async findAll() {
    return this.prisma.violation.findMany({
      include: {
        farm: { select: { id: true, farmerId: true, name: true, ownerName: true } },
        animal: { select: { id: true, animalCode: true, name: true } },
        milkCollection: { select: { id: true, batchId: true, productType: true, collectionCenter: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.violation.findUnique({
      where: { id },
      include: {
        farm: true,
        animal: true,
        milkCollection: true,
      },
    });
    if (!record) throw new NotFoundException('Record not found');
    return record;
  }

  async create(actor: Actor, dto: any) {
    const type = String(dto?.type || '').trim().toUpperCase();
    if (!type) throw new BadRequestException('type is required');
    const severity = String(dto.severity || 'HIGH').toUpperCase();
    if (!SEVERITIES.includes(severity)) throw new BadRequestException(`severity must be one of ${SEVERITIES.join(', ')}`);
    const status = String(dto.status || 'PENDING_INVESTIGATION').toUpperCase();
    if (!INITIAL_STATUSES.includes(status)) {
      throw new BadRequestException(`A new case must start as one of ${INITIAL_STATUSES.join(', ')}`);
    }
    if (status !== 'PENDING_INVESTIGATION' && !roleHasPermission(actor.role, Permission.VIOLATION_UPDATE)) {
      throw new ForbiddenException('You may only report new cases as PENDING_INVESTIGATION.');
    }

    let farmId: string | null = dto.farmId || null;
    let animalId: string | null = dto.animalId || null;
    if (animalId) {
      const animal = await this.prisma.animal.findUnique({ where: { id: animalId } });
      if (!animal) throw new BadRequestException('Animal not found');
      if (farmId && farmId !== animal.farmId) throw new BadRequestException('Animal is not registered to the selected farm');
      farmId = animal.farmId;
    } else if (farmId) {
      const farm = await this.prisma.farm.findUnique({ where: { id: farmId } });
      if (!farm) throw new BadRequestException('Farm not found');
    } else if (!dto.batchId) {
      throw new BadRequestException('A violation must reference a farm, an animal or a batch');
    }
    animalId = animalId || null;

    const created = await this.prisma.violation.create({
      data: {
        violationCode: generateCode('VIO'),
        farmId,
        animalId,
        collectionId: dto.collectionId || null,
        batchId: dto.batchId || null,
        productType: dto.productType ? String(dto.productType).toUpperCase() : null,
        date: parseDate(dto.date, 'date') ?? new Date(),
        type,
        description: dto.description || null,
        severity,
        evidence: dto.evidence || null,
        status,
        adminRemarks: dto.adminRemarks || null,
        veterinarianId: actor.id,
        veterinarianName: actor.name,
      },
    });

    await this.audit.record(actor, {
      action: 'VIOLATION_REPORTED',
      entity: 'VIOLATION',
      entityId: created.id,
      newValue: { violationCode: created.violationCode, type, severity, status, farmId, animalId, batchId: created.batchId },
    });
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      await this.notifications.notify({
        title: `${severity} compliance case reported`,
        message: `${created.violationCode}: ${type} reported by ${actor.name}.`,
        type: 'ALERT',
        entityId: created.id,
        roles: ['ADMIN'],
      });
    }
    return created;
  }

  async update(actor: Actor, id: string, dto: any) {
    const existing = await this.prisma.violation.findUnique({ where: { id }, include: { farm: true } });
    if (!existing) throw new NotFoundException('Record not found');

    const nextStatus = dto?.status ? String(dto.status).toUpperCase() : existing.status;
    assertTransition(VIOLATION_TRANSITIONS, existing.status, nextStatus, 'Violation');
    const closing = CLOSED_VIOLATION_STATUSES.includes(nextStatus) && nextStatus !== existing.status;
    const reopening = CLOSED_VIOLATION_STATUSES.includes(existing.status) && nextStatus !== existing.status;

    if ((closing || reopening) && !roleHasPermission(actor.role, Permission.VIOLATION_RESOLVE)) {
      throw new ForbiddenException('Only an administrator can close or re-open a compliance case.');
    }
    const remarks = dto?.adminRemarks !== undefined ? String(dto.adminRemarks ?? '').trim() : existing.adminRemarks;
    if (closing && !remarks) {
      throw new BadRequestException(`Remarks explaining the decision are required to mark a case ${nextStatus}.`);
    }

    const data: any = {};
    for (const key of EDITABLE_FIELDS) {
      if (dto?.[key] !== undefined) data[key] = dto[key];
    }
    if (data.severity !== undefined) {
      data.severity = String(data.severity).toUpperCase();
      if (!SEVERITIES.includes(data.severity)) throw new BadRequestException(`severity must be one of ${SEVERITIES.join(', ')}`);
    }
    // Case facts are frozen once closed; only a re-open allows edits.
    if (CLOSED_VIOLATION_STATUSES.includes(existing.status) && !reopening) {
      const changedFacts = diffFields(existing, data, Object.keys(data));
      if (changedFacts.changed) {
        throw new BadRequestException(`A ${existing.status} case is closed. Re-open it (UNDER_REVIEW) to amend: ${Object.keys(changedFacts.after).join(', ')}.`);
      }
    }
    if (dto?.adminRemarks !== undefined) data.adminRemarks = remarks || null;
    data.status = nextStatus;
    if (closing) data.resolvedDate = new Date();
    if (reopening) data.resolvedDate = null;

    const updated = await this.prisma.violation.update({ where: { id }, data });

    const diff = diffFields(existing, updated, Object.keys(data));
    if (diff.changed) {
      await this.audit.record(actor, {
        action: closing ? `VIOLATION_${nextStatus}` : reopening ? 'VIOLATION_REOPENED' : nextStatus !== existing.status ? 'VIOLATION_STATUS_CHANGED' : 'VIOLATION_UPDATED',
        entity: 'VIOLATION',
        entityId: id,
        oldValue: diff.before,
        newValue: diff.after,
      });
    }

    if (closing && existing.animalId) {
      await this.compliance.releaseInvestigationHold(existing.animalId, existing.productType, actor);
    }
    if (reopening && existing.animalId && existing.productType) {
      await this.compliance.placeInvestigationHold(existing.animalId, existing.productType, `Case ${existing.violationCode} re-opened`);
    }
    if (nextStatus === 'CONFIRMED' && existing.status !== 'CONFIRMED' && existing.farm?.ownerId) {
      await this.notifications.notify({
        title: 'Compliance violation confirmed',
        message: `Case ${existing.violationCode} (${existing.type}) concerning your farm ${existing.farm.name} has been confirmed. Please contact your district livestock office.`,
        type: 'ALERT',
        entityId: id,
        userId: existing.farm.ownerId,
      });
    }
    return updated;
  }

  async remove(actor: Actor, id: string) {
    const existing = await this.prisma.violation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Record not found');
    if (['CONFIRMED', 'RESOLVED'].includes(existing.status)) {
      throw new ConflictException(`A ${existing.status} case is an enforcement record and cannot be deleted.`);
    }
    await this.prisma.violation.delete({ where: { id } });
    await this.audit.record(actor, { action: 'VIOLATION_DELETED', entity: 'VIOLATION', entityId: id, oldValue: existing });
    if (existing.animalId) {
      await this.compliance.releaseInvestigationHold(existing.animalId, existing.productType, actor);
    }
    return { success: true };
  }
}
