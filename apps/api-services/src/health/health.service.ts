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
        diseases: dto.diseases,
        diagnosis: dto.diagnosis,
        treatmentNotes: dto.treatmentNotes,
        veterinarianId: dto.veterinarianId || null,
        veterinarianName: dto.veterinarianName || 'System Vet',
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    });

    await this.prisma.animal.update({
      where: { id: dto.animalId },
      data: { status: 'UNDER_TREATMENT' },
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
