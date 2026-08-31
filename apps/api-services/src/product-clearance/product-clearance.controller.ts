import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ProductClearanceService } from './product-clearance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('product-clearances')
@UseGuards(JwtAuthGuard)
export class ProductClearanceController {
  constructor(private readonly productClearanceService: ProductClearanceService) {}

  @Get()
  findAll(
    @Query('animalId') animalId?: string,
    @Query('farmerId') farmerId?: string,
    @Query('status') status?: string,
  ) {
    return this.productClearanceService.findAll({ animalId, farmerId, status });
  }

  @Get('animal/:animalId')
  getByAnimal(@Param('animalId') animalId: string) {
    return this.productClearanceService.getByAnimal(animalId);
  }

  @Get('farmer/:farmerId')
  getByFarmer(@Param('farmerId') farmerId: string) {
    return this.productClearanceService.getByFarmer(farmerId);
  }

  @Post('refresh/:animalId')
  refreshClearance(@Param('animalId') animalId: string) {
    return this.productClearanceService.refreshClearance(animalId);
  }

  @Get('check/:animalId/:productType')
  checkClearance(
    @Param('animalId') animalId: string,
    @Param('productType') productType: string,
  ) {
    return this.productClearanceService.checkClearance(animalId, productType);
  }
}
