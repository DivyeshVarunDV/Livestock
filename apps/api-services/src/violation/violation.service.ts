
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ViolationService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.violation.findMany({
      include: {
        farm: { select: { id: true, farmerId: true, name: true, ownerName: true } },
        animal: { select: { id: true, animalCode: true, name: true } },
        milkCollection: { select: { id: true, batchId: true, productType: true, collectionCenter: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.violation.findUnique({
      where: { id },
      include: {
        farm: true,
        animal: true,
        milkCollection: true,
      },
    });
    if (!record) throw new NotFoundException('Record not found');
    return record;
  }

  async create(dto: any) {
    return this.prisma.violation.create({
      data: {
        violationCode: dto.violationCode || null,
        farmId: dto.farmId,
        animalId: dto.animalId || null,
        collectionId: dto.collectionId || null,
        batchId: dto.batchId || null,
        productType: dto.productType || null,
        date: dto.date ? new Date(dto.date) : new Date(),
        type: dto.type,
        severity: dto.severity || 'HIGH',
        evidence: dto.evidence || null,
        status: dto.status || 'PENDING_INVESTIGATION',
        adminRemarks: dto.adminRemarks || null,
      },
    });
  }

  async update(id: string, dto: any) {
    return this.prisma.violation.update({
      where: { id },
      data: {
        type: dto.type,
        severity: dto.severity,
        evidence: dto.evidence,
        status: dto.status,
        adminRemarks: dto.adminRemarks,
        productType: dto.productType,
        batchId: dto.batchId,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.violation.delete({ where: { id } });
  }
}
