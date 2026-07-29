import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { FarmModule } from './farm/farm.module';
import { AnimalModule } from './animal/animal.module';
import { HealthModule } from './health/health.module';
import { VaccinationModule } from './vaccination/vaccination.module';
import { TreatmentModule } from './treatment/treatment.module';
import { ReportModule } from './report/report.module';
import { LedgerModule } from './ledger/ledger.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    FarmModule,
    AnimalModule,
    HealthModule,
    VaccinationModule,
    TreatmentModule,
    ReportModule,
    LedgerModule,
  ],
})
export class AppModule {}
