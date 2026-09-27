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
