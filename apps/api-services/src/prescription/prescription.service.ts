import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { Actor } from '../common/actor';
import { generateCode } from '../common/codes';
import { assertTransition } from '../common/state-machine';
import { parseDate, requireFields } from '../common/diff';
import { ruleMatchesDrug } from '../treatment/treatment.service';

const DAY_MS = 24 * 60 * 60 * 1000;

export const PRESCRIPTION_TRANSITIONS = {
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
} as const;

@Injectable()
export class PrescriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Prescriptions whose validity period has ended are closed automatically. */
  private async expireLapsed() {
    await this.prisma.prescription.updateMany({
      where: { status: 'ACTIVE', endDate: { lt: new Date(Date.now() - DAY_MS) } },
      data: { status: 'COMPLETED' },
    });
  }

  async findAll(animalId?: string, status?: string) {
    await this.expireLapsed();
    const where: any = {};
    if (animalId) where.animalId = animalId;
    if (status) where.status = status;

    return this.prisma.prescription.findMany({
      where,
      include: {
        animal: {
          select: { id: true, name: true, tagNumber: true, animalCode: true, species: true,
            farm: { select: { id: true, farmerId: true, name: true } },
          },
        },
        dispensingRecords: { orderBy: { createdAt: 'desc' } },
        treatments: { orderBy: { administrationDate: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    await this.expireLapsed();
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        animal: {
          include: { farm: true },
        },
        dispensingRecords: { orderBy: { createdAt: 'desc' } },
        treatments: { orderBy: { administrationDate: 'desc' } },
      },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');
    return prescription;
  }

  async create(actor: Actor, data: any) {
    requireFields(data, ['animalId', 'medicine', 'dosage']);
    const duration = data.duration !== undefined && data.duration !== '' ? Number(data.duration) : NaN;
    if (!Number.isInteger(duration) || duration < 1 || duration > 365) {
      throw new BadRequestException('duration must be a whole number of days between 1 and 365');
    }

    const animal = await this.prisma.animal.findUnique({ where: { id: data.animalId }, include: { farm: true } });
    if (!animal) throw new BadRequestException('Animal not found');
    if (animal.currentStatus && animal.currentStatus !== 'ACTIVE') {
      throw new BadRequestException(`Cannot prescribe for an animal with status ${animal.currentStatus}`);
    }

    const startDate = parseDate(data.startDate, 'startDate') ?? new Date();
    let endDate = parseDate(data.endDate, 'endDate');
    if (!endDate) endDate = new Date(startDate.getTime() + duration * DAY_MS);
    if (endDate < startDate) throw new BadRequestException('endDate cannot be before startDate');

    // Withdrawal period: never below the applicable MRL rule.
    const rules = await this.prisma.mrlRule.findMany({ where: { species: animal.species, status: 'ACTIVE' } });
    const ruleDays = rules
      .filter((r) => ruleMatchesDrug(r.drugName, data.medicine, data.activeIngredient))
      .reduce((max, r) => Math.max(max, r.withdrawalPeriod), 0);
    const requested = data.applicableWithdrawalPeriod !== undefined && data.applicableWithdrawalPeriod !== '' && data.applicableWithdrawalPeriod !== null
      ? Number(data.applicableWithdrawalPeriod)
      : 0;
    if (!Number.isFinite(requested) || requested < 0) {
      throw new BadRequestException('applicableWithdrawalPeriod must be a non-negative number of days');
    }
    const applicableWithdrawalPeriod = Math.max(Math.floor(requested), ruleDays) || null;

    const prescriptionCode = generateCode('RX');
    const prescription = await this.prisma.prescription.create({
      data: {
        prescriptionCode,
        animalId: animal.id,
        farmerId: animal.farm?.farmerId || data.farmerId || null,
        medicine: data.medicine,
        activeIngredient: data.activeIngredient || null,
        veterinarianId: actor.id,
        veterinarianName: actor.name,
        dosage: data.dosage,
        route: data.route || null,
        frequency: data.frequency || null,
        duration,
        startDate,
        endDate,
        instructions: data.instructions || '',
        applicableWithdrawalPeriod,
        prescriptionDate: parseDate(data.prescriptionDate, 'prescriptionDate') ?? new Date(),
        status: 'ACTIVE',
      },
    });

    await this.audit.record(actor, {
      action: 'PRESCRIPTION_CREATED',
      entity: 'PRESCRIPTION',
      entityId: prescription.id,
      newValue: { prescriptionCode, animalId: animal.id, medicine: data.medicine, duration, applicableWithdrawalPeriod },
    });

    return prescription;
  }

  async updateStatus(actor: Actor, id: string, status: string, reason?: string) {
    const existing = await this.prisma.prescription.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Prescription not found');
    const next = String(status || '').toUpperCase();
    assertTransition(PRESCRIPTION_TRANSITIONS, existing.status, next, 'Prescription');
    if (actor.role !== 'ADMIN' && existing.veterinarianId && existing.veterinarianId !== actor.id) {
      throw new ForbiddenException('Only the prescribing veterinarian or an administrator can change this prescription.');
    }
    if (next === 'CANCELLED' && !String(reason || '').trim()) {
      throw new BadRequestException('A reason is required to cancel a prescription.');
    }
    const updated = await this.prisma.prescription.update({
      where: { id },
      data: {
        status: next,
        instructions: next === 'CANCELLED' ? `${existing.instructions}\n[Cancelled by ${actor.name}: ${reason}]`.trim() : existing.instructions,
      },
    });
    await this.audit.record(actor, {
      action: `PRESCRIPTION_${next}`,
      entity: 'PRESCRIPTION',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: next, reason: reason || null },
    });
    return updated;
  }

  async remove(actor: Actor, id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: { _count: { select: { treatments: true, dispensingRecords: true } } },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');
    if (prescription._count.treatments > 0 || prescription._count.dispensingRecords > 0) {
      throw new ConflictException('Prescription has been dispensed or used in a treatment and cannot be deleted. Cancel it instead.');
    }
    await this.prisma.prescription.delete({ where: { id } });
    const { _count, ...snapshot } = prescription;
    await this.audit.record(actor, { action: 'PRESCRIPTION_DELETED', entity: 'PRESCRIPTION', entityId: id, oldValue: snapshot });
    return { success: true };
  }
}
