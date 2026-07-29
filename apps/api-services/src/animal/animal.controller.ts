import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AnimalService } from './animal.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('animals')
@UseGuards(JwtAuthGuard)
export class AnimalController {
  constructor(private animalService: AnimalService) {}

  @Get()
  async findAll(@Query('farmId') farmId?: string) {
    return this.animalService.findAll(farmId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.animalService.findOne(id);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.animalService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.animalService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.animalService.remove(id);
  }
}
