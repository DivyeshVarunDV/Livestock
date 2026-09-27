import { Module } from '@nestjs/common';
import { MedicineDispensingController } from './medicine-dispensing.controller';
import { MedicineDispensingService } from './medicine-dispensing.service';

@Module({
  controllers: [MedicineDispensingController],
  providers: [MedicineDispensingService],
  exports: [MedicineDispensingService],
})
export class MedicineDispensingModule {}
