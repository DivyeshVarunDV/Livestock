import { Module } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
