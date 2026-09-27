import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { ComplianceService } from '../compliance/compliance.service';
import { NotificationService } from '../notification/notification.service';
import { Actor } from '../common/actor';
import { generateCode } from '../common/codes';
import { diffFields, parseDate } from '../common/diff';
import { productIneligibility } from '../common/products';
import { nextBatchCode, normalizeBatchCode } from '../collection-batch/collection-batch.service';

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

  /** Validates that product may be collected from this animal; blocked supply is audited and escalated. */
  private async checkAnimal(actor: Actor, animalId: string, productType: string, farmId?: string) {
    const animal = await this.prisma.animal.findUnique({ where: { id: animalId }, include: { farm: true } });
    if (!animal) throw new BadRequestException('Animal not found');
    if (farmId && farmId !== animal.farmId) {
      throw new BadRequestException('Animal is not registered to the selected farm');
    }
    if (animal.currentStatus && animal.currentStatus !== 'ACTIVE') {
      throw new BadRequestException(`Products cannot be collected from an animal with status ${animal.currentStatus}`);
    }
    const ineligible = productIneligibility(productType, animal.species, animal.gender);
    if (ineligible) throw new BadRequestException(ineligible);

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
    return animal;
  }

  private parseQuantity(value: unknown): number | null {
    const quantity = value === undefined || value === null || value === '' ? null : Number(value);
    if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) {
      throw new BadRequestException('quantity must be a positive number');
    }
    return quantity;
  }

  private async findOpenBatch(ref: string, productType: string) {
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
    return aggregate;
  }

  async create(actor: Actor, dto: any) {
    if (!dto?.animalId) throw new BadRequestException('animalId is required');
    const productType = String(dto.productType || 'MILK').toUpperCase();
    const animal = await this.checkAnimal(actor, dto.animalId, productType, dto.farmId);
    const quantity = this.parseQuantity(dto.quantity);

    // Link to an aggregate collection batch when the code refers to one.
    const ref = String(dto.collectionBatchId || dto.collectionBatchCode || dto.batchId || '').trim();
    const aggregate = await this.findOpenBatch(ref, productType);
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

  /**
   * Records collections from several animals into one aggregate batch, all or nothing.
   * Every animal is checked before anything is written; with no batch given, a new batch is opened.
   */
  async createMany(actor: Actor, dto: any) {
    const items: { animalId: string; quantity?: unknown }[] = Array.isArray(dto?.animals) ? dto.animals : [];
    if (items.length === 0) throw new BadRequestException('Select at least one animal');
    const animalIds = items.map((i) => String(i?.animalId || ''));
    if (animalIds.some((id) => !id)) throw new BadRequestException('Every entry needs an animalId');
    if (new Set(animalIds).size !== animalIds.length) throw new BadRequestException('An animal was selected more than once');
    const productType = String(dto.productType || 'MILK').toUpperCase();

    // An existing open batch code adds to that batch; a new code opens a batch under that code.
    const ref = String(dto.collectionBatchId || dto.batchId || '').trim();
    const existingBatch = await this.findOpenBatch(ref.toUpperCase(), productType);
    const newBatchCode = existingBatch ? null : ref ? normalizeBatchCode(ref) : (await nextBatchCode(this.prisma)).batchCode;

    const checked: { animal: Awaited<ReturnType<MilkCollectionService['checkAnimal']>>; quantity: number | null }[] = [];
    const problems: string[] = [];
    const known = await this.prisma.animal.findMany({ where: { id: { in: animalIds } }, select: { id: true, name: true, tagNumber: true } });
    const label = (id: string) => {
      const a = known.find((k) => k.id === id);
      return a ? `${a.name} (${a.tagNumber})` : id;
    };
    for (const item of items) {
      try {
        const animal = await this.checkAnimal(actor, item.animalId, productType, dto.farmId);
        checked.push({ animal, quantity: this.parseQuantity(item.quantity) });
      } catch (e: any) {
        problems.push(`${label(item.animalId)}: ${e?.message ?? e}`);
      }
    }
    if (problems.length) {
      throw new BadRequestException(`No collections were saved. ${problems.length} animal(s) cannot be collected: ${problems.join('; ')}`);
    }

    const collectedAt = parseDate(dto.collectionDate, 'collectionDate') ?? new Date();
    const { batch, created } = await this.prisma.$transaction(async (tx) => {
      const batch =
        existingBatch ??
        (await tx.collectionBatch.create({
          data: {
            batchCode: newBatchCode!,
            productType,
            collectionDate: collectedAt,
            collectionCenter: dto.collectionCenter || null,
            status: 'CREATED',
          },
        }));
      const created = [];
      for (const { animal, quantity } of checked) {
        created.push(
          await tx.milkCollection.create({
            data: {
              farmId: animal.farmId,
              animalId: animal.id,
              collectionCode: generateCode('COL'),
              productType,
              quantity,
              collectionDate: collectedAt,
              date: collectedAt,
              collectionCenter: dto.collectionCenter || batch.collectionCenter || null,
              batchId: generateCode(batch.batchCode),
              collectionBatchId: batch.id,
            },
          }),
        );
      }
      if (batch.status === 'CREATED') {
        await tx.collectionBatch.update({ where: { id: batch.id }, data: { status: 'COLLECTED' } });
      }
      return { batch, created };
    });

    if (!existingBatch) {
      await this.audit.record(actor, {
        action: 'BATCH_CREATED',
        entity: 'COLLECTION_BATCH',
        entityId: batch.id,
        newValue: { batchCode: batch.batchCode, productType, collectionCenter: batch.collectionCenter },
      });
    }
    for (const c of created) {
      await this.audit.record(actor, {
        action: 'PRODUCT_COLLECTED',
        entity: 'MILK_COLLECTION',
        entityId: c.id,
        newValue: { animalId: c.animalId, farmId: c.farmId, productType, quantity: c.quantity, lotId: c.batchId, batchCode: batch.batchCode },
      });
    }
    return { batchId: batch.id, batchCode: batch.batchCode, count: created.length, collections: created };
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
