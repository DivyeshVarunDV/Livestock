import { ConflictException } from '@nestjs/common';
import { MedicineService, STARTER_MEDICINES } from './medicine.service';

const admin = { id: 'u1', email: 'a@x.gov', name: 'Admin', role: 'ADMIN', ip: null };

function setup(medicines: any[] = [], stock: any[] = [], rules: any[] = []) {
  const prisma: any = {
    medicine: {
      count: jest.fn().mockResolvedValue(medicines.length),
      findMany: jest.fn().mockResolvedValue(medicines),
      findUnique: jest.fn(async ({ where }: any) => medicines.find((m) => m.id === where.id) ?? null),
      create: jest.fn(async ({ data }: any) => ({ id: 'new', ...data })),
      createMany: jest.fn(),
      update: jest.fn(async ({ where, data }: any) => ({ ...medicines.find((m) => m.id === where.id), ...data })),
    },
    inventory: { findMany: jest.fn().mockResolvedValue(stock), updateMany: jest.fn() },
    mrlRule: { findMany: jest.fn().mockResolvedValue(rules) },
  };
  const audit: any = { record: jest.fn() };
  return { prisma, audit, service: new MedicineService(prisma, audit) };
}

describe('MedicineService', () => {
  it('seeds an empty catalogue with starter medicines, MRL drugs and stocked medicines', async () => {
    const { service, prisma } = setup([], [{ medicineName: 'Local Mastitis Tube', withdrawalPeriod: 5 }], [{ drugName: 'Penicillin G', withdrawalPeriod: 5, substance: null }]);
    await service.onModuleInit();
    const names = prisma.medicine.createMany.mock.calls[0][0].data.map((m: any) => m.name);
    expect(names).toEqual(expect.arrayContaining([STARTER_MEDICINES[0].name, 'Penicillin G', 'Local Mastitis Tube']));
  });

  it('does not reseed a catalogue that already has medicines', async () => {
    const { service, prisma } = setup([{ id: 'm1', name: 'X', withdrawalPeriod: 1 }]);
    await service.onModuleInit();
    expect(prisma.medicine.createMany).not.toHaveBeenCalled();
  });

  it('rejects duplicate names regardless of case', async () => {
    const { service } = setup([{ id: 'm1', name: 'Meloxicam 20mg/ml', withdrawalPeriod: 15 }]);
    await expect(service.create(admin, { name: 'meloxicam 20MG/ML' })).rejects.toThrow(ConflictException);
  });

  it('pushes a changed withdrawal period to stock of that medicine and audits it', async () => {
    const { service, prisma, audit } = setup(
      [{ id: 'm1', name: 'Meloxicam 20mg/ml', withdrawalPeriod: 15 }],
      [{ id: 's1', medicineName: 'meloxicam 20mg/ml' }, { id: 's2', medicineName: 'Other' }],
    );
    await service.update(admin, 'm1', { withdrawalPeriod: 20 });
    expect(prisma.inventory.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['s1'] } }, data: { withdrawalPeriod: 20 } });
    expect(audit.record).toHaveBeenCalledWith(admin, expect.objectContaining({ action: 'MEDICINE_WITHDRAWAL_CHANGED' }));
  });

  it('rejects a negative withdrawal period', async () => {
    const { service } = setup([{ id: 'm1', name: 'A', withdrawalPeriod: 1 }]);
    await expect(service.update(admin, 'm1', { withdrawalPeriod: -3 })).rejects.toThrow(/whole number/);
  });
});
