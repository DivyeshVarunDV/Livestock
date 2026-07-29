import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FarmService } from './farm.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('farms')
@UseGuards(JwtAuthGuard)
export class FarmController {
  constructor(private farmService: FarmService) {}

  @Get()
  async findAll() {
    return this.farmService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.farmService.findOne(id);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.farmService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.farmService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.farmService.remove(id);
  }
}
