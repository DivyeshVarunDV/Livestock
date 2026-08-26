import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FarmService {
  constructor(private prisma: PrismaService) {}

  private buildFarmerId(id: string) {
    return `FARM${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  }

  async findAll() {
    return this.prisma.farm.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { animals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const farm = await this.prisma.farm.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        animals: {
          include: {
            withdrawalRecords: {
              where: { status: 'RESTRICTED' },
              orderBy: { withdrawalEndDate: 'desc' },
            },
            violations: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        milkCollections: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        violations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!farm) throw new NotFoundException('Farm not found');
    return farm;
  }

  async create(dto: any) {
    const data: any = {
      name: dto.name,
      ownerName: dto.ownerName || dto.fullName || 'Unknown Owner',
      fullName: dto.fullName || dto.ownerName || dto.name,
      address: dto.address,
      contactNumber: dto.contactNumber || dto.mobileNumber || '',
      location: dto.location,
    };
    if (dto.ownerId) {
      data.owner = { connect: { id: dto.ownerId } };
    }

    const created = await this.prisma.farm.create({ data });

    let finalFarmerId = dto.farmerId;
    if (!finalFarmerId) {
      const lastFarm = await this.prisma.farm.findFirst({
        where: { farmerId: { startsWith: 'FARM-' } },
        orderBy: { createdAt: 'desc' }
      });
      let nextNum = 1001;
      if (lastFarm && lastFarm.farmerId) {
        const match = lastFarm.farmerId.match(/FARM-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        } else {
          nextNum = (await this.prisma.farm.count()) + 1001;
        }
      } else {
        nextNum = (await this.prisma.farm.count()) + 1001;
      }
      finalFarmerId = `FARM-${nextNum}`;
    }

    return this.prisma.farm.update({
      where: { id: created.id },
      data: {
        farmerId: finalFarmerId,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(id: string, dto: any) {
    const data: any = {
      name: dto.name,
      farmerId: dto.farmerId,
      ownerName: dto.ownerName,
      fullName: dto.fullName,
      address: dto.address,
      contactNumber: dto.contactNumber,
      location: dto.location,
    };
    if (dto.ownerId) {
      data.owner = { connect: { id: dto.ownerId } };
    }

    return this.prisma.farm.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.farm.delete({
      where: { id },
    });
  }
}
