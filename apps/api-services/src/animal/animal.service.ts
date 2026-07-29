import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AnimalService {
  constructor(private prisma: PrismaService) {}

  async findAll(farmId?: string) {
    const where: any = {};
    if (farmId) {
      where.farmId = farmId;
    }
    return this.prisma.animal.findMany({
      where,
      include: { farm: { select: { id: true, name: true } } },
    });
  }

  async findOne(id: string) {
    const animal = await this.prisma.animal.findUnique({
      where: { id },
      include: {
        farm: { select: { id: true, name: true, ownerName: true } },
        healthRecords: { orderBy: { date: 'desc' } },
        vaccinations: { orderBy: { vaccinationDate: 'desc' } },
        treatments: { orderBy: { administrationDate: 'desc' } },
      },
    });
    if (!animal) throw new NotFoundException('Animal not found');
    return animal;
  }

  async create(dto: any) {
    return this.prisma.animal.create({
      data: {
        tagNumber: dto.tagNumber,
        name: dto.name,
        species: dto.species,
        breed: dto.breed,
        gender: dto.gender,
        age: Number(dto.age),
        weight: Number(dto.weight),
        status: dto.status || 'HEALTHY',
        mrlStatus: dto.mrlStatus || 'CLEARED',
        farmId: dto.farmId,
      },
    });
  }

  async update(id: string, dto: any) {
    const data: any = { ...dto };
    if (dto.age !== undefined) data.age = Number(dto.age);
    if (dto.weight !== undefined) data.weight = Number(dto.weight);

    return this.prisma.animal.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.animal.delete({
      where: { id },
    });
  }
}
