import { Module } from '@nestjs/common';
import { TreatmentService } from './treatment.service';
import { TreatmentController } from './treatment.controller';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  controllers: [TreatmentController],
  providers: [TreatmentService],
  exports: [TreatmentService],
})
export class TreatmentModule {}
