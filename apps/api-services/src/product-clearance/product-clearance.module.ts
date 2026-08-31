import { Module } from '@nestjs/common';
import { ProductClearanceController } from './product-clearance.controller';
import { ProductClearanceService } from './product-clearance.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductClearanceController],
  providers: [ProductClearanceService],
  exports: [ProductClearanceService],
})
export class ProductClearanceModule {}
