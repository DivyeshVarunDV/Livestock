import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { AmuService } from './amu.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('amu-records')
export class AmuController {
  constructor(private readonly amuService: AmuService) {}

  @Get()
  @RequirePermissions(Permission.AMU_READ)
  async findAll(@Query('animalId') animalId?: string) {
    return this.amuService.findAll(animalId);
  }

  @Post()
  @RequirePermissions(Permission.AMU_WRITE)
  async create(@CurrentUser() actor: Actor, @Body() dto: any) {
    return this.amuService.create(actor, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.CLINICAL_RECORD_DELETE)
  async remove(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.amuService.remove(actor, id);
  }
}
