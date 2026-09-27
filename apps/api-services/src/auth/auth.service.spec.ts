import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

describe('AuthService.login', () => {
  let hash: string;
  beforeAll(async () => {
    hash = await bcrypt.hash('Correct#Pass1', 4);
  });

  function setup(user: any) {
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn(async ({ data }: any) => ({ ...user, ...data })),
      },
    };
    const jwt: any = { sign: jest.fn().mockReturnValue('signed.jwt') };
    const audit: any = { record: jest.fn() };
    return { prisma, jwt, audit, service: new AuthService(prisma, jwt, audit) };
  }

  const baseUser = () => ({
    id: 'u1', email: 'vet@x.gov', name: 'Vet', role: 'VETERINARIAN', status: 'ACTIVE', passwordHash: hash,
    failedLoginAttempts: 0, lockedUntil: null, tokenVersion: 3, mustChangePassword: false,
  });

  it('issues a token carrying the token version and returns permissions', async () => {
    const { service, jwt } = setup(baseUser());
    const res = await service.login({ email: 'VET@x.gov ', password: 'Correct#Pass1' }, '1.2.3.4');
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 'u1', email: 'vet@x.gov', role: 'veterinarian', tv: 3 });
    expect(res.user.permissions).toContain('treatment:write');
  });

  it('counts failures and locks the account at the threshold', async () => {
    const { service, prisma, audit } = setup({ ...baseUser(), failedLoginAttempts: 4 });
    await expect(service.login({ email: 'vet@x.gov', password: 'wrong' }, null)).rejects.toThrow(UnauthorizedException);
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.lockedUntil).toBeInstanceOf(Date);
    expect(audit.record).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'ACCOUNT_LOCKED' }));
  });

  it('refuses a locked account even with the right password', async () => {
    const { service } = setup({ ...baseUser(), lockedUntil: new Date(Date.now() + 60_000) });
    await expect(service.login({ email: 'vet@x.gov', password: 'Correct#Pass1' }, null)).rejects.toThrow(/locked/);
  });

  it('refuses inactive accounts', async () => {
    const { service } = setup({ ...baseUser(), status: 'SUSPENDED' });
    await expect(service.login({ email: 'vet@x.gov', password: 'Correct#Pass1' }, null)).rejects.toThrow(/not active/);
  });

  it('keeps self-registration disabled by default', async () => {
    const { service } = setup(null);
    delete process.env.ALLOW_SELF_REGISTRATION;
    await expect(service.register({ email: 'a@b.c', password: 'Strong#Pass1', name: 'A' }, null)).rejects.toThrow(/disabled/);
  });
});

describe('JwtStrategy.validate', () => {
  const strategy = (user: any) => new JwtStrategy({ user: { findUnique: jest.fn().mockResolvedValue(user) } } as any);

  it('rejects revoked tokens (token version mismatch)', async () => {
    await expect(strategy({ id: 'u1', status: 'ACTIVE', tokenVersion: 2, role: 'ADMIN' }).validate({ sub: 'u1', tv: 1 })).rejects.toThrow(/revoked/);
  });

  it('rejects tokens of suspended users immediately', async () => {
    await expect(strategy({ id: 'u1', status: 'SUSPENDED', tokenVersion: 0, role: 'ADMIN' }).validate({ sub: 'u1', tv: 0 })).rejects.toThrow(UnauthorizedException);
  });

  it('returns the canonical upper-case role', async () => {
    await expect(strategy({ id: 'u1', email: 'e', name: 'n', status: 'ACTIVE', tokenVersion: 0, role: 'tester' }).validate({ sub: 'u1', tv: 0 })).resolves.toEqual(
      expect.objectContaining({ role: 'TESTER' }),
    );
  });
});
