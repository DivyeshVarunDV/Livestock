import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { OwnershipTransferService } from './ownership-transfer.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('ownership-transfers')
export class OwnershipTransferController {
  constructor(private service: OwnershipTransferService) {}

  @Get()
  @RequirePermissions(Permission.TRANSFER_READ)
  async findAll() {
    return this.service.findAll();
  }

  @Get('farm-animals/:farmerId')
  @RequirePermissions(Permission.TRANSFER_READ)
  async getAnimalsByFarmerId(@Param('farmerId') farmerId: string) {
    return this.service.getAnimalsByFarmerId(farmerId);
  }

  @Get(':id')
  @RequirePermissions(Permission.TRANSFER_READ)
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.TRANSFER_REQUEST)
  async create(@CurrentUser() actor: Actor, @Body() dto: any) {
    return this.service.create(actor, dto);
  }

  /** Approve / reject additionally requires TRANSFER_DECIDE (checked in the service). */
  @Put(':id')
  @RequirePermissions(Permission.TRANSFER_REQUEST)
  async update(@CurrentUser() actor: Actor, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(actor, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.TRANSFER_DELETE)
  async remove(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.service.remove(actor, id);
  }
}
