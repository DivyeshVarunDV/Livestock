import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MilkCollectionService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.milkCollection.findMany({
      include: {
        farm: { select: { id: true, farmerId: true, name: true, ownerName: true } },
        animal: { select: { id: true, animalCode: true, name: true, mrlStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.milkCollection.findUnique({
      where: { id },
      include: {
        farm: true,
        animal: {
          include: {
            withdrawalRecords: {
              orderBy: { withdrawalEndDate: 'desc' },
            },
          },
        },
        violations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!record) throw new NotFoundException('Record not found');
    return record;
  }

  async create(dto: any) {
    if (dto.animalId) {
      const animal = await this.prisma.animal.findUnique({
        where: { id: dto.animalId },
        include: {
          withdrawalRecords: {
            where: {
              status: 'RESTRICTED',
              productType: dto.productType || 'MILK',
            },
            orderBy: { withdrawalEndDate: 'desc' },
            take: 1,
          },
        },
      });
      if (animal && animal.withdrawalRecords.length > 0) {
        const activeRestriction = animal.withdrawalRecords[0];
        throw new BadRequestException(`Product from this animal is currently restricted until ${new Date(activeRestriction.withdrawalEndDate).toLocaleDateString()}.`);
      }
    }

    return this.prisma.milkCollection.create({
      data: {
        farmId: dto.farmId,
        animalId: dto.animalId || null,
        collectionCode: dto.collectionCode || null,
        sourceReference: dto.sourceReference || null,
        productType: dto.productType || 'MILK',
        quantity: Number(dto.quantity),
        collectionDate: dto.collectionDate ? new Date(dto.collectionDate) : new Date(),
        date: dto.date ? new Date(dto.date) : new Date(),
        collectionCenter: dto.collectionCenter,
        batchId: dto.batchId,
      },
    });
  }

  async update(id: string, dto: any) {
    return this.prisma.milkCollection.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.milkCollection.delete({ where: { id } });
  }
}
