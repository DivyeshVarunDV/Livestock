
import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { MilkTestService } from './milk-test.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('milk-tests')
@UseGuards(JwtAuthGuard)
export class MilkTestController {
  constructor(private service: MilkTestService) {}

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
