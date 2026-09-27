import { BadRequestException, ConflictException } from '@nestjs/common';
import { UserService } from './user.service';

const admin = { id: 'admin-1', email: 'a@x.gov', name: 'Admin', role: 'ADMIN', ip: null };

function setup() {
  const prisma: any = {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(async ({ data }: any) => ({ id: 'new', ...data })),
      update: jest.fn(async ({ data }: any) => ({ id: 'u', ...data })),
      count: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: { count: jest.fn().mockResolvedValue(0) },
  };
  const audit: any = { record: jest.fn() };
  return { prisma, audit, service: new UserService(prisma, audit) };
}

describe('UserService.findAll', () => {
  it('filters by role and status', async () => {
    const { prisma, service } = setup();
    await service.findAll({ role: 'ADMIN', status: 'ACTIVE' });
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ role: 'ADMIN', status: 'ACTIVE' }) }));
  });

  it('ignores ALL role and status values', async () => {
    const { prisma, service } = setup();
    await service.findAll({ role: 'ALL', status: 'ALL' });
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('never selects the password hash', async () => {
    const { prisma, service } = setup();
    await service.findAll();
    expect(prisma.user.findMany.mock.calls[0][0].select.passwordHash).toBeUndefined();
  });
});

describe('UserService safeguards', () => {
  it('rejects weak initial passwords', async () => {
    const { service } = setup();
    await expect(service.create(admin, { email: 'x@x.gov', name: 'X', role: 'VETERINARIAN', password: 'password' })).rejects.toThrow(/Password must contain/);
  });

  it('forces a password change for administrator-created accounts', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue(null);
    await service.create(admin, { email: 'x@x.gov', name: 'X', role: 'VETERINARIAN', password: 'AgriShield#2026' });
    expect(prisma.user.create.mock.calls[0][0].data).toEqual(expect.objectContaining({ mustChangePassword: true }));
    expect(prisma.user.create.mock.calls[0][0].data.passwordHash).not.toBe('AgriShield#2026');
  });

  it('prevents administrators from changing their own role', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN', status: 'ACTIVE' });
    await expect(service.update(admin, 'admin-1', { role: 'FARMER' })).rejects.toThrow(BadRequestException);
  });

  it('keeps at least one active administrator', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-2', role: 'ADMIN', status: 'ACTIVE' });
    prisma.user.count.mockResolvedValue(0);
    await expect(service.update(admin, 'admin-2', { status: 'SUSPENDED' })).rejects.toThrow(/active administrator/);
  });

  it('revokes sessions when a role or status changes', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue({ id: 'u', role: 'TESTER', status: 'ACTIVE' });
    await service.update(admin, 'u', { status: 'SUSPENDED' });
    expect(prisma.user.update.mock.calls[0][0].data.tokenVersion).toEqual({ increment: 1 });
  });

  it('refuses to delete accounts with recorded activity', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u', role: 'VETERINARIAN', status: 'ACTIVE', lastLoginAt: new Date(),
      _count: { farms: 0, ownershipTransfersAsCurrent: 0, ownershipTransfersAsNew: 0, approvedTransfers: 0 },
    });
    await expect(service.remove(admin, 'u')).rejects.toThrow(ConflictException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });
});
