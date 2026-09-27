import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/roles.guard';

describe('RolesGuard', () => {
  const makeContext = (role?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    }) as any;

  const reflectorReturning = (value: unknown) =>
    ({ getAllAndOverride: jest.fn().mockReturnValue(value) }) as unknown as Reflector;

  it('allows requests when no roles metadata is set', () => {
    expect(new RolesGuard(reflectorReturning(undefined)).canActivate(makeContext('admin'))).toBe(true);
  });

  it('matches roles case-insensitively', () => {
    expect(new RolesGuard(reflectorReturning(['ADMIN'])).canActivate(makeContext('admin'))).toBe(true);
  });

  it('denies users with non-matching roles', () => {
    expect(new RolesGuard(reflectorReturning(['ADMIN'])).canActivate(makeContext('veterinarian'))).toBe(false);
  });

  it('denies requests without a user role when roles are required', () => {
    expect(new RolesGuard(reflectorReturning(['ADMIN'])).canActivate(makeContext())).toBe(false);
  });

  it('reads controller-level metadata as well as handler-level (regression: class @Roles was ignored)', () => {
    const reflector = reflectorReturning(['ADMIN']);
    new RolesGuard(reflector).canActivate(makeContext('admin'));
    expect((reflector.getAllAndOverride as jest.Mock).mock.calls[0][1]).toEqual(['handler', 'class']);
  });
});
