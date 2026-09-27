import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { AnimalService } from './animal.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('animals')
export class AnimalController {
  constructor(private animalService: AnimalService) {}

  @Get()
  @RequirePermissions(Permission.ANIMAL_READ)
  async findAll(@CurrentUser() actor: Actor, @Query('farmId') farmId?: string) {
    return this.animalService.findAll(actor, farmId);
  }

  @Get(':id')
  @RequirePermissions(Permission.ANIMAL_READ)
  async findOne(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.animalService.findOne(actor, id);
  }

  @Get(':id/timeline')
  @RequirePermissions(Permission.ANIMAL_READ)
  async getTimeline(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.animalService.getTimeline(actor, id);
  }

  @Get(':id/clearance')
  @RequirePermissions(Permission.CLEARANCE_READ)
  async getClearance(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.animalService.getClearance(actor, id);
  }

  @Post()
  @RequirePermissions(Permission.ANIMAL_CREATE)
  async create(@CurrentUser() actor: Actor, @Body() dto: any) {
    return this.animalService.create(actor, dto);
  }

  @Put(':id')
  @RequirePermissions(Permission.ANIMAL_UPDATE)
  async update(@CurrentUser() actor: Actor, @Param('id') id: string, @Body() dto: any) {
    return this.animalService.update(actor, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.ANIMAL_DELETE)
  async remove(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.animalService.remove(actor, id);
  }
}
