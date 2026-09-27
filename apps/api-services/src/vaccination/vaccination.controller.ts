import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { VaccinationService } from './vaccination.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('vaccinations')
export class VaccinationController {
  constructor(private vaccinationService: VaccinationService) {}

  @Get()
  @RequirePermissions(Permission.VACCINATION_READ)
  async findByAnimal(@Query('animalId') animalId?: string) {
    return this.vaccinationService.findByAnimal(animalId);
  }

  @Get('upcoming')
  @RequirePermissions(Permission.VACCINATION_READ)
  async getUpcoming() {
    return this.vaccinationService.getUpcoming();
  }

  @Post()
  @RequirePermissions(Permission.VACCINATION_WRITE)
  async create(@CurrentUser() actor: Actor, @Body() dto: any) {
    return this.vaccinationService.create(actor, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.CLINICAL_RECORD_DELETE)
  async remove(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.vaccinationService.remove(actor, id);
  }
}
