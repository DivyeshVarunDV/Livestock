import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService
  ) {}

  async findByAnimal(animalId: string) {
    return this.prisma.healthRecord.findMany({
      where: { animalId },
      orderBy: { date: 'desc' },
    });
  }

  async create(dto: any) {
    const record = await this.prisma.healthRecord.create({
      data: {
        animalId: dto.animalId,
        recordCode: dto.recordCode || null,
        diseases: dto.diseases,
        symptoms: dto.symptoms || null,
        diagnosis: dto.diagnosis,
        treatment: dto.treatment || null,
        medicine: dto.medicine || null,
        treatmentNotes: dto.treatmentNotes,
        checkupDate: dto.checkupDate ? new Date(dto.checkupDate) : null,
        nextCheckupDate: dto.nextCheckupDate ? new Date(dto.nextCheckupDate) : null,
        notes: dto.notes || null,
        veterinarianId: dto.veterinarianId || null,
        veterinarianName: dto.veterinarianName || 'System Vet',
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    });

    await this.prisma.animal.update({
      where: { id: dto.animalId },
      data: { status: 'UNDER_TREATMENT' },
    });

    await this.prisma.auditLog.create({
      data: {
        userName: dto.veterinarianName || 'System Vet',
        role: 'VETERINARIAN',
        action: 'Health Record Added',
        entity: 'HEALTH_RECORD',
        entityId: record.id,
        newValue: JSON.stringify({ animalId: dto.animalId, diagnosis: dto.diagnosis }),
      },
    });

    await this.ledgerService.appendToLedger('CREATE_HEALTH_RECORD', record.id, record);

    return record;
  }

  async remove(id: string) {
    return this.prisma.healthRecord.delete({
      where: { id },
    });
  }
}
