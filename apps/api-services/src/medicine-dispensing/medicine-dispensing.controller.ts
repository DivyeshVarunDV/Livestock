import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { MedicineDispensingService } from './medicine-dispensing.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('medicine-dispensing')
export class MedicineDispensingController {
  constructor(private readonly medicineDispensingService: MedicineDispensingService) {}

  @Get()
  @RequirePermissions(Permission.DISPENSING_READ)
  findAll(
    @Query('animalId') animalId?: string,
    @Query('prescriptionId') prescriptionId?: string,
  ) {
    return this.medicineDispensingService.findAll(animalId, prescriptionId);
  }

  @Get(':id')
  @RequirePermissions(Permission.DISPENSING_READ)
  findOne(@Param('id') id: string) {
    return this.medicineDispensingService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.DISPENSING_WRITE)
  create(@CurrentUser() actor: Actor, @Body() createDto: any) {
    return this.medicineDispensingService.create(actor, createDto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.CLINICAL_RECORD_DELETE)
  remove(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.medicineDispensingService.remove(actor, id);
  }
}
