import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CollectionBatch, MilkCollection } from '@livestock/database';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { Actor } from '../common/actor';
import { generateCode } from '../common/codes';
import { assertTransition } from '../common/state-machine';
import { parseDate } from '../common/diff';
import { Permission, roleHasPermission } from '../auth/permissions';

export const BATCH_TRANSITIONS = {
  CREATED: ['COLLECTED', 'TESTING', 'PASSED', 'FAILED', 'REJECTED'],
  COLLECTED: ['TESTING', 'PASSED', 'FAILED', 'REJECTED'],
  TESTING: ['PASSED', 'FAILED', 'UNDER_INVESTIGATION'],
  PASSED: ['RELEASED', 'FAILED', 'UNDER_INVESTIGATION'],
  FAILED: ['UNDER_INVESTIGATION', 'REJECTED'],
  UNDER_INVESTIGATION: ['RELEASED', 'REJECTED', 'FAILED'],
  // A released batch can only be recalled into investigation.
  RELEASED: ['UNDER_INVESTIGATION'],
  REJECTED: [],
} as const;

const OPEN_VIOLATION_STATUSES = ['PENDING_INVESTIGATION', 'UNDER_REVIEW', 'CONFIRMED'];

export interface BatchScope {
  aggregate: CollectionBatch | null;
  collections: MilkCollection[];
  /** Every identifier laboratory results may have been filed under. */
  testRefs: string[];
}

/** Resolves a lot ID or aggregate batch code/id to the collections it covers. */
export async function resolveBatchScope(prisma: PrismaService, ref: string): Promise<BatchScope> {
  const aggregate = await prisma.collectionBatch.findFirst({ where: { OR: [{ batchCode: ref }, { id: ref }] } });
  if (aggregate) {
    const collections = await prisma.milkCollection.findMany({ where: { collectionBatchId: aggregate.id } });
    const testRefs = [aggregate.batchCode, ...collections.map((c) => c.batchId).filter((b): b is string => !!b)];
    return { aggregate, collections, testRefs };
  }
  const lot = await prisma.milkCollection.findFirst({ where: { OR: [{ batchId: ref }, { collectionCode: ref }] } });
  if (lot) {
    const parent = lot.collectionBatchId ? await prisma.collectionBatch.findUnique({ where: { id: lot.collectionBatchId } }) : null;
    return { aggregate: parent, collections: [lot], testRefs: [lot.batchId ?? ref] };
  }
  return { aggregate: null, collections: [], testRefs: [] };
}

@Injectable()
export class CollectionBatchService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationService,
  ) {}

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

  async create(actor: Actor, dto: any) {
    const productType = String(dto?.productType || 'MILK').toUpperCase();
    const collectionDate = parseDate(dto?.collectionDate, 'collectionDate') ?? new Date();
    const batchCode = generateCode('BATCH', collectionDate);

    const newRecord = await this.prisma.collectionBatch.create({
      data: {
        batchCode,
        productType,
        collectionDate,
        collectionCenter: dto?.collectionCenter || null,
        notes: dto?.notes || null,
        status: 'CREATED',
      },
    });

    await this.audit.record(actor, {
      action: 'BATCH_CREATED',
      entity: 'COLLECTION_BATCH',
      entityId: newRecord.id,
      newValue: { batchCode, productType, collectionCenter: newRecord.collectionCenter },
    });

    return newRecord;
  }

  /** Laboratory evidence for a batch: all results filed under the batch code or any of its lots. */
  private async evidence(batch: CollectionBatch) {
    const scope = await resolveBatchScope(this.prisma, batch.batchCode);
    const tests = scope.testRefs.length
      ? await this.prisma.milkTest.findMany({ where: { batchId: { in: scope.testRefs } } })
      : [];
    const passed = tests.filter((t) => t.result === 'PASS' && t.complianceStatus !== 'NON_COMPLIANT').length;
    const failed = tests.filter((t) => t.result === 'FAIL' || t.complianceStatus === 'NON_COMPLIANT').length;
    const openViolations = await this.prisma.violation.count({
      where: { batchId: { in: scope.testRefs }, status: { in: OPEN_VIOLATION_STATUSES } },
    });
    return { scope, tests: tests.length, passed, failed, openViolations };
  }

  async update(actor: Actor, id: string, dto: any) {
    const oldRecord = await this.prisma.collectionBatch.findUnique({ where: { id } });
    if (!oldRecord) throw new NotFoundException(`CollectionBatch with ID ${id} not found`);
    const nextStatus = dto?.status ? String(dto.status).toUpperCase() : oldRecord.status;
    assertTransition(BATCH_TRANSITIONS, oldRecord.status, nextStatus, 'Batch');

    if (nextStatus !== oldRecord.status) {
      const ev = await this.evidence(oldRecord);
      if (nextStatus === 'PASSED' || nextStatus === 'RELEASED') {
        if (ev.passed === 0) {
          throw new BadRequestException(`Batch ${oldRecord.batchCode} has no passing laboratory result. Record a test before marking it ${nextStatus}.`);
        }
        if (ev.failed > 0) {
          throw new BadRequestException(`Batch ${oldRecord.batchCode} has ${ev.failed} failed laboratory result(s) and cannot be ${nextStatus.toLowerCase()}.`);
        }
      }
      if (nextStatus === 'RELEASED') {
        if (ev.openViolations > 0) {
          throw new ConflictException(`Batch ${oldRecord.batchCode} has ${ev.openViolations} open compliance case(s). Close them before release.`);
        }
        if (oldRecord.status === 'UNDER_INVESTIGATION' && !roleHasPermission(actor.role, Permission.VIOLATION_RESOLVE)) {
          throw new ForbiddenException('Only an administrator can release a batch that was under investigation.');
        }
      }
    }

    const updated = await this.prisma.collectionBatch.update({
      where: { id },
      data: {
        status: nextStatus,
        ...(dto?.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });

    if (nextStatus === 'FAILED' && oldRecord.status !== 'FAILED') {
      const existingCase = await this.prisma.violation.findFirst({
        where: { batchId: oldRecord.batchCode, status: { in: OPEN_VIOLATION_STATUSES } },
      });
      if (!existingCase) {
        await this.prisma.violation.create({
          data: {
            violationCode: generateCode('VIO'),
            type: 'BATCH_FAILED',
            description: `Batch ${oldRecord.batchCode} failed product testing`,
            severity: 'HIGH',
            productType: oldRecord.productType,
            date: new Date(),
            status: 'PENDING_INVESTIGATION',
            batchId: oldRecord.batchCode,
            veterinarianId: actor.id,
            veterinarianName: actor.name,
          },
        });
      }
    }
    if (nextStatus === 'UNDER_INVESTIGATION' && oldRecord.status === 'RELEASED') {
      await this.notifications.notify({
        title: 'PRODUCT RECALL: released batch under investigation',
        message: `Batch ${oldRecord.batchCode} (${oldRecord.productType}) was already released and has been recalled into investigation by ${actor.name}.`,
        type: 'ALERT',
        entityId: id,
        roles: ['ADMIN', 'TESTER'],
      });
    }

    if (nextStatus !== oldRecord.status || dto?.notes !== undefined) {
      await this.audit.record(actor, {
        action: nextStatus !== oldRecord.status ? 'BATCH_STATUS_CHANGED' : 'BATCH_NOTES_UPDATED',
        entity: 'COLLECTION_BATCH',
        entityId: id,
        oldValue: { status: oldRecord.status, notes: oldRecord.notes },
        newValue: { status: nextStatus, notes: updated.notes },
      });
    }

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

    // Collections whose animal was under withdrawal at the time of collection (should be impossible; flagged if legacy data).
    const withdrawalBreaches = batch.collections
      .filter((c) =>
        (c.animal?.withdrawalRecords || []).some(
          (w) =>
            w.productType === c.productType &&
            new Date(w.treatmentDate) <= new Date(c.collectionDate ?? c.createdAt) &&
            new Date(w.withdrawalEndDate) > new Date(c.collectionDate ?? c.createdAt),
        ),
      )
      .map((c) => ({ collectionId: c.id, lotId: c.batchId, animalId: c.animalId, farmId: c.farmId }));

    const ev = await this.evidence(batch);
    const tests = ev.scope.testRefs.length
      ? await this.prisma.milkTest.findMany({ where: { batchId: { in: ev.scope.testRefs } }, orderBy: { testDate: 'desc' } })
      : [];

    return {
      batch: { id: batch.id, batchCode: batch.batchCode, productType: batch.productType, status: batch.status, collectionDate: batch.collectionDate },
      collections: batch.collections,
      farmers: Array.from(farmers.values()),
      animals: Array.from(animals.values()),
      totalCollections: batch.collections.length,
      totalFarmers: farmers.size,
      totalAnimals: animals.size,
      laboratory: { tests, passed: ev.passed, failed: ev.failed, openViolations: ev.openViolations },
      withdrawalBreaches,
    };
  }
}
