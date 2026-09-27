import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { PrescriptionService } from './prescription.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('prescriptions')
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Get()
  @RequirePermissions(Permission.PRESCRIPTION_READ)
  async findAll(@Query('animalId') animalId?: string, @Query('status') status?: string) {
    return this.prescriptionService.findAll(animalId, status);
  }

  @Get(':id')
  @RequirePermissions(Permission.PRESCRIPTION_READ)
  async findOne(@Param('id') id: string) {
    return this.prescriptionService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.PRESCRIPTION_WRITE)
  async create(@CurrentUser() actor: Actor, @Body() dto: any) {
    return this.prescriptionService.create(actor, dto);
  }

  @Put(':id/status')
  @RequirePermissions(Permission.PRESCRIPTION_CANCEL)
  async updateStatus(@CurrentUser() actor: Actor, @Param('id') id: string, @Body() body: any) {
    return this.prescriptionService.updateStatus(actor, id, body?.status, body?.reason);
  }

  @Delete(':id')
  @RequirePermissions(Permission.CLINICAL_RECORD_DELETE)
  async remove(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.prescriptionService.remove(actor, id);
  }
}
