import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('health-records')
@UseGuards(JwtAuthGuard)
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  async findByAnimal(@Query('animalId') animalId: string) {
    return this.healthService.findByAnimal(animalId);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.healthService.create(dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.healthService.remove(id);
  }
}
