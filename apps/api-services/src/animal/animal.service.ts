import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AnimalService {
  constructor(private prisma: PrismaService) {}

  private buildAnimalCode(species?: string, id?: string) {
    const prefixMap: Record<string, string> = {
      CATTLE: 'COW',
      BUFFALO: 'BUFFALO',
      GOAT: 'GOAT',
      SHEEP: 'SHEEP',
      PIG: 'PIG',
      POULTRY: 'POULTRY',
    };
    const prefix = prefixMap[(species || '').toUpperCase()] || 'ANIMAL';
    const suffix = (id || '').replace(/-/g, '').slice(0, 6).toUpperCase();
    return `${prefix}${suffix}`;
  }

  async findAll(farmId?: string) {
    const where: any = {};
    if (farmId) {
      where.farmId = farmId;
    }
    return this.prisma.animal.findMany({
      where,
      include: {
        farm: { select: { id: true, name: true, farmerId: true, ownerName: true } },
        withdrawalRecords: {
          where: { status: 'RESTRICTED' },
          orderBy: { withdrawalEndDate: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const animal = await this.prisma.animal.findUnique({
      where: { id },
      include: {
        farm: {
          select: {
            id: true,
            name: true,
            farmerId: true,
            ownerName: true,
            fullName: true,
            address: true,
          },
        },
        healthRecords: { orderBy: { date: 'desc' } },
        vaccinations: { orderBy: { vaccinationDate: 'desc' } },
        treatments: { orderBy: { administrationDate: 'desc' } },
        prescriptions: { orderBy: { prescriptionDate: 'desc' } },
        amuRecords: { orderBy: { createdAt: 'desc' } },
        withdrawalRecords: { orderBy: { withdrawalEndDate: 'desc' } },
        milkCollections: { orderBy: { createdAt: 'desc' } },
        violations: { orderBy: { createdAt: 'desc' } },
        ownershipTransfers: {
          orderBy: { requestDate: 'desc' },
          include: {
            currentOwner: { select: { id: true, name: true, email: true } },
            newOwner: { select: { id: true, name: true, email: true } },
            fromFarm: { select: { id: true, farmerId: true, name: true, ownerName: true } },
            toFarm: { select: { id: true, farmerId: true, name: true, ownerName: true } },
          },
        },
      },
    });
    if (!animal) throw new NotFoundException('Animal not found');
    return animal;
  }

  async create(dto: any) {
    try {
      const created = await this.prisma.animal.create({
        data: {
          tagNumber: dto.tagNumber,
          name: dto.name,
          species: dto.species,
          breed: dto.breed,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          age: Number(dto.age),
          weight: Number(dto.weight),
          color: dto.color || null,
          identificationMark: dto.identificationMark || null,
          photoUrl: dto.photoUrl || null,
          registrationDate: dto.registrationDate ? new Date(dto.registrationDate) : new Date(),
          currentStatus: dto.currentStatus || 'ACTIVE',
          status: dto.status || 'HEALTHY',
          mrlStatus: dto.mrlStatus || 'CLEARED',
          farmId: dto.farmId,
        },
      });

      return this.prisma.animal.update({
        where: { id: created.id },
        data: {
          animalCode: dto.animalCode || this.buildAnimalCode(dto.species, created.id),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('An animal with this Tag Number already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: any) {
    const data: any = { ...dto };
    if (dto.age !== undefined) data.age = Number(dto.age);
    if (dto.weight !== undefined) data.weight = Number(dto.weight);
    if (dto.dateOfBirth !== undefined) data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.registrationDate !== undefined) data.registrationDate = dto.registrationDate ? new Date(dto.registrationDate) : null;

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
