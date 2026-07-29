import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class VaccinationService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService
  ) {}

  async findByAnimal(animalId: string) {
    return this.prisma.vaccination.findMany({
      where: { animalId },
      orderBy: { vaccinationDate: 'desc' },
    });
  }

  async create(dto: any) {
    const vac = await this.prisma.vaccination.create({
      data: {
        animalId: dto.animalId,
        vaccineName: dto.vaccineName,
        vaccinationDate: dto.vaccinationDate
          ? new Date(dto.vaccinationDate)
          : new Date(),
        nextDueDate: new Date(dto.nextDueDate),
        veterinarianId: dto.veterinarianId || null,
        veterinarianName: dto.veterinarianName || 'System Vet',
      },
    });
    
    await this.ledgerService.appendToLedger('CREATE_VACCINATION', vac.id, vac);
    return vac;
  }

  async getUpcoming() {
    return this.prisma.vaccination.findMany({
      where: {
        nextDueDate: {
          gte: new Date(),
        },
      },
      include: {
        animal: {
          select: {
            id: true,
            name: true,
            tagNumber: true,
            farm: { select: { name: true } },
          },
        },
      },
      orderBy: { nextDueDate: 'asc' },
      take: 10,
    });
  }

  async remove(id: string) {
    return this.prisma.vaccination.delete({
      where: { id },
    });
  }
}
