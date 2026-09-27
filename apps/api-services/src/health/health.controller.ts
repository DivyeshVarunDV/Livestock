import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { HealthService } from './health.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('health-records')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  @RequirePermissions(Permission.HEALTH_READ)
  async findByAnimal(@Query('animalId') animalId?: string) {
    return this.healthService.findByAnimal(animalId);
  }

  @Post()
  @RequirePermissions(Permission.HEALTH_WRITE)
  async create(@CurrentUser() actor: Actor, @Body() dto: any) {
    return this.healthService.create(actor, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.CLINICAL_RECORD_DELETE)
  async remove(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.healthService.remove(actor, id);
  }
}
