/**
 * Central RBAC policy. Every API route declares the permission(s) it needs via
 * @RequirePermissions(); roles are mapped to permissions only here.
 *
 * Principles applied:
 *  - Least privilege: each role receives only what its duties require.
 *  - Segregation of duties: clinical records (treatments, prescriptions,
 *    vaccinations, AMU) are written only by registered veterinarians; laboratory
 *    results only by testing officers; administrators oversee, approve and
 *    resolve but do not author clinical or lab evidence.
 *  - Regulatory master data (MRL rules) is controlled by administrators.
 *  - Destructive operations on regulatory records are administrator-only and
 *    always audit-logged with the full prior state.
 */
export const Permission = {
  // Identity & administration
  USER_MANAGE: 'user:manage',
  AUDIT_READ: 'audit:read',
  AUDIT_VERIFY: 'audit:verify',
  LEDGER_VERIFY: 'ledger:verify',
  NOTIFICATION_BROADCAST: 'notification:broadcast',

  // Registry
  FARM_READ: 'farm:read',
  FARM_CREATE: 'farm:create',
  FARM_UPDATE: 'farm:update',
  FARM_DELETE: 'farm:delete',
  ANIMAL_READ: 'animal:read',
  ANIMAL_CREATE: 'animal:create',
  ANIMAL_UPDATE: 'animal:update',
  ANIMAL_DELETE: 'animal:delete',

  // Clinical
  HEALTH_READ: 'health:read',
  HEALTH_WRITE: 'health:write',
  VACCINATION_READ: 'vaccination:read',
  VACCINATION_WRITE: 'vaccination:write',
  TREATMENT_READ: 'treatment:read',
  TREATMENT_WRITE: 'treatment:write',
  PRESCRIPTION_READ: 'prescription:read',
  PRESCRIPTION_WRITE: 'prescription:write',
  PRESCRIPTION_CANCEL: 'prescription:cancel',
  DISPENSING_READ: 'dispensing:read',
  DISPENSING_WRITE: 'dispensing:write',
  AMU_READ: 'amu:read',
  AMU_WRITE: 'amu:write',
  CLINICAL_RECORD_DELETE: 'clinical:delete',
  WITHDRAWAL_READ: 'withdrawal:read',

  // Regulatory master data
  MRL_RULE_READ: 'mrl-rule:read',
  MRL_RULE_WRITE: 'mrl-rule:write',
  MRL_STATUS_REFRESH: 'mrl-status:refresh',

  // Pharmacy
  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',

  // Movement
  TRANSFER_READ: 'transfer:read',
  TRANSFER_REQUEST: 'transfer:request',
  TRANSFER_DECIDE: 'transfer:decide',
  TRANSFER_DELETE: 'transfer:delete',

  // Food chain & laboratory
  COLLECTION_READ: 'collection:read',
  COLLECTION_WRITE: 'collection:write',
  COLLECTION_DELETE: 'collection:delete',
  BATCH_READ: 'batch:read',
  BATCH_WRITE: 'batch:write',
  LAB_TEST_READ: 'lab-test:read',
  LAB_TEST_WRITE: 'lab-test:write',
  LAB_TEST_DELETE: 'lab-test:delete',
  CLEARANCE_READ: 'clearance:read',
  CLEARANCE_REFRESH: 'clearance:refresh',

  // Enforcement
  VIOLATION_READ: 'violation:read',
  VIOLATION_CREATE: 'violation:create',
  VIOLATION_UPDATE: 'violation:update',
  VIOLATION_RESOLVE: 'violation:resolve',
  VIOLATION_DELETE: 'violation:delete',

  // Analytics
  REPORT_READ: 'report:read',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ROLES = ['ADMIN', 'VETERINARIAN', 'TESTER', 'FARMER'] as const;
export type Role = (typeof ROLES)[number];

const P = Permission;

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: [
    P.USER_MANAGE, P.AUDIT_READ, P.AUDIT_VERIFY, P.LEDGER_VERIFY, P.NOTIFICATION_BROADCAST,
    P.FARM_READ, P.FARM_CREATE, P.FARM_UPDATE, P.FARM_DELETE,
    P.ANIMAL_READ, P.ANIMAL_CREATE, P.ANIMAL_UPDATE, P.ANIMAL_DELETE,
    P.HEALTH_READ, P.VACCINATION_READ, P.TREATMENT_READ, P.PRESCRIPTION_READ, P.PRESCRIPTION_CANCEL,
    P.DISPENSING_READ, P.AMU_READ, P.WITHDRAWAL_READ, P.CLINICAL_RECORD_DELETE,
    P.MRL_RULE_READ, P.MRL_RULE_WRITE, P.MRL_STATUS_REFRESH,
    P.INVENTORY_READ, P.INVENTORY_WRITE,
    P.TRANSFER_READ, P.TRANSFER_REQUEST, P.TRANSFER_DECIDE, P.TRANSFER_DELETE,
    P.COLLECTION_READ, P.COLLECTION_WRITE, P.COLLECTION_DELETE,
    P.BATCH_READ, P.BATCH_WRITE,
    P.LAB_TEST_READ, P.LAB_TEST_DELETE,
    P.CLEARANCE_READ, P.CLEARANCE_REFRESH,
    P.VIOLATION_READ, P.VIOLATION_CREATE, P.VIOLATION_UPDATE, P.VIOLATION_RESOLVE, P.VIOLATION_DELETE,
    P.REPORT_READ,
  ],
  VETERINARIAN: [
    P.FARM_READ, P.FARM_CREATE, P.FARM_UPDATE,
    P.ANIMAL_READ, P.ANIMAL_CREATE, P.ANIMAL_UPDATE,
    P.HEALTH_READ, P.HEALTH_WRITE,
    P.VACCINATION_READ, P.VACCINATION_WRITE,
    P.TREATMENT_READ, P.TREATMENT_WRITE,
    P.PRESCRIPTION_READ, P.PRESCRIPTION_WRITE, P.PRESCRIPTION_CANCEL,
    P.DISPENSING_READ, P.DISPENSING_WRITE,
    P.AMU_READ, P.AMU_WRITE, P.WITHDRAWAL_READ,
    P.MRL_RULE_READ, P.MRL_STATUS_REFRESH,
    P.INVENTORY_READ, P.INVENTORY_WRITE,
    P.TRANSFER_READ, P.TRANSFER_REQUEST,
    P.CLEARANCE_READ, P.CLEARANCE_REFRESH,
    P.VIOLATION_READ, P.VIOLATION_CREATE,
    P.REPORT_READ,
  ],
  TESTER: [
    P.FARM_READ, P.ANIMAL_READ,
    P.MRL_RULE_READ, P.WITHDRAWAL_READ,
    // Testers collect products at the point of origin and test them; deleting collections stays with admins.
    P.COLLECTION_READ, P.COLLECTION_WRITE,
    P.BATCH_READ, P.BATCH_WRITE,
    P.LAB_TEST_READ, P.LAB_TEST_WRITE,
    P.CLEARANCE_READ, P.CLEARANCE_REFRESH,
    P.VIOLATION_READ, P.VIOLATION_CREATE, P.VIOLATION_UPDATE,
    P.REPORT_READ,
  ],
  // Farmers only ever see data for farms they own (enforced in the services).
  FARMER: [P.FARM_READ, P.ANIMAL_READ, P.CLEARANCE_READ],
};

export function normalizeRole(role: unknown): Role | null {
  const upper = String(role ?? '').trim().toUpperCase();
  return (ROLES as readonly string[]).includes(upper) ? (upper as Role) : null;
}

export function permissionsForRole(role: unknown): readonly Permission[] {
  const r = normalizeRole(role);
  return r ? ROLE_PERMISSIONS[r] : [];
}

export function roleHasPermission(role: unknown, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
