import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AmuService } from './amu.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('amu-records')
@UseGuards(JwtAuthGuard)
export class AmuController {
  constructor(private readonly amuService: AmuService) {}

  @Get()
  async findAll(@Query('animalId') animalId?: string) {
    return this.amuService.findAll(animalId);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.amuService.create(dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.amuService.remove(id);
  }
}
