import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { MilkTestService } from './milk-test.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('milk-tests')
export class MilkTestController {
  constructor(private service: MilkTestService) {}

  @Get()
  @RequirePermissions(Permission.LAB_TEST_READ)
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permission.LAB_TEST_READ)
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.LAB_TEST_WRITE)
  async create(@CurrentUser() actor: Actor, @Body() dto: any) {
    return this.service.create(actor, dto);
  }

  @Put(':id')
  @RequirePermissions(Permission.LAB_TEST_WRITE)
  async update(@CurrentUser() actor: Actor, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(actor, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.LAB_TEST_DELETE)
  async remove(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.service.remove(actor, id);
  }
}
