import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { MilkCollectionService } from './milk-collection.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('milk-collections')
export class MilkCollectionController {
  constructor(private service: MilkCollectionService) {}

  @Get()
  @RequirePermissions(Permission.COLLECTION_READ)
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permission.COLLECTION_READ)
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.COLLECTION_WRITE)
  async create(@CurrentUser() actor: Actor, @Body() dto: any) {
    return this.service.create(actor, dto);
  }

  @Put(':id')
  @RequirePermissions(Permission.COLLECTION_WRITE)
  async update(@CurrentUser() actor: Actor, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(actor, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.COLLECTION_DELETE)
  async remove(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.service.remove(actor, id);
  }
}
