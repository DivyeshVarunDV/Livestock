import { BadRequestException, ConflictException } from '@nestjs/common';
import { TreatmentService, defaultProductTypes, ruleMatchesDrug } from './treatment.service';

const vet = { id: 'vet-1', email: 'vet@x.gov', name: 'Dr. Real Vet', role: 'VETERINARIAN', ip: null };
const DAY = 24 * 60 * 60 * 1000;

function setup(overrides: { animal?: any; rules?: any[]; prescription?: any; inventory?: any; decrementCount?: number } = {}) {
  const tx: any = {
    inventory: {
      updateMany: jest.fn().mockResolvedValue({ count: overrides.decrementCount ?? 1 }),
      findUnique: jest.fn().mockResolvedValue({ stock: 3 }),
    },
    treatment: { create: jest.fn(async ({ data }: any) => ({ id: 't-1', ...data })) },
    withdrawalRecord: { create: jest.fn() },
    amuRecord: { create: jest.fn() },
  };
  const prisma: any = {
    animal: {
      findUnique: jest.fn().mockResolvedValue(
        'animal' in overrides ? overrides.animal : { id: 'a-1', species: 'CATTLE', gender: 'FEMALE', currentStatus: 'ACTIVE' },
      ),
    },
    mrlRule: { findMany: jest.fn().mockResolvedValue(overrides.rules ?? []) },
    prescription: { findUnique: jest.fn().mockResolvedValue(overrides.prescription ?? null) },
    inventory: { findUnique: jest.fn().mockResolvedValue(overrides.inventory ?? null) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const ledger: any = { appendToLedger: jest.fn() };
  const audit: any = { record: jest.fn() };
  const compliance: any = { recomputeAnimal: jest.fn(), sweep: jest.fn() };
  const notifications: any = { notify: jest.fn() };
  return { tx, prisma, audit, compliance, notifications, service: new TreatmentService(prisma, ledger, audit, compliance, notifications) };
}

describe('treatment helpers', () => {
  it('restricts both milk and meat by default for female mammals', () => {
    expect(defaultProductTypes('CATTLE', 'FEMALE')).toEqual(['MILK', 'MEAT']);
    expect(defaultProductTypes('CATTLE', 'MALE')).toEqual(['MEAT']);
    expect(defaultProductTypes('POULTRY', 'FEMALE')).toEqual(['MEAT', 'EGGS']);
  });

  it('matches MRL rules by drug name prefix or active ingredient, case-insensitively', () => {
    expect(ruleMatchesDrug('Oxytetracycline', 'oxytetracycline 200mg/ml')).toBe(true);
    expect(ruleMatchesDrug('Oxytetracycline', 'Terramycin LA', 'Oxytetracycline')).toBe(true);
    expect(ruleMatchesDrug('Penicillin', 'Penicillinase')).toBe(false);
  });
});

describe('TreatmentService.create', () => {
  it('raises the withdrawal period to the MRL rule minimum and attributes the signed-in vet', async () => {
    const { service, tx } = setup({ rules: [{ drugName: 'Tetracycline', species: 'CATTLE', withdrawalPeriod: 14 }] });
    const result = await service.create(vet, {
      animalId: 'a-1', drugName: 'Tetracycline', dosage: '10ml', withdrawalPeriod: 2, veterinarianName: 'Spoofed Name',
    } as any);

    expect(result.withdrawalPeriod).toBe(14);
    expect(result.complianceNotes[0]).toMatch(/raised from 2 to 14/);
    expect(tx.treatment.create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ veterinarianId: 'vet-1', veterinarianName: 'Dr. Real Vet' }),
    );
    // One withdrawal record per restricted product (milk AND meat).
    expect(tx.withdrawalRecord.create).toHaveBeenCalledTimes(2);
  });

  it('records antimicrobial use when flagged', async () => {
    const { service, tx } = setup();
    await service.create(vet, { animalId: 'a-1', drugName: 'Amoxicillin', dosage: '5ml', isAntimicrobial: true } as any);
    expect(tx.amuRecord.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a prescription issued for another animal', async () => {
    const { service } = setup({ prescription: { id: 'rx', animalId: 'other', status: 'ACTIVE', endDate: null } });
    await expect(service.create(vet, { animalId: 'a-1', drugName: 'X', dosage: '1', prescriptionId: 'rx' } as any)).rejects.toThrow(/different animal/);
  });

  it('rejects expired stock', async () => {
    const { service } = setup({ inventory: { id: 'inv', medicineName: 'X', batchNumber: 'B1', expiryDate: new Date(Date.now() - DAY), withdrawalPeriod: 0, minimumStock: 1 } });
    await expect(service.create(vet, { animalId: 'a-1', drugName: 'X', dosage: '1', inventoryId: 'inv' } as any)).rejects.toThrow(/expired/);
  });

  it('fails atomically when stock runs out concurrently', async () => {
    const { service, compliance } = setup({
      inventory: { id: 'inv', medicineName: 'X', batchNumber: 'B1', expiryDate: new Date(Date.now() + 100 * DAY), withdrawalPeriod: 0, minimumStock: 1 },
      decrementCount: 0,
    });
    await expect(service.create(vet, { animalId: 'a-1', drugName: 'X', dosage: '1', inventoryId: 'inv' } as any)).rejects.toThrow(ConflictException);
    expect(compliance.recomputeAnimal).not.toHaveBeenCalled();
  });

  it('rejects treatments for deceased animals and future dates', async () => {
    const dead = setup({ animal: { id: 'a-1', species: 'CATTLE', gender: 'FEMALE', currentStatus: 'DEAD' } });
    await expect(dead.service.create(vet, { animalId: 'a-1', drugName: 'X', dosage: '1' } as any)).rejects.toThrow(BadRequestException);

    const ok = setup();
    const future = new Date(Date.now() + 2 * DAY).toISOString();
    await expect(ok.service.create(vet, { animalId: 'a-1', drugName: 'X', dosage: '1', administrationDate: future } as any)).rejects.toThrow(/future/);
  });

  it('re-derives compliance state after saving', async () => {
    const { service, compliance } = setup();
    await service.create(vet, { animalId: 'a-1', drugName: 'X', dosage: '1', withdrawalPeriod: 5 } as any);
    expect(compliance.recomputeAnimal).toHaveBeenCalledWith('a-1', vet);
  });
});
