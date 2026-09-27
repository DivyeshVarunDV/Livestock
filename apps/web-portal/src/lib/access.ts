/**
 * Client-side route access policy. This only shapes the UI (what is shown and
 * linked); the API enforces the authoritative permission checks on every
 * request, so hiding a page here is never the only line of defence.
 */
export type Role = 'admin' | 'veterinarian' | 'tester' | 'farmer';

const COMMON_ROUTES = ['/profile', '/notifications'];

const ROLE_ROUTES: Record<Role, string[]> = {
  admin: [
    '/admin', '/dashboard', '/farms', '/animals', '/livestock', '/treatments', '/withdrawal', '/mrl', '/alerts', '/amu',
    '/compliance', '/health', '/health-records', '/inventory', '/prescriptions', '/transfers', '/reports', '/audit',
    '/users', '/settings', '/violations', '/milk-collection', '/milk-testing', '/maps', '/lab',
  ],
  veterinarian: [
    '/veterinarian', '/dashboard', '/farms', '/animals', '/livestock', '/treatments', '/prescriptions', '/withdrawal',
    '/mrl', '/alerts', '/amu', '/compliance', '/health', '/health-records', '/inventory', '/transfers', '/reports',
    '/violations', '/maps',
  ],
  tester: ['/tester', '/dashboard', '/farms', '/animals', '/milk-collection', '/milk-testing', '/violations', '/reports'],
  farmer: ['/farms', '/animals', '/livestock'],
};

/** Sub-paths that are read-only for some roles even though the section is visible. */
const BLOCKED: Partial<Record<Role, string[]>> = {
  tester: ['/farms/new', '/animals/new'],
  farmer: ['/farms/new', '/animals/new'],
  admin: ['/treatments/new', '/prescriptions/new'],
};

export function normalizeRole(role: unknown): Role | null {
  const r = String(role ?? '').toLowerCase();
  return r === 'admin' || r === 'veterinarian' || r === 'tester' || r === 'farmer' ? r : null;
}

export function homePathFor(role: unknown): string {
  switch (normalizeRole(role)) {
    case 'admin':
      return '/admin/dashboard';
    case 'veterinarian':
      return '/veterinarian/dashboard';
    case 'tester':
      return '/tester/dashboard';
    case 'farmer':
      return '/farms';
    default:
      return '/login';
  }
}

const matches = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export function canAccessRoute(role: unknown, pathname: string): boolean {
  if (pathname === '/' || COMMON_ROUTES.some((r) => matches(pathname, r))) return true;
  const r = normalizeRole(role);
  if (!r) return false;
  if ((BLOCKED[r] ?? []).some((b) => matches(pathname, b))) return false;
  return ROLE_ROUTES[r].some((base) => matches(pathname, base));
}
