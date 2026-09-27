import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { Actor } from '../common/actor';
import { generateCode } from '../common/codes';
import { parseDate } from '../common/diff';

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
    private audit: AuditService,
  ) {}

  async findByAnimal(animalId?: string) {
    return this.prisma.healthRecord.findMany({
      where: animalId ? { animalId } : undefined,
      orderBy: { date: 'desc' },
    });
  }

  async create(actor: Actor, dto: any) {
    if (!dto?.animalId) throw new BadRequestException('animalId is required');
    const diagnosis = String(dto.diagnosis || '').trim();
    if (!diagnosis) throw new BadRequestException('diagnosis is required');

    const animal = await this.prisma.animal.findUnique({ where: { id: dto.animalId } });
    if (!animal) throw new BadRequestException('Animal not found');
    if (animal.currentStatus === 'DEAD') throw new BadRequestException('Records of a deceased animal are closed.');

    const date = parseDate(dto.date, 'date') ?? new Date();
    const nextCheckupDate = parseDate(dto.nextCheckupDate, 'nextCheckupDate');
    if (nextCheckupDate && nextCheckupDate < date) throw new BadRequestException('nextCheckupDate cannot be before the examination date');

    const record = await this.prisma.healthRecord.create({
      data: {
        animalId: animal.id,
        recordCode: dto.recordCode || generateCode('HR'),
        diseases: dto.diseases || diagnosis,
        symptoms: dto.symptoms || null,
        diagnosis,
        treatment: dto.treatment || null,
        medicine: dto.medicine || null,
        treatmentNotes: dto.treatmentNotes || '',
        checkupDate: parseDate(dto.checkupDate, 'checkupDate'),
        nextCheckupDate,
        notes: dto.notes || null,
        veterinarianId: actor.id,
        veterinarianName: actor.name,
        date,
      },
    });

    if (animal.status !== 'QUARANTINED' && animal.status !== 'UNDER_TREATMENT') {
      await this.prisma.animal.update({ where: { id: animal.id }, data: { status: 'UNDER_TREATMENT' } });
    }

    await this.audit.record(actor, {
      action: 'HEALTH_RECORD_ADDED',
      entity: 'HEALTH_RECORD',
      entityId: record.id,
      newValue: { animalId: animal.id, diagnosis },
    });
    await this.ledgerService.appendToLedger('CREATE_HEALTH_RECORD', record.id, record);
    return record;
  }

  async remove(actor: Actor, id: string) {
    const record = await this.prisma.healthRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Health record not found');
    await this.prisma.healthRecord.delete({ where: { id } });
    await this.audit.record(actor, { action: 'HEALTH_RECORD_DELETED', entity: 'HEALTH_RECORD', entityId: id, oldValue: record });
    await this.ledgerService.appendToLedger('DELETE_HEALTH_RECORD', id, { deletedBy: actor.id, record });
    return { success: true };
  }
}
