import { BadRequestException } from '@nestjs/common';
import { MilkTestService, evaluateResult, parseMrlLimit } from './milk-test.service';

const tester = { id: 't1', email: 't@x.gov', name: 'Lab Officer', role: 'TESTER', ip: null };

describe('evaluateResult', () => {
  it('derives compliance from measured residue vs MRL', () => {
    expect(evaluateResult({ measuredValue: 40, mrlValue: 50 })).toEqual({ result: 'PASS', complianceStatus: 'COMPLIANT' });
    expect(evaluateResult({ measuredValue: 60, mrlValue: 50 })).toEqual({ result: 'FAIL', complianceStatus: 'NON_COMPLIANT' });
  });

  it('rejects a PASS that contradicts the measured residue', () => {
    expect(() => evaluateResult({ result: 'PASS', measuredValue: 60, mrlValue: 50 })).toThrow(/contradicts/);
  });

  it('falls back to the declared result without numbers', () => {
    expect(evaluateResult({ result: 'fail', measuredValue: null, mrlValue: null })).toEqual({ result: 'FAIL', complianceStatus: 'NON_COMPLIANT' });
    expect(() => evaluateResult({ result: 'MAYBE', measuredValue: null, mrlValue: null })).toThrow(BadRequestException);
  });

  it('parses MRL limits like "50 ug/kg"', () => {
    expect(parseMrlLimit('50 ug/kg')).toBe(50);
    expect(parseMrlLimit('0.5mg/kg')).toBe(0.5);
    expect(parseMrlLimit('n/a')).toBeNull();
  });
});

describe('MilkTestService.create', () => {
  function setup(scope: { aggregate?: any; collections?: any[] }) {
    const prisma: any = {
      collectionBatch: { findFirst: jest.fn().mockResolvedValue(scope.aggregate ?? null), findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
      milkCollection: {
        findMany: jest.fn().mockResolvedValue(scope.collections ?? []),
        findFirst: jest.fn().mockResolvedValue(scope.aggregate ? null : (scope.collections ?? [])[0] ?? null),
      },
      mrlRule: { findMany: jest.fn().mockResolvedValue([]) },
      milkTest: { create: jest.fn(async ({ data }: any) => ({ id: 'test-1', ...data })) },
      violation: { create: jest.fn() },
    };
    const audit: any = { record: jest.fn() };
    const ledger: any = { appendToLedger: jest.fn() };
    const compliance: any = { placeInvestigationHold: jest.fn() };
    const notifications: any = { notify: jest.fn() };
    return { prisma, compliance, notifications, service: new MilkTestService(prisma, audit, ledger, compliance, notifications) };
  }

  it('refuses results for an unregistered lot', async () => {
    const { service } = setup({});
    await expect(service.create(tester, { batchId: 'NOPE', result: 'PASS' })).rejects.toThrow(/No collection lot or batch/);
  });

  it('traces a failed batch back to every contributing farm and animal and holds their product', async () => {
    const collections = [
      { id: 'c1', farmId: 'f1', animalId: 'a1', batchId: 'LOT-1', productType: 'MILK' },
      { id: 'c2', farmId: 'f2', animalId: 'a2', batchId: 'LOT-2', productType: 'MILK' },
    ];
    const { service, prisma, compliance } = setup({ aggregate: { id: 'b1', batchCode: 'BATCH-1', status: 'TESTING', productType: 'MILK' }, collections });
    const res = await service.create(tester, { batchId: 'BATCH-1', substance: 'Tetracycline', measuredValue: 180, applicableMRLValue: 100 });

    expect(res.result).toBe('FAIL');
    expect(res.recordedByName).toBe('Lab Officer');
    expect(prisma.collectionBatch.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { status: 'FAILED' } });
    expect(prisma.violation.create).toHaveBeenCalledTimes(2);
    expect(compliance.placeInvestigationHold).toHaveBeenCalledWith('a1', 'MILK', expect.any(String));
    expect(compliance.placeInvestigationHold).toHaveBeenCalledWith('a2', 'MILK', expect.any(String));
  });

  it('recalls an already released batch when a later test fails', async () => {
    const { service, prisma, notifications } = setup({ aggregate: { id: 'b1', batchCode: 'BATCH-1', status: 'RELEASED', productType: 'MILK' }, collections: [] });
    await service.create(tester, { batchId: 'BATCH-1', result: 'FAIL' });
    expect(prisma.collectionBatch.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { status: 'UNDER_INVESTIGATION' } });
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ title: 'PRODUCT RECALL REQUIRED' }));
  });
});
