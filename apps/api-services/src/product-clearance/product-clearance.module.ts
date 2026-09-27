import { Module } from '@nestjs/common';
import { ProductClearanceController } from './product-clearance.controller';
import { ProductClearanceService } from './product-clearance.service';

@Module({
  controllers: [ProductClearanceController],
  providers: [ProductClearanceService],
  exports: [ProductClearanceService],
})
export class ProductClearanceModule {}
