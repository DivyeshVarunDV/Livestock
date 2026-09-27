import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { PermissionsGuard } from './auth/permissions.guard';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';
import { ComplianceModule } from './compliance/compliance.module';
import { PublicModule } from './public/public.module';
import { FarmModule } from './farm/farm.module';
import { AnimalModule } from './animal/animal.module';
import { HealthModule } from './health/health.module';
import { VaccinationModule } from './vaccination/vaccination.module';
import { TreatmentModule } from './treatment/treatment.module';
import { ReportModule } from './report/report.module';
import { LedgerModule } from './ledger/ledger.module';
import { InventoryModule } from './inventory/inventory.module';
import { NotificationModule } from './notification/notification.module';
import { AuditModule } from './audit/audit.module';
import { UserModule } from './user/user.module';
import { PrescriptionModule } from './prescription/prescription.module';
import { MilkCollectionModule } from './milk-collection/milk-collection.module';
import { MilkTestModule } from './milk-test/milk-test.module';
import { ViolationModule } from './violation/violation.module';
import { OwnershipTransferModule } from './ownership-transfer/ownership-transfer.module';
import { AmuModule } from './amu/amu.module';
import { MedicineDispensingModule } from './medicine-dispensing/medicine-dispensing.module';
import { CollectionBatchModule } from './collection-batch/collection-batch.module';
import { ProductClearanceModule } from './product-clearance/product-clearance.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    NotificationModule,
    ComplianceModule,
    AuthModule,
    PublicModule,
    FarmModule,
    AnimalModule,
    HealthModule,
    VaccinationModule,
    TreatmentModule,
    ReportModule,
    LedgerModule,
    InventoryModule,
    UserModule,
    PrescriptionModule,
    MilkCollectionModule,
    MilkTestModule,
    ViolationModule,
    OwnershipTransferModule,
    AmuModule,
    MedicineDispensingModule,
    CollectionBatchModule,
    ProductClearanceModule,
  ],
  providers: [
    // Order matters: authenticate first, then authorise. Every route is
    // protected unless explicitly marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
