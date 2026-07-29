import { Module } from '@nestjs/common';
import { VaccinationService } from './vaccination.service';
import { VaccinationController } from './vaccination.controller';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  controllers: [VaccinationController],
  providers: [VaccinationService],
})
export class VaccinationModule {}
