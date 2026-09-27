import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @RequirePermissions(Permission.INVENTORY_READ)
  async findAll() {
    return this.inventoryService.findAll();
  }

  @Get('alerts')
  @RequirePermissions(Permission.INVENTORY_READ)
  async getAlerts() {
    return this.inventoryService.getAlerts();
  }

  @Get(':id')
  @RequirePermissions(Permission.INVENTORY_READ)
  async findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.INVENTORY_WRITE)
  async create(@CurrentUser() actor: Actor, @Body() dto: any) {
    return this.inventoryService.create(actor, dto);
  }

  @Put(':id')
  @RequirePermissions(Permission.INVENTORY_WRITE)
  async update(@CurrentUser() actor: Actor, @Param('id') id: string, @Body() dto: any) {
    return this.inventoryService.update(actor, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.INVENTORY_WRITE)
  async remove(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.inventoryService.remove(actor, id);
  }
}
