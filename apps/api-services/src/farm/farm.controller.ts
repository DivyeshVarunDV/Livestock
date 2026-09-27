import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { FarmService } from './farm.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('farms')
export class FarmController {
  constructor(private farmService: FarmService) {}

  @Get()
  @RequirePermissions(Permission.FARM_READ)
  async findAll(@CurrentUser() actor: Actor) {
    return this.farmService.findAll(actor);
  }

  @Get(':id')
  @RequirePermissions(Permission.FARM_READ)
  async findOne(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.farmService.findOne(actor, id);
  }

  @Post()
  @RequirePermissions(Permission.FARM_CREATE)
  async create(@CurrentUser() actor: Actor, @Body() dto: any) {
    return this.farmService.create(actor, dto);
  }

  @Put(':id')
  @RequirePermissions(Permission.FARM_UPDATE)
  async update(@CurrentUser() actor: Actor, @Param('id') id: string, @Body() dto: any) {
    return this.farmService.update(actor, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.FARM_DELETE)
  async remove(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.farmService.remove(actor, id);
  }
}
