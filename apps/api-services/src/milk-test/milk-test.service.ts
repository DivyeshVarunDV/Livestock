import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MilkTestService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.milkTest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.milkTest.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Record not found');
    return record;
  }

  async create(dto: any) {
    const record = await this.prisma.milkTest.create({
      data: {
        batchId: dto.batchId,
        sampleId: dto.sampleId || null,
        productType: dto.productType || 'MILK',
        date: dto.date ? new Date(dto.date) : new Date(),
        testDate: dto.testDate ? new Date(dto.testDate) : new Date(),
        type: dto.type,
        result: dto.result,
        notes: dto.remarks || null,
        location: dto.location,
        testingLocation: dto.testingLocation || dto.location,
        recordedById: dto.recordedById || null,
        recordedByName: dto.recordedByName || 'System Tester',
      },
    });

    if (dto.result === 'FAIL') {
      const batch = await this.prisma.milkCollection.findFirst({ where: { batchId: dto.batchId } });
      if (batch) {
        await this.prisma.violation.create({
          data: {
            violationCode: `VIO${record.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`,
            farmId: batch.farmId,
            animalId: batch.animalId || null,
            collectionId: batch.id,
            batchId: dto.batchId,
            productType: dto.productType || batch.productType,
            date: new Date(),
            type: 'FAILED_PRODUCT_TEST',
            severity: 'HIGH',
            evidence: dto.remarks || 'Residue detected. Investigation required.',
            status: 'PENDING_INVESTIGATION',
          }
        });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        userId: dto.recordedById || null,
        userName: dto.recordedByName || 'System Tester',
        role: 'TESTER',
        action: 'Product Test Recorded',
        entity: 'PRODUCT_TEST',
        entityId: record.id,
        newValue: JSON.stringify({ batchId: dto.batchId, result: dto.result, type: dto.type }),
      },
    });

    return record;
  }

  async update(id: string, dto: any) {
    return this.prisma.milkTest.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.milkTest.delete({ where: { id } });
  }
}
