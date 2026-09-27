import { ComplianceService, deriveMrlStatus, deriveProductClearance } from './compliance.service';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-09-27T12:00:00Z');
const at = (days: number) => new Date(now.getTime() + days * DAY);

describe('deriveMrlStatus', () => {
  it('is CLEARED with no active withdrawals', () => {
    expect(deriveMrlStatus([{ withdrawalEndDate: at(-1) }], now)).toEqual({ mrlStatus: 'CLEARED', latestEnd: null });
  });

  it('is CLEARING_SOON within three days of the latest end', () => {
    expect(deriveMrlStatus([{ withdrawalEndDate: at(2) }], now).mrlStatus).toBe('CLEARING_SOON');
  });

  it('is DO_NOT_SELL when the latest end is more than three days away', () => {
    expect(deriveMrlStatus([{ withdrawalEndDate: at(2) }, { withdrawalEndDate: at(10) }], now)).toEqual({
      mrlStatus: 'DO_NOT_SELL',
      latestEnd: at(10),
    });
  });
});

describe('deriveProductClearance', () => {
  const long = { id: 'w-long', productType: 'MILK', medicine: 'Oxytetracycline', treatmentDate: at(-2), withdrawalEndDate: at(12) };
  const short = { id: 'w-short', productType: 'MILK', medicine: 'Meloxicam', treatmentDate: at(0), withdrawalEndDate: at(1) };

  it('regression: a later, shorter treatment does not shorten an existing restriction', () => {
    const c = deriveProductClearance([long, short], 'MILK', now);
    expect(c.status).toBe('RESTRICTED');
    expect(c.restrictionEnd).toEqual(at(12));
    expect(c.relatedWithdrawalId).toBe('w-long');
    expect(c.reason).toContain('Oxytetracycline');
    expect(c.reason).toContain('Meloxicam');
  });

  it('clears automatically once every withdrawal has ended', () => {
    expect(deriveProductClearance([long, short], 'MILK', at(13)).status).toBe('CLEARED');
  });

  it('is scoped per product type', () => {
    expect(deriveProductClearance([long], 'MEAT', now).status).toBe('CLEARED');
  });
});

describe('ComplianceService', () => {
  function setup(animal: any, withdrawals: any[], clearances: any[] = []) {
    const prisma: any = {
      animal: { findUnique: jest.fn().mockResolvedValue(animal), update: jest.fn() },
      withdrawalRecord: { findMany: jest.fn().mockResolvedValue(withdrawals), update: jest.fn(), findFirst: jest.fn() },
      productClearance: { findMany: jest.fn().mockResolvedValue(clearances), update: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
    };
    const audit: any = { record: jest.fn() };
    return { prisma, audit, service: new ComplianceService(prisma, audit) };
  }

  it('restricts the animal and records the MRL status change', async () => {
    const { prisma, audit, service } = setup(
      { id: 'a1', mrlStatus: 'CLEARED', status: 'HEALTHY' },
      [{ id: 'w1', productType: 'MILK', medicine: 'X', treatmentDate: new Date(), withdrawalEndDate: new Date(Date.now() + 10 * DAY), status: 'RESTRICTED' }],
    );
    await service.recomputeAnimal('a1');
    expect(prisma.animal.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { mrlStatus: 'DO_NOT_SELL', status: 'UNDER_TREATMENT' } });
    expect(prisma.productClearance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ animalId: 'a1', productType: 'MILK', status: 'RESTRICTED' }),
    });
    expect(audit.record).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'MRL_STATUS_CHANGED', newValue: 'DO_NOT_SELL' }));
  });

  it('marks expired withdrawals completed and clears the animal', async () => {
    const { prisma, service } = setup(
      { id: 'a1', mrlStatus: 'DO_NOT_SELL', status: 'UNDER_TREATMENT' },
      [{ id: 'w1', productType: 'MILK', medicine: 'X', treatmentDate: new Date(Date.now() - 20 * DAY), withdrawalEndDate: new Date(Date.now() - DAY), status: 'RESTRICTED' }],
      [{ id: 'c1', productType: 'MILK', status: 'RESTRICTED', reason: 'x', relatedWithdrawalId: 'w1', restrictionEnd: new Date(Date.now() - DAY) }],
    );
    await service.recomputeAnimal('a1');
    expect(prisma.withdrawalRecord.update).toHaveBeenCalledWith({ where: { id: 'w1' }, data: { status: 'WITHDRAWAL_COMPLETED' } });
    expect(prisma.productClearance.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: expect.objectContaining({ status: 'CLEARED' }) });
    expect(prisma.animal.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { mrlStatus: 'CLEARED', status: 'HEALTHY' } });
  });

  it('never lifts an investigation hold on its own', async () => {
    const { prisma, service } = setup(
      { id: 'a1', mrlStatus: 'CLEARED', status: 'HEALTHY' },
      [],
      [{ id: 'c1', productType: 'MILK', status: 'UNDER_INVESTIGATION', reason: 'Failed test', relatedWithdrawalId: null, restrictionEnd: null }],
    );
    await service.recomputeAnimal('a1');
    expect(prisma.productClearance.update).not.toHaveBeenCalled();
  });

  it('does not overwrite a QUARANTINED animal status', async () => {
    const { prisma, service } = setup(
      { id: 'a1', mrlStatus: 'CLEARED', status: 'QUARANTINED' },
      [{ id: 'w1', productType: 'MILK', medicine: 'X', treatmentDate: new Date(), withdrawalEndDate: new Date(Date.now() + 10 * DAY), status: 'RESTRICTED' }],
    );
    await service.recomputeAnimal('a1');
    expect(prisma.animal.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { mrlStatus: 'DO_NOT_SELL' } });
  });

  it('refuses clearance for an animal under active withdrawal', async () => {
    const { prisma, service } = setup({ id: 'a1', currentStatus: 'ACTIVE' }, []);
    prisma.withdrawalRecord.findFirst.mockResolvedValue({ medicine: 'Penicillin', withdrawalEndDate: at(3) });
    const result = await service.checkClearance('a1', 'milk');
    expect(result).toEqual(expect.objectContaining({ cleared: false, status: 'RESTRICTED' }));
    expect(prisma.withdrawalRecord.findFirst.mock.calls[0][0].where.productType).toBe('MILK');
  });
});
