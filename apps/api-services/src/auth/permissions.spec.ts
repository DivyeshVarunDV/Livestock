import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { PermissionsGuard } from './permissions.guard';
import { AUTHENTICATED_KEY, IS_PUBLIC_KEY, PERMISSIONS_KEY } from './permissions.decorator';
import { ROLES_KEY } from './roles.decorator';
import { Permission, ROLE_PERMISSIONS, ROLES, permissionsForRole, roleHasPermission } from './permissions';

import { AnimalController } from '../animal/animal.controller';
import { AmuController } from '../amu/amu.controller';
import { AuditController } from '../audit/audit.controller';
import { AuthController } from './auth.controller';
import { CollectionBatchController } from '../collection-batch/collection-batch.controller';
import { FarmController } from '../farm/farm.controller';
import { HealthController } from '../health/health.controller';
import { InventoryController } from '../inventory/inventory.controller';
import { LedgerController } from '../ledger/ledger.controller';
import { MedicineDispensingController } from '../medicine-dispensing/medicine-dispensing.controller';
import { MilkCollectionController } from '../milk-collection/milk-collection.controller';
import { MilkTestController } from '../milk-test/milk-test.controller';
import { NotificationController } from '../notification/notification.controller';
import { OwnershipTransferController } from '../ownership-transfer/ownership-transfer.controller';
import { PrescriptionController } from '../prescription/prescription.controller';
import { ProductClearanceController } from '../product-clearance/product-clearance.controller';
import { PublicController } from '../public/public.controller';
import { ReportController } from '../report/report.controller';
import { TreatmentController } from '../treatment/treatment.controller';
import { UserController } from '../user/user.controller';
import { VaccinationController } from '../vaccination/vaccination.controller';
import { ViolationController } from '../violation/violation.controller';

const CONTROLLERS = [
  AnimalController, AmuController, AuditController, AuthController, CollectionBatchController, FarmController,
  HealthController, InventoryController, LedgerController, MedicineDispensingController, MilkCollectionController,
  MilkTestController, NotificationController, OwnershipTransferController, PrescriptionController,
  ProductClearanceController, PublicController, ReportController, TreatmentController, UserController,
  VaccinationController, ViolationController,
];

function routes() {
  const out: { name: string; handler: Function; cls: Function }[] = [];
  for (const cls of CONTROLLERS) {
    for (const key of Object.getOwnPropertyNames(cls.prototype)) {
      const handler = (cls.prototype as any)[key];
      if (key === 'constructor' || typeof handler !== 'function') continue;
      if (Reflect.getMetadata(METHOD_METADATA, handler) === undefined && Reflect.getMetadata(PATH_METADATA, handler) === undefined) continue;
      out.push({ name: `${cls.name}.${key}`, handler, cls });
    }
  }
  return out;
}

describe('RBAC policy coverage', () => {
  const all = routes();

  it('discovers the API routes', () => {
    expect(all.length).toBeGreaterThan(80);
  });

  it.each(all.map((r) => [r.name, r] as const))('%s declares an access policy', (_name, r) => {
    const has = (key: string) => Reflect.getMetadata(key, r.handler) !== undefined || Reflect.getMetadata(key, r.cls) !== undefined;
    expect(has(PERMISSIONS_KEY) || has(ROLES_KEY) || has(AUTHENTICATED_KEY) || has(IS_PUBLIC_KEY)).toBe(true);
  });

  it('every permission required by a route is granted to at least one role', () => {
    const granted = new Set(Object.values(ROLE_PERMISSIONS).flat());
    for (const r of all) {
      const perms: string[] = Reflect.getMetadata(PERMISSIONS_KEY, r.handler) ?? Reflect.getMetadata(PERMISSIONS_KEY, r.cls) ?? [];
      for (const p of perms) expect({ route: r.name, granted: granted.has(p as Permission) }).toEqual({ route: r.name, granted: true });
    }
  });

  it('only exposes health probe, login, registration and QR verification publicly', () => {
    const publicRoutes = all
      .filter((r) => Reflect.getMetadata(IS_PUBLIC_KEY, r.handler) || Reflect.getMetadata(IS_PUBLIC_KEY, r.cls))
      .map((r) => r.name)
      .sort();
    expect(publicRoutes).toEqual(
      ['AuthController.login', 'AuthController.register', 'PublicController.health', 'PublicController.verifyAnimal', 'PublicController.verifyBatch'].sort(),
    );
  });
});

describe('Role permission matrix', () => {
  it('knows exactly the four official roles', () => {
    expect([...ROLES]).toEqual(['ADMIN', 'VETERINARIAN', 'TESTER', 'FARMER']);
  });

  it('keeps clinical authorship with veterinarians only', () => {
    for (const p of [Permission.TREATMENT_WRITE, Permission.PRESCRIPTION_WRITE, Permission.VACCINATION_WRITE, Permission.AMU_WRITE, Permission.DISPENSING_WRITE]) {
      expect(ROLES.filter((r) => roleHasPermission(r, p))).toEqual(['VETERINARIAN']);
    }
  });

  it('keeps laboratory results with testing officers only', () => {
    expect(ROLES.filter((r) => roleHasPermission(r, Permission.LAB_TEST_WRITE))).toEqual(['TESTER']);
  });

  it('lets testing officers collect products but not delete collections', () => {
    expect(roleHasPermission('TESTER', Permission.COLLECTION_WRITE)).toBe(true);
    expect(roleHasPermission('TESTER', Permission.COLLECTION_DELETE)).toBe(false);
  });

  it('reserves administration, MRL rules, approvals and case closure for administrators', () => {
    for (const p of [Permission.USER_MANAGE, Permission.AUDIT_READ, Permission.MRL_RULE_WRITE, Permission.TRANSFER_DECIDE, Permission.VIOLATION_RESOLVE, Permission.CLINICAL_RECORD_DELETE]) {
      expect(ROLES.filter((r) => roleHasPermission(r, p))).toEqual(['ADMIN']);
    }
  });

  it('gives farmers read-only access', () => {
    expect(permissionsForRole('farmer')).toEqual([Permission.FARM_READ, Permission.ANIMAL_READ, Permission.CLEARANCE_READ]);
  });

  it('grants nothing to unknown roles', () => {
    expect(permissionsForRole('superuser')).toEqual([]);
    expect(permissionsForRole(undefined)).toEqual([]);
  });
});

describe('PermissionsGuard', () => {
  const ctx = (role?: string) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
      getHandler: () => 'h',
      getClass: () => 'c',
    }) as any;
  const guardWith = (meta: Record<string, unknown>) =>
    new PermissionsGuard({ getAllAndOverride: (key: string) => meta[key] } as unknown as Reflector);

  it('lets public routes through without a user', () => {
    expect(guardWith({ [IS_PUBLIC_KEY]: true }).canActivate(ctx())).toBe(true);
  });

  it('denies routes that declare no policy (default deny)', () => {
    expect(() => guardWith({}).canActivate(ctx('ADMIN'))).toThrow(ForbiddenException);
  });

  it('allows a role holding the permission', () => {
    expect(guardWith({ [PERMISSIONS_KEY]: [Permission.TREATMENT_WRITE] }).canActivate(ctx('VETERINARIAN'))).toBe(true);
  });

  it('rejects a role lacking the permission with an explanatory message', () => {
    expect(() => guardWith({ [PERMISSIONS_KEY]: [Permission.TREATMENT_WRITE] }).canActivate(ctx('ADMIN'))).toThrow(/treatment:write/);
  });

  it('allows @Authenticated routes for any signed-in role', () => {
    expect(guardWith({ [AUTHENTICATED_KEY]: true }).canActivate(ctx('FARMER'))).toBe(true);
  });
});
