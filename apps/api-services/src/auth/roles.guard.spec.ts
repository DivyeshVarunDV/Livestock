import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/roles.guard';

describe('RolesGuard', () => {
  const makeContext = (role?: string) => ({
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
    getHandler: () => 'handler',
  }) as any;

  it('allows requests when no roles metadata is set', () => {
    const reflector = { get: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext('admin'))).toBe(true);
  });

  it('matches roles case-insensitively', () => {
    const reflector = { get: jest.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext('admin'))).toBe(true);
  });

  it('denies users with non-matching roles', () => {
    const reflector = { get: jest.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext('veterinarian'))).toBe(false);
  });

  it('denies requests without a user role when roles are required', () => {
    const reflector = { get: jest.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext())).toBe(false);
  });
});
