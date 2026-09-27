import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Farm } from '@livestock/database';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { Actor } from '../common/actor';
import { generateCode } from '../common/codes';
import { assertTransition } from '../common/state-machine';
import { parseDate } from '../common/diff';
import { Permission, roleHasPermission } from '../auth/permissions';

export const TRANSFER_TRANSITIONS = {
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
} as const;

const OPEN_VIOLATION_STATUSES = ['PENDING_INVESTIGATION', 'UNDER_REVIEW', 'CONFIRMED'];

@Injectable()
export class OwnershipTransferService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationService,
  ) {}

  async findAll() {
    return this.prisma.ownershipTransfer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        animal: {
          include: {
            withdrawalRecords: {
              where: { status: 'RESTRICTED' },
              orderBy: { withdrawalEndDate: 'desc' },
            },
            treatments: {
              orderBy: { administrationDate: 'desc' },
              take: 3,
            },
            vaccinations: {
              orderBy: { vaccinationDate: 'desc' },
              take: 3,
            },
            healthRecords: {
              orderBy: { date: 'desc' },
              take: 3,
            },
          },
        },
        approvedBy: { select: { id: true, name: true, email: true } },
        currentOwner: { select: { id: true, name: true, email: true } },
        newOwner: { select: { id: true, name: true, email: true } },
        fromFarm: { select: { id: true, farmerId: true, name: true, ownerName: true, mobileNumber: true, district: true, village: true } },
        toFarm: { select: { id: true, farmerId: true, name: true, ownerName: true, mobileNumber: true, district: true, village: true } },
      },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.ownershipTransfer.findUnique({
      where: { id },
      include: {
        animal: {
          include: {
            withdrawalRecords: true,
            treatments: true,
            vaccinations: true,
            healthRecords: true,
            productClearances: true,
          },
        },
        approvedBy: { select: { id: true, name: true, email: true } },
        currentOwner: { select: { id: true, name: true, email: true } },
        newOwner: { select: { id: true, name: true, email: true } },
        fromFarm: { select: { id: true, farmerId: true, name: true, ownerName: true, mobileNumber: true, district: true } },
        toFarm: { select: { id: true, farmerId: true, name: true, ownerName: true, mobileNumber: true, district: true } },
      },
    });
    if (!record) throw new NotFoundException('Transfer record not found');
    return record;
  }

  async getAnimalsByFarmerId(farmerId: string) {
    const farm = await this.prisma.farm.findFirst({
      where: {
        OR: [
          { farmerId: { equals: farmerId } },
          { id: { equals: farmerId } },
        ],
      },
      include: {
        animals: {
          where: { OR: [{ currentStatus: 'ACTIVE' }, { currentStatus: null }] },
          include: {
            withdrawalRecords: {
              where: { status: 'RESTRICTED' },
              orderBy: { withdrawalEndDate: 'desc' },
            },
            treatments: {
              orderBy: { administrationDate: 'desc' },
              take: 3,
            },
            vaccinations: {
              orderBy: { vaccinationDate: 'desc' },
              take: 3,
            },
            healthRecords: {
              orderBy: { date: 'desc' },
              take: 3,
            },
          },
        },
      },
    });

    if (!farm) {
      throw new NotFoundException(`No farm found for Farmer ID: ${farmerId}`);
    }

    return farm;
  }

  async create(actor: Actor, dto: any) {
    if (!dto?.animalId) throw new BadRequestException('animalId is required');
    const animal = await this.prisma.animal.findUnique({
      where: { id: dto.animalId },
      include: { farm: true },
    });
    if (!animal) {
      throw new NotFoundException(`Animal with ID ${dto.animalId} not found`);
    }
    if (animal.currentStatus && animal.currentStatus !== 'ACTIVE') {
      throw new BadRequestException(`An animal with status ${animal.currentStatus} cannot be transferred.`);
    }
    // The source is always the farm the animal is registered to right now.
    if (dto.fromFarmId && dto.fromFarmId !== animal.farmId) {
      throw new ConflictException('The animal is no longer registered to the selected source farm. Refresh and try again.');
    }
    const fromFarm = animal.farm;

    let toFarm: Farm | null = null;
    if (dto.toFarmId) {
      toFarm = await this.prisma.farm.findUnique({ where: { id: dto.toFarmId } });
    } else if (dto.toFarmerId) {
      toFarm = await this.prisma.farm.findFirst({
        where: { OR: [{ farmerId: dto.toFarmerId }, { id: dto.toFarmerId }] },
      });
    }
    if (!toFarm) {
      throw new BadRequestException('Destination Farm / Farmer is required.');
    }
    if (toFarm.id === animal.farmId) {
      throw new BadRequestException('Source and Destination farms cannot be the same.');
    }
    if (toFarm.farmStatus !== 'ACTIVE') {
      throw new BadRequestException(`Destination farm is ${toFarm.farmStatus} and cannot receive animals.`);
    }

    const pending = await this.prisma.ownershipTransfer.findFirst({ where: { animalId: animal.id, status: 'PENDING' } });
    if (pending) {
      throw new ConflictException(`A transfer request (${pending.transferCode}) is already pending for this animal.`);
    }

    const transferCode = generateCode('TRF');
    const created = await this.prisma.ownershipTransfer.create({
      data: {
        transferCode,
        animalId: animal.id,
        currentOwnerId: fromFarm?.ownerId || null,
        newOwnerId: toFarm.ownerId || null,
        fromFarmId: animal.farmId,
        toFarmId: toFarm.id,
        requestDate: parseDate(dto.requestDate, 'requestDate') ?? new Date(),
        reason: dto.reason || null,
        notes: dto.notes || null,
        requestedById: actor.id,
        requestedByName: actor.name,
        status: 'PENDING',
      },
      include: {
        animal: true,
        fromFarm: true,
        toFarm: true,
      },
    });

    await this.audit.record(actor, {
      action: 'OWNERSHIP_TRANSFER_REQUESTED',
      entity: 'OWNERSHIP_TRANSFER',
      entityId: created.id,
      newValue: {
        transferCode,
        animalId: animal.id,
        animalCode: animal.animalCode || animal.tagNumber,
        from: fromFarm?.farmerId || fromFarm?.name,
        to: toFarm.farmerId || toFarm.name,
        reason: dto.reason || null,
        activeWithdrawal: animal.mrlStatus !== 'CLEARED',
      },
    });
    await this.notifications.notify({
      title: 'Ownership transfer awaiting approval',
      message: `${transferCode}: ${animal.name} (${animal.tagNumber}) from ${fromFarm?.name ?? 'unknown'} to ${toFarm.name}, requested by ${actor.name}.`,
      type: 'INFO',
      entityId: created.id,
      roles: ['ADMIN'],
    });

    return created;
  }

  async update(actor: Actor, id: string, dto: any) {
    const existing = await this.prisma.ownershipTransfer.findUnique({
      where: { id },
      include: { animal: true, fromFarm: true, toFarm: true },
    });
    if (!existing) {
      throw new NotFoundException('Transfer record not found');
    }

    const nextStatus = dto?.status ? String(dto.status).toUpperCase() : existing.status;
    assertTransition(TRANSFER_TRANSITIONS, existing.status, nextStatus, 'Ownership transfer');

    if (nextStatus === existing.status) {
      if (existing.status !== 'PENDING') {
        throw new BadRequestException(`A ${existing.status} transfer is closed and cannot be edited.`);
      }
      const updated = await this.prisma.ownershipTransfer.update({
        where: { id },
        data: {
          notes: dto.notes !== undefined ? dto.notes : existing.notes,
          reason: dto.reason !== undefined ? dto.reason : existing.reason,
        },
      });
      await this.audit.record(actor, {
        action: 'OWNERSHIP_TRANSFER_EDITED',
        entity: 'OWNERSHIP_TRANSFER',
        entityId: id,
        oldValue: { notes: existing.notes, reason: existing.reason },
        newValue: { notes: updated.notes, reason: updated.reason },
      });
      return this.findOne(id);
    }

    if (nextStatus === 'APPROVED' || nextStatus === 'REJECTED') {
      if (!roleHasPermission(actor.role, Permission.TRANSFER_DECIDE)) {
        throw new ForbiddenException('Only an authorised officer can approve or reject ownership transfers.');
      }
      if (existing.requestedById && existing.requestedById === actor.id) {
        throw new ForbiddenException('Segregation of duties: you cannot decide a transfer you requested yourself.');
      }
    }
    if (nextStatus === 'CANCELLED' && actor.role !== 'ADMIN' && existing.requestedById !== actor.id) {
      throw new ForbiddenException('Only the requester or an administrator can cancel this transfer.');
    }
    const rejectionReason = String(dto.rejectionReason || '').trim();
    if (nextStatus === 'REJECTED' && !rejectionReason) {
      throw new BadRequestException('A rejection reason is required.');
    }

    const now = new Date();
    if (nextStatus === 'APPROVED') {
      await this.prisma.$transaction(async (tx) => {
        const animal = await tx.animal.findUnique({ where: { id: existing.animalId } });
        if (!animal) throw new NotFoundException('Animal no longer exists');
        if (animal.farmId !== existing.fromFarmId) {
          throw new ConflictException('The animal has moved since this request was made. Reject this request and raise a new one.');
        }
        if (animal.currentStatus && animal.currentStatus !== 'ACTIVE') {
          throw new BadRequestException(`An animal with status ${animal.currentStatus} cannot be transferred.`);
        }
        const toFarm = existing.toFarmId ? await tx.farm.findUnique({ where: { id: existing.toFarmId } }) : null;
        if (!toFarm) throw new BadRequestException('Approved transfer requires a valid destination farm.');
        if (toFarm.farmStatus !== 'ACTIVE') throw new BadRequestException(`Destination farm is ${toFarm.farmStatus}.`);
        const openViolations = await tx.violation.count({
          where: { animalId: animal.id, status: { in: OPEN_VIOLATION_STATUSES } },
        });
        if (openViolations > 0) {
          throw new ConflictException('The animal is subject to an open compliance investigation and cannot change ownership until it is closed.');
        }

        // Conditional update guards against two approvers racing.
        const claimed = await tx.ownershipTransfer.updateMany({
          where: { id, status: 'PENDING' },
          data: {
            status: 'APPROVED',
            approvedById: actor.id,
            approvalDate: now,
            resolvedDate: now,
            newOwnerId: toFarm.ownerId || existing.newOwnerId,
            notes: dto.notes !== undefined ? dto.notes : existing.notes,
          },
        });
        if (claimed.count === 0) throw new ConflictException('This transfer was already decided by someone else.');
        await tx.animal.update({ where: { id: animal.id }, data: { farmId: toFarm.id, currentStatus: 'ACTIVE' } });
      });

      await this.audit.record(actor, {
        action: 'OWNERSHIP_TRANSFER_APPROVED',
        entity: 'OWNERSHIP_TRANSFER',
        entityId: id,
        oldValue: { farmId: existing.fromFarmId, farmName: existing.fromFarm?.name },
        newValue: { farmId: existing.toFarmId, farmName: existing.toFarm?.name, animalId: existing.animalId },
      });
    } else {
      const claimed = await this.prisma.ownershipTransfer.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: nextStatus,
          rejectionReason: nextStatus === 'REJECTED' ? rejectionReason : existing.rejectionReason,
          resolvedDate: now,
          notes: dto.notes !== undefined ? dto.notes : existing.notes,
        },
      });
      if (claimed.count === 0) throw new ConflictException('This transfer was already decided by someone else.');
      await this.audit.record(actor, {
        action: `OWNERSHIP_TRANSFER_${nextStatus}`,
        entity: 'OWNERSHIP_TRANSFER',
        entityId: id,
        newValue: { reason: rejectionReason || dto.notes || null },
      });
    }

    if (existing.requestedById) {
      await this.notifications.notify({
        title: `Transfer ${existing.transferCode} ${nextStatus.toLowerCase()}`,
        message: `Ownership transfer of ${existing.animal.name} (${existing.animal.tagNumber}) was ${nextStatus.toLowerCase()} by ${actor.name}.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
        type: nextStatus === 'APPROVED' ? 'INFO' : 'WARNING',
        entityId: id,
        userId: existing.requestedById,
      });
    }

    return this.findOne(id);
  }

  async remove(actor: Actor, id: string) {
    const existing = await this.prisma.ownershipTransfer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Transfer record not found');
    if (existing.status === 'APPROVED') {
      throw new ConflictException('An approved transfer is part of the chain of custody and cannot be deleted.');
    }
    await this.prisma.ownershipTransfer.delete({ where: { id } });
    await this.audit.record(actor, { action: 'OWNERSHIP_TRANSFER_DELETED', entity: 'OWNERSHIP_TRANSFER', entityId: id, oldValue: existing });
    return { success: true };
  }
}
