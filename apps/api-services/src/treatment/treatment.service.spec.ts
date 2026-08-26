import { TreatmentService } from './treatment.service';

describe('TreatmentService.updateAnimalMrlStatus', () => {
  const prisma = {
    animal: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    withdrawalRecord: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  } as any;

  const ledgerService = {
    appendToLedger: jest.fn(),
  } as any;

  let service: TreatmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TreatmentService(prisma, ledgerService);
  });

  it('marks animal cleared when no withdrawals exist', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 'animal-1', mrlStatus: 'DO_NOT_SELL' });
    prisma.withdrawalRecord.findMany.mockResolvedValue([]);

    await service.updateAnimalMrlStatus('animal-1');

    expect(prisma.animal.update).toHaveBeenCalledWith({
      where: { id: 'animal-1' },
      data: { mrlStatus: 'CLEARED', status: 'HEALTHY' },
    });
  });

  it('marks animal do not sell when latest withdrawal is more than three days away', async () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    prisma.animal.findUnique.mockResolvedValue({ id: 'animal-1', mrlStatus: 'CLEARED' });
    prisma.withdrawalRecord.findMany.mockResolvedValue([
      { id: 'wr-1', withdrawalEndDate: future, status: 'WITHDRAWAL_COMPLETED' },
    ]);

    await service.updateAnimalMrlStatus('animal-1');

    expect(prisma.animal.update).toHaveBeenCalledWith({
      where: { id: 'animal-1' },
      data: { mrlStatus: 'DO_NOT_SELL', status: 'UNDER_TREATMENT' },
    });
  });

  it('marks animal clearing soon when latest withdrawal is within three days', async () => {
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    prisma.animal.findUnique.mockResolvedValue({ id: 'animal-1', mrlStatus: 'DO_NOT_SELL' });
    prisma.withdrawalRecord.findMany.mockResolvedValue([
      { id: 'wr-1', withdrawalEndDate: future, status: 'RESTRICTED' },
    ]);

    await service.updateAnimalMrlStatus('animal-1');

    expect(prisma.animal.update).toHaveBeenCalledWith({
      where: { id: 'animal-1' },
      data: { mrlStatus: 'CLEARING_SOON', status: 'UNDER_TREATMENT' },
    });
  });
});
