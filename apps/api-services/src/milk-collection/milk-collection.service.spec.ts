import { BadRequestException } from '@nestjs/common';
import { MilkCollectionService } from './milk-collection.service';

const officer = { id: 'o1', email: 'o@x.gov', name: 'Officer', role: 'ADMIN', ip: null };

function setup(animal: any, clearance: any = { cleared: true, status: 'CLEARED', reason: null, restrictionEnd: null }) {
  const prisma: any = {
    animal: { findUnique: jest.fn().mockResolvedValue(animal) },
    collectionBatch: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
    milkCollection: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn(async ({ data }: any) => ({ id: 'c1', ...data })) },
  };
  const audit: any = { record: jest.fn() };
  const compliance: any = { checkClearance: jest.fn().mockResolvedValue(clearance) };
  const notifications: any = { notify: jest.fn() };
  return { prisma, audit, notifications, service: new MilkCollectionService(prisma, audit, compliance, notifications) };
}

const cow = { id: 'a1', name: 'Gauri', tagNumber: 'T1', farmId: 'f1', gender: 'FEMALE', currentStatus: 'ACTIVE', farm: { farmerId: 'FARM001' } };

describe('MilkCollectionService.create', () => {
  it('blocks restricted product, audits the attempt and alerts administrators', async () => {
    const { service, audit, notifications } = setup(cow, { cleared: false, status: 'RESTRICTED', reason: 'Active withdrawal: Penicillin', restrictionEnd: new Date() });
    await expect(service.create(officer, { animalId: 'a1' })).rejects.toThrow(BadRequestException);
    expect(audit.record).toHaveBeenCalledWith(officer, expect.objectContaining({ action: 'RESTRICTED_SUPPLY_BLOCKED' }));
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ roles: ['ADMIN'] }));
  });

  it('derives the farm from the animal and generates a lot id', async () => {
    const { service, prisma } = setup(cow);
    await service.create(officer, { animalId: 'a1' });
    const data = prisma.milkCollection.create.mock.calls[0][0].data;
    expect(data.farmId).toBe('f1');
    expect(data.batchId).toMatch(/^LOT-/);
  });

  it('rejects a mismatched farm and milk from male animals', async () => {
    await expect(setup(cow).service.create(officer, { animalId: 'a1', farmId: 'other' })).rejects.toThrow(/not registered/);
    await expect(setup({ ...cow, gender: 'MALE' }).service.create(officer, { animalId: 'a1' })).rejects.toThrow(/male/);
  });

  it('links collections to an open aggregate batch', async () => {
    const { service, prisma } = setup(cow);
    prisma.collectionBatch.findFirst.mockResolvedValue({ id: 'b1', batchCode: 'BATCH-X', status: 'CREATED', productType: 'MILK', collectionCenter: 'Centre' });
    await service.create(officer, { animalId: 'a1', batchId: 'BATCH-X' });
    expect(prisma.milkCollection.create.mock.calls[0][0].data.collectionBatchId).toBe('b1');
    expect(prisma.collectionBatch.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { status: 'COLLECTED' } });
  });
});

describe('MilkCollectionService.createMany', () => {
  function bulkSetup(animals: Record<string, any>, blocked: string[] = []) {
    const tx: any = {
      collectionBatch: {
        create: jest.fn(async ({ data }: any) => ({ id: 'nb', ...data })),
        update: jest.fn(),
      },
      milkCollection: { create: jest.fn(async ({ data }: any) => ({ id: `c-${data.animalId}`, ...data })) },
    };
    const prisma: any = {
      animal: {
        findUnique: jest.fn(async ({ where }: any) => animals[where.id] ?? null),
        findMany: jest.fn(async () => Object.values(animals)),
      },
      collectionBatch: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([{ batchCode: 'BATCH-0007' }, { batchCode: 'BATCH-OLD' }]) },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    };
    const audit: any = { record: jest.fn() };
    const compliance: any = {
      checkClearance: jest.fn(async (id: string) =>
        blocked.includes(id)
          ? { cleared: false, status: 'RESTRICTED', reason: 'Active withdrawal', restrictionEnd: null }
          : { cleared: true, status: 'CLEARED', reason: null, restrictionEnd: null }),
    };
    const notifications: any = { notify: jest.fn() };
    return { tx, prisma, audit, service: new MilkCollectionService(prisma, audit, compliance, notifications) };
  }

  const herd = { a1: cow, a2: { ...cow, id: 'a2', name: 'Lakshmi', tagNumber: 'T2', farmId: 'f2' } };

  it('adds every selected animal to one existing open batch', async () => {
    const { service, prisma, tx } = bulkSetup(herd);
    prisma.collectionBatch.findFirst.mockResolvedValue({ id: 'b1', batchCode: 'BATCH-X', status: 'CREATED', productType: 'MILK', collectionCenter: 'Centre' });
    const res = await service.createMany(officer, { batchId: 'BATCH-X', animals: [{ animalId: 'a1', quantity: 4 }, { animalId: 'a2' }] });
    expect(res).toMatchObject({ batchCode: 'BATCH-X', count: 2 });
    const rows = tx.milkCollection.create.mock.calls.map((c: any) => c[0].data);
    expect(rows.map((r: any) => [r.animalId, r.farmId, r.collectionBatchId, r.quantity])).toEqual([['a1', 'f1', 'b1', 4], ['a2', 'f2', 'b1', null]]);
    expect(new Set(rows.map((r: any) => r.batchId)).size).toBe(2);
    expect(tx.collectionBatch.create).not.toHaveBeenCalled();
    expect(tx.collectionBatch.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { status: 'COLLECTED' } });
  });

  it('opens a new batch when none is given', async () => {
    const { service, tx } = bulkSetup(herd);
    const res = await service.createMany(officer, { animals: [{ animalId: 'a1' }, { animalId: 'a2' }] });
    expect(tx.collectionBatch.create).toHaveBeenCalledTimes(1);
    expect(res.batchCode).toBe('BATCH-0008');
    expect(res.count).toBe(2);
  });

  it('saves nothing when any selected animal is restricted', async () => {
    const { service, tx } = bulkSetup(herd, ['a2']);
    await expect(service.createMany(officer, { animals: [{ animalId: 'a1' }, { animalId: 'a2' }] })).rejects.toThrow(/Lakshmi \(T2\)/);
    expect(tx.milkCollection.create).not.toHaveBeenCalled();
  });

  it('rejects an empty selection and duplicates', async () => {
    const { service } = bulkSetup(herd);
    await expect(service.createMany(officer, { animals: [] })).rejects.toThrow(/at least one/);
    await expect(service.createMany(officer, { animals: [{ animalId: 'a1' }, { animalId: 'a1' }] })).rejects.toThrow(/more than once/);
  });
});

describe('MilkCollectionService product eligibility', () => {
  it('only accepts species that produce the product', async () => {
    await expect(setup({ ...cow, species: 'POULTRY' }).service.create(officer, { animalId: 'a1', productType: 'MILK' })).rejects.toThrow(/Milk cannot be collected from poultry/);
    await expect(setup({ ...cow, species: 'CATTLE' }).service.create(officer, { animalId: 'a1', productType: 'EGGS' })).rejects.toThrow(/Eggs cannot be collected from cattle/);
    await expect(setup({ ...cow, species: 'PIG', gender: 'MALE' }).service.create(officer, { animalId: 'a1', productType: 'MEAT' })).resolves.toBeDefined();
  });

  it('opens a batch under an officer-entered code', async () => {
    const tx: any = {
      collectionBatch: { create: jest.fn(async ({ data }: any) => ({ id: 'nb', ...data })), update: jest.fn() },
      milkCollection: { create: jest.fn(async ({ data }: any) => ({ id: 'c', ...data })) },
    };
    const prisma: any = {
      animal: { findUnique: jest.fn().mockResolvedValue(cow), findMany: jest.fn().mockResolvedValue([cow]) },
      collectionBatch: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    };
    const compliance: any = { checkClearance: jest.fn().mockResolvedValue({ cleared: true, status: 'CLEARED' }) };
    const service = new MilkCollectionService(prisma, { record: jest.fn() } as any, compliance, { notify: jest.fn() } as any);
    const res = await service.createMany(officer, { batchId: 'vbmc-0042', animals: [{ animalId: 'a1' }] });
    expect(res.batchCode).toBe('VBMC-0042');
    await expect(service.createMany(officer, { batchId: 'bad code!', animals: [{ animalId: 'a1' }] })).rejects.toThrow(/Batch ID may only/);
  });
});
