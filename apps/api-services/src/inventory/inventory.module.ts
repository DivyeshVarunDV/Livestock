import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { MedicineController } from './medicine.controller';
import { MedicineService } from './medicine.service';

@Module({
  controllers: [InventoryController, MedicineController],
  providers: [InventoryService, MedicineService],
  exports: [InventoryService, MedicineService],
})
export class InventoryModule {}
