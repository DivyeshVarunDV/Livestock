import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AmuService {
  constructor(private prisma: PrismaService) {}

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

  async create(dto: any) {
    const record = await this.prisma.amuRecord.create({
      data: {
        amuCode: dto.amuCode || null,
        animalId: dto.animalId,
        treatmentId: dto.treatmentId || null,
        medicine: dto.medicine,
        activeIngredient: dto.activeIngredient || null,
        dosage: dto.dosage,
        route: dto.route || null,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        reason: dto.reason || null,
        veterinarianId: dto.veterinarianId || null,
        veterinarianName: dto.veterinarianName || null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: dto.veterinarianId || null,
        userName: dto.veterinarianName || 'System Vet',
        role: 'VETERINARIAN',
        action: 'AMU Record Added',
        entity: 'AMU_RECORD',
        entityId: record.id,
        newValue: JSON.stringify({ animalId: dto.animalId, medicine: dto.medicine, dosage: dto.dosage }),
      },
    });

    return record;
  }

  async remove(id: string) {
    const record = await this.prisma.amuRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException('AMU record not found');
    }
    return this.prisma.amuRecord.delete({ where: { id } });
  }
}
