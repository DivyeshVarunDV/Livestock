import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ProductClearanceService } from './product-clearance.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('product-clearances')
export class ProductClearanceController {
  constructor(private readonly productClearanceService: ProductClearanceService) {}

  @Get()
  @RequirePermissions(Permission.CLEARANCE_READ)
  findAll(
    @CurrentUser() actor: Actor,
    @Query('animalId') animalId?: string,
    @Query('farmerId') farmerId?: string,
    @Query('status') status?: string,
  ) {
    return this.productClearanceService.findAll(actor, { animalId, farmerId, status });
  }

  @Get('animal/:animalId')
  @RequirePermissions(Permission.CLEARANCE_READ)
  getByAnimal(@CurrentUser() actor: Actor, @Param('animalId') animalId: string) {
    return this.productClearanceService.getByAnimal(actor, animalId);
  }

  @Get('farmer/:farmerId')
  @RequirePermissions(Permission.CLEARANCE_READ)
  getByFarmer(@CurrentUser() actor: Actor, @Param('farmerId') farmerId: string) {
    return this.productClearanceService.getByFarmer(actor, farmerId);
  }

  @Post('refresh/:animalId')
  @RequirePermissions(Permission.CLEARANCE_REFRESH)
  refreshClearance(@CurrentUser() actor: Actor, @Param('animalId') animalId: string) {
    return this.productClearanceService.refreshClearance(actor, animalId);
  }

  @Get('check/:animalId/:productType')
  @RequirePermissions(Permission.CLEARANCE_READ)
  checkClearance(
    @CurrentUser() actor: Actor,
    @Param('animalId') animalId: string,
    @Param('productType') productType: string,
  ) {
    return this.productClearanceService.checkClearance(actor, animalId, productType);
  }
}
