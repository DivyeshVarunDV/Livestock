import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { ComplianceService } from '../compliance/compliance.service';
import { NotificationService } from '../notification/notification.service';
import { Actor } from '../common/actor';
import { generateCode } from '../common/codes';
import { diffFields, parseDate } from '../common/diff';

const OPEN_BATCH_STATUSES = ['CREATED', 'COLLECTED'];

@Injectable()
export class MilkCollectionService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private compliance: ComplianceService,
    private notifications: NotificationService,
  ) {}

  async findAll() {
    return this.prisma.milkCollection.findMany({
      include: {
        farm: { select: { id: true, farmerId: true, name: true, ownerName: true } },
        animal: { select: { id: true, animalCode: true, name: true, mrlStatus: true } },
        collectionBatch: { select: { id: true, batchCode: true, status: true } },
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
        collectionBatch: true,
        violations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!record) throw new NotFoundException('Record not found');
    return record;
  }

  async create(actor: Actor, dto: any) {
    if (!dto?.animalId) throw new BadRequestException('animalId is required');
    const productType = String(dto.productType || 'MILK').toUpperCase();

    const animal = await this.prisma.animal.findUnique({ where: { id: dto.animalId }, include: { farm: true } });
    if (!animal) throw new BadRequestException('Animal not found');
    if (dto.farmId && dto.farmId !== animal.farmId) {
      throw new BadRequestException('Animal is not registered to the selected farm');
    }
    if (animal.currentStatus && animal.currentStatus !== 'ACTIVE') {
      throw new BadRequestException(`Products cannot be collected from an animal with status ${animal.currentStatus}`);
    }
    if (productType === 'MILK' && animal.gender === 'MALE') {
      throw new BadRequestException('Milk cannot be collected from a male animal');
    }

    // Food-safety gate: live check against withdrawal records and investigation holds.
    const clearance = await this.compliance.checkClearance(animal.id, productType);
    if (!clearance.cleared) {
      await this.audit.record(actor, {
        action: 'RESTRICTED_SUPPLY_BLOCKED',
        entity: 'ANIMAL',
        entityId: animal.id,
        newValue: { productType, status: clearance.status, reason: clearance.reason, restrictionEnd: clearance.restrictionEnd },
      });
      await this.notifications.notify({
        title: 'Restricted product supply blocked',
        message: `${productType} from ${animal.name} (${animal.tagNumber}, farm ${animal.farm?.farmerId ?? animal.farmId}) was refused at collection: ${clearance.reason ?? clearance.status}.`,
        type: 'ALERT',
        entityId: animal.id,
        roles: ['ADMIN'],
      });
      const until = clearance.restrictionEnd ? ` until ${new Date(clearance.restrictionEnd).toISOString().slice(0, 10)}` : '';
      throw new BadRequestException(`Product from this animal is currently ${clearance.status.toLowerCase().replace('_', ' ')}${until}. ${clearance.reason ?? ''}`.trim());
    }

    const quantity = dto.quantity === undefined || dto.quantity === null || dto.quantity === '' ? null : Number(dto.quantity);
    if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) {
      throw new BadRequestException('quantity must be a positive number');
    }

    // Link to an aggregate collection batch when the code refers to one.
    const ref = String(dto.collectionBatchId || dto.collectionBatchCode || dto.batchId || '').trim();
    const aggregate = ref
      ? await this.prisma.collectionBatch.findFirst({ where: { OR: [{ id: ref }, { batchCode: ref }] } })
      : null;
    if (aggregate) {
      if (!OPEN_BATCH_STATUSES.includes(aggregate.status)) {
        throw new BadRequestException(`Batch ${aggregate.batchCode} is ${aggregate.status} and no longer accepts collections.`);
      }
      if (aggregate.productType !== productType) {
        throw new BadRequestException(`Batch ${aggregate.batchCode} is for ${aggregate.productType}, not ${productType}.`);
      }
    }
    const lotId = aggregate ? generateCode(aggregate.batchCode) : String(dto.batchId || '').trim() || generateCode('LOT');
    if (!aggregate) {
      const clash = await this.prisma.milkCollection.findUnique({ where: { batchId: lotId } });
      if (clash) throw new ConflictException(`Lot ID ${lotId} is already used by another collection.`);
    }

    const collectedAt = parseDate(dto.collectionDate, 'collectionDate') ?? new Date();
    const created = await this.prisma.milkCollection.create({
      data: {
        farmId: animal.farmId,
        animalId: animal.id,
        collectionCode: dto.collectionCode || generateCode('COL'),
        sourceReference: dto.sourceReference || null,
        productType,
        quantity,
        collectionDate: collectedAt,
        date: parseDate(dto.date, 'date') ?? collectedAt,
        collectionCenter: dto.collectionCenter || aggregate?.collectionCenter || null,
        batchId: lotId,
        collectionBatchId: aggregate?.id ?? null,
      },
    });
    if (aggregate && aggregate.status === 'CREATED') {
      await this.prisma.collectionBatch.update({ where: { id: aggregate.id }, data: { status: 'COLLECTED' } });
    }

    await this.audit.record(actor, {
      action: 'PRODUCT_COLLECTED',
      entity: 'MILK_COLLECTION',
      entityId: created.id,
      newValue: { animalId: animal.id, farmId: animal.farmId, productType, quantity, lotId, batchCode: aggregate?.batchCode ?? null },
    });
    return created;
  }

  /** Only descriptive fields can change; provenance (animal, farm, lot, product) is fixed once recorded. */
  async update(actor: Actor, id: string, dto: any) {
    const existing = await this.prisma.milkCollection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Record not found');
    for (const locked of ['animalId', 'farmId', 'batchId', 'productType', 'collectionBatchId'] as const) {
      if (dto?.[locked] !== undefined && dto[locked] !== existing[locked]) {
        throw new BadRequestException(`${locked} cannot be changed after collection. Record a correction instead.`);
      }
    }
    const data: any = {};
    if (dto.quantity !== undefined) {
      const q = dto.quantity === null || dto.quantity === '' ? null : Number(dto.quantity);
      if (q !== null && (!Number.isFinite(q) || q <= 0)) throw new BadRequestException('quantity must be a positive number');
      data.quantity = q;
    }
    if (dto.collectionCenter !== undefined) data.collectionCenter = dto.collectionCenter || null;
    if (dto.sourceReference !== undefined) data.sourceReference = dto.sourceReference || null;
    if (dto.collectionDate !== undefined) data.collectionDate = parseDate(dto.collectionDate, 'collectionDate');

    const updated = await this.prisma.milkCollection.update({ where: { id }, data });
    const diff = diffFields(existing, updated, Object.keys(data));
    if (diff.changed) {
      await this.audit.record(actor, { action: 'COLLECTION_UPDATED', entity: 'MILK_COLLECTION', entityId: id, oldValue: diff.before, newValue: diff.after });
    }
    return updated;
  }

  async remove(actor: Actor, id: string) {
    const existing = await this.prisma.milkCollection.findUnique({
      where: { id },
      include: { _count: { select: { violations: true } } },
    });
    if (!existing) throw new NotFoundException('Record not found');
    if (existing._count.violations > 0) {
      throw new ConflictException('This collection is referenced by a compliance case and cannot be deleted.');
    }
    const tests = await this.prisma.milkTest.count({ where: { batchId: existing.batchId ?? '__none__' } });
    if (tests > 0) throw new ConflictException('This collection has laboratory results and cannot be deleted.');
    await this.prisma.milkCollection.delete({ where: { id } });
    const { _count, ...snapshot } = existing;
    await this.audit.record(actor, { action: 'COLLECTION_DELETED', entity: 'MILK_COLLECTION', entityId: id, oldValue: snapshot });
    return { success: true };
  }
}
