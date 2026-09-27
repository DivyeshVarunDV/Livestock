import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { Actor } from '../common/actor';
import { generateCode } from '../common/codes';
import { parseDate } from '../common/diff';

@Injectable()
export class AmuService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(animalId?: string) {
    return this.prisma.amuRecord.findMany({
      where: animalId ? { animalId } : undefined,
      include: {
        animal: { select: { id: true, animalCode: true, name: true, species: true } },
        treatment: { select: { id: true, drugName: true, withdrawalPeriod: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** An AMU record always documents an existing treatment of the same animal. */
  async create(actor: Actor, dto: any) {
    if (!dto?.treatmentId) throw new BadRequestException('treatmentId is required: antimicrobial use must be linked to a recorded treatment');
    const treatment = await this.prisma.treatment.findUnique({ where: { id: dto.treatmentId } });
    if (!treatment) throw new BadRequestException('Treatment not found');
    if (dto.animalId && dto.animalId !== treatment.animalId) {
      throw new BadRequestException('Animal does not match the linked treatment');
    }
    const startDate = parseDate(dto.startDate, 'startDate') ?? treatment.administrationDate;
    const endDate = parseDate(dto.endDate, 'endDate');
    if (endDate && endDate < startDate) throw new BadRequestException('endDate cannot be before startDate');

    const record = await this.prisma.amuRecord.create({
      data: {
        amuCode: dto.amuCode || generateCode('AMU'),
        animalId: treatment.animalId,
        treatmentId: treatment.id,
        medicine: dto.medicine || treatment.drugName,
        activeIngredient: dto.activeIngredient || treatment.activeIngredient || null,
        dosage: dto.dosage || treatment.dosage,
        route: dto.route || treatment.route || null,
        startDate,
        endDate,
        reason: dto.reason || treatment.reason || null,
        veterinarianId: actor.id,
        veterinarianName: actor.name,
      },
    });

    await this.audit.record(actor, {
      action: 'AMU_RECORD_ADDED',
      entity: 'AMU_RECORD',
      entityId: record.id,
      newValue: { animalId: record.animalId, treatmentId: treatment.id, medicine: record.medicine, dosage: record.dosage },
    });
    return record;
  }

  async remove(actor: Actor, id: string) {
    const record = await this.prisma.amuRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException('AMU record not found');
    }
    await this.prisma.amuRecord.delete({ where: { id } });
    await this.audit.record(actor, { action: 'AMU_RECORD_DELETED', entity: 'AMU_RECORD', entityId: id, oldValue: record });
    return { success: true };
  }
}
