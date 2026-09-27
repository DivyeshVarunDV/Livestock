import { Module } from '@nestjs/common';
import { MilkTestController } from './milk-test.controller';
import { MilkTestService } from './milk-test.service';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  controllers: [MilkTestController],
  providers: [MilkTestService],
  exports: [MilkTestService],
})
export class MilkTestModule {}
