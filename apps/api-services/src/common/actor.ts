import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * The authenticated principal performing a request. Identity fields used in
 * records (veterinarianName, recordedByName, audit userName, ...) must always be
 * taken from here, never from the request body, so they cannot be spoofed.
 */
export interface Actor {
  id: string | null;
  email: string | null;
  name: string;
  role: string; // canonical upper-case role, e.g. ADMIN
  ip?: string | null;
}

export const SYSTEM_ACTOR: Actor = {
  id: null,
  email: 'system@livestocare.gov',
  name: 'System (Automated)',
  role: 'SYSTEM',
  ip: null,
};

export function extractIp(req: any): string | null {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (process.env.TRUST_PROXY === 'true' && typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || null;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): Actor => {
  const req = ctx.switchToHttp().getRequest();
  const user = req.user || {};
  return {
    id: user.id ?? null,
    email: user.email ?? null,
    name: user.name ?? 'Unknown',
    role: String(user.role || '').toUpperCase(),
    ip: extractIp(req),
  };
});

export function isRole(actor: Actor, ...roles: string[]) {
  return roles.some((r) => r.toUpperCase() === actor.role);
}
