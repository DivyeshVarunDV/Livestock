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
    let complianceStatus = dto.complianceStatus;
    const measuredValue = dto.measuredValue !== undefined && dto.measuredValue !== '' ? parseFloat(dto.measuredValue) : null;
    const applicableMRLValue = dto.applicableMRLValue !== undefined && dto.applicableMRLValue !== '' ? parseFloat(dto.applicableMRLValue) : null;

    if (!complianceStatus && measuredValue !== null && applicableMRLValue !== null) {
      complianceStatus = measuredValue <= applicableMRLValue ? 'COMPLIANT' : 'NON_COMPLIANT';
    } else if (!complianceStatus) {
      complianceStatus = dto.result === 'PASS' ? 'COMPLIANT' : dto.result === 'FAIL' ? 'NON_COMPLIANT' : 'NOT_EVALUATED';
    }

    const testResult = dto.result || (complianceStatus === 'COMPLIANT' ? 'PASS' : complianceStatus === 'NON_COMPLIANT' ? 'FAIL' : 'PENDING');

    const record = await this.prisma.milkTest.create({
      data: {
        batchId: dto.batchId,
        sampleId: dto.sampleId || null,
        productType: dto.productType || 'MILK',
        date: dto.date ? new Date(dto.date) : new Date(),
        testDate: dto.testDate ? new Date(dto.testDate) : new Date(),
        type: dto.type,
        result: testResult,
        substance: dto.substance || null,
        measuredValue,
        measuredUnit: dto.measuredUnit || 'ug/kg',
        applicableMRLValue,
        complianceStatus,
        notes: dto.remarks || dto.notes || null,
        location: dto.location,
        testingLocation: dto.testingLocation || dto.location,
        recordedById: dto.recordedById || null,
        recordedByName: dto.recordedByName || 'System Tester',
      },
    });

    if (testResult === 'FAIL' || complianceStatus === 'NON_COMPLIANT') {
      const batch = await this.prisma.milkCollection.findFirst({ where: { batchId: dto.batchId } });
      const collectionBatch = await this.prisma.collectionBatch.findFirst({ where: { batchCode: dto.batchId } });

      if (collectionBatch) {
        await this.prisma.collectionBatch.update({
          where: { id: collectionBatch.id },
          data: { status: 'FAILED' },
        });
      }

      await this.prisma.violation.create({
        data: {
          violationCode: `VIO${record.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`,
          farmId: batch?.farmId || null,
          animalId: batch?.animalId || null,
          collectionId: batch?.id || null,
          batchId: dto.batchId,
          productType: dto.productType || batch?.productType || 'MILK',
          date: new Date(),
          type: 'FAILED_PRODUCT_TEST',
          severity: 'HIGH',
          evidence: dto.remarks || dto.notes || `Residue detected: ${dto.substance || 'Unknown'} (${measuredValue} ${dto.measuredUnit || 'ug/kg'}, MRL: ${applicableMRLValue || 'N/A'})`,
          status: 'PENDING_INVESTIGATION',
        },
      });
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
