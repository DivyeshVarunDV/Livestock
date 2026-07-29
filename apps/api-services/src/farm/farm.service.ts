import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FarmService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.farm.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { animals: true } },
      },
    });
  }

  async findOne(id: string) {
    const farm = await this.prisma.farm.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        animals: true,
      },
    });
    if (!farm) throw new NotFoundException('Farm not found');
    return farm;
  }

  async create(dto: any) {
    return this.prisma.farm.create({
      data: {
        name: dto.name,
        ownerId: dto.ownerId || null,
        ownerName: dto.ownerName || 'Unknown Owner',
        address: dto.address,
        contactNumber: dto.contactNumber,
        location: dto.location,
      },
    });
  }

  async update(id: string, dto: any) {
    return this.prisma.farm.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    return this.prisma.farm.delete({
      where: { id },
    });
  }
}
