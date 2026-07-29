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
import { VaccinationService } from './vaccination.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('vaccinations')
@UseGuards(JwtAuthGuard)
export class VaccinationController {
  constructor(private vaccinationService: VaccinationService) {}

  @Get()
  async findByAnimal(@Query('animalId') animalId: string) {
    return this.vaccinationService.findByAnimal(animalId);
  }

  @Get('upcoming')
  async getUpcoming() {
    return this.vaccinationService.getUpcoming();
  }

  @Post()
  async create(@Body() dto: any) {
    return this.vaccinationService.create(dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.vaccinationService.remove(id);
  }
}
