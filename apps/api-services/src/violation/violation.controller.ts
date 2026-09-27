import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ViolationService } from './violation.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('violations')
export class ViolationController {
  constructor(private service: ViolationService) {}

  @Get()
  @RequirePermissions(Permission.VIOLATION_READ)
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permission.VIOLATION_READ)
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.VIOLATION_CREATE)
  async create(@CurrentUser() actor: Actor, @Body() dto: any) {
    return this.service.create(actor, dto);
  }

  /** Closing / re-opening additionally requires VIOLATION_RESOLVE (checked in the service). */
  @Put(':id')
  @RequirePermissions(Permission.VIOLATION_UPDATE)
  async update(@CurrentUser() actor: Actor, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(actor, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.VIOLATION_DELETE)
  async remove(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.service.remove(actor, id);
  }
}
