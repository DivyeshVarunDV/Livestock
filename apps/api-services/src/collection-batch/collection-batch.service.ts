import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CollectionBatchService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string, productType?: string) {
    return this.prisma.collectionBatch.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(productType ? { productType } : {}),
      },
      include: {
        collections: {
          include: {
            animal: { select: { id: true, animalCode: true, name: true, tagNumber: true } },
            farm: { select: { id: true, farmerId: true, name: true } },
          },
        },
      },
      orderBy: { collectionDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.collectionBatch.findUnique({
      where: { id },
      include: {
        collections: {
          include: {
            animal: {
              include: {
                farm: true,
                treatments: { orderBy: { administrationDate: 'desc' } },
                withdrawalRecords: { orderBy: { withdrawalEndDate: 'desc' } },
                amuRecords: { orderBy: { createdAt: 'desc' } },
              },
            },
            farm: true,
          },
        },
      },
    });
    if (!record) throw new NotFoundException(`CollectionBatch with ID ${id} not found`);
    return record;
  }

  async create(dto: any) {
    const count = await this.prisma.collectionBatch.count();
    const batchCode = `BATCH${1001 + count}`;

    const newRecord = await this.prisma.collectionBatch.create({
      data: {
        batchCode,
        productType: dto.productType || 'MILK',
        collectionDate: dto.collectionDate ? new Date(dto.collectionDate) : new Date(),
        collectionCenter: dto.collectionCenter || null,
        notes: dto.notes || null,
        status: 'CREATED',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userName: dto.userName || 'System',
        role: 'TESTER',
        action: 'Batch Created',
        entity: 'COLLECTION_BATCH',
        entityId: newRecord.id,
        newValue: JSON.stringify({ batchCode, productType: dto.productType }),
      },
    });

    return newRecord;
  }

  async update(id: string, dto: any) {
    const oldRecord = await this.prisma.collectionBatch.findUnique({ where: { id } });
    if (!oldRecord) throw new NotFoundException(`CollectionBatch with ID ${id} not found`);

    const updated = await this.prisma.collectionBatch.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });

    // Auto-create investigation when batch fails
    if (dto.status === 'FAILED' && oldRecord.status !== 'FAILED') {
      await this.prisma.violation.create({
        data: {
          type: 'BATCH_FAILED',
          description: `Batch ${oldRecord.batchCode} failed product testing`,
          severity: 'HIGH',
          productType: oldRecord.productType,
          date: new Date(),
          status: 'PENDING_INVESTIGATION',
          batchId: oldRecord.batchCode,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userName: dto.userName || 'System',
        role: 'TESTER',
        action: 'Batch Status Updated',
        entity: 'COLLECTION_BATCH',
        entityId: id,
        oldValue: oldRecord.status,
        newValue: dto.status,
      },
    });

    return updated;
  }

  async getTraceability(id: string) {
    const batch = await this.prisma.collectionBatch.findUnique({
      where: { id },
      include: {
        collections: {
          include: {
            animal: {
              include: {
                farm: true,
                treatments: { orderBy: { administrationDate: 'desc' }, take: 10 },
                amuRecords: { orderBy: { createdAt: 'desc' }, take: 10 },
                withdrawalRecords: { orderBy: { withdrawalEndDate: 'desc' }, take: 10 },
                vaccinations: { orderBy: { vaccinationDate: 'desc' }, take: 5 },
                productClearances: true,
              },
            },
            farm: true,
          },
        },
      },
    });

    if (!batch) throw new NotFoundException(`CollectionBatch with ID ${id} not found`);

    // Build traceability summary
    const farmers = new Map<string, any>();
    const animals = new Map<string, any>();

    for (const collection of batch.collections) {
      if (collection.farm) {
        farmers.set(collection.farm.id, collection.farm);
      }
      if (collection.animal) {
        animals.set(collection.animal.id, collection.animal);
      }
    }

    return {
      batch: { id: batch.id, batchCode: batch.batchCode, productType: batch.productType, status: batch.status, collectionDate: batch.collectionDate },
      collections: batch.collections,
      farmers: Array.from(farmers.values()),
      animals: Array.from(animals.values()),
      totalCollections: batch.collections.length,
      totalFarmers: farmers.size,
      totalAnimals: animals.size,
    };
  }
}
