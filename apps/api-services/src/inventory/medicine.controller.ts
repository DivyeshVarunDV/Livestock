import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { MedicineService } from './medicine.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('medicines')
export class MedicineController {
  constructor(private medicineService: MedicineService) {}

  @Get()
  @RequirePermissions(Permission.INVENTORY_READ)
  findAll() {
    return this.medicineService.findAll();
  }

  @Post()
  @RequirePermissions(Permission.INVENTORY_WRITE)
  create(@CurrentUser() actor: Actor, @Body() dto: any) {
    return this.medicineService.create(actor, dto);
  }

  @Put(':id')
  @RequirePermissions(Permission.INVENTORY_WRITE)
  update(@CurrentUser() actor: Actor, @Param('id') id: string, @Body() dto: any) {
    return this.medicineService.update(actor, id, dto);
  }
}
