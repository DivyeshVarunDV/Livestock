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
import { TreatmentService } from './treatment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTreatmentDto } from './dto/create-treatment.dto';

@Controller('treatments')
@UseGuards(JwtAuthGuard)
export class TreatmentController {
  constructor(private treatmentService: TreatmentService) {}

  @Get()
  async findAll() {
    return this.treatmentService.findAll();
  }

  @Get('alerts')
  async getActiveMrlAlerts() {
    return this.treatmentService.getActiveMrlAlerts();
  }

  @Get('rules')
  async getMrlRules() {
    return this.treatmentService.getMrlRules();
  }

  @Post('update-statuses')
  async updateStatuses() {
    return this.treatmentService.updateAnimalMrlStatuses();
  }

  @Post('rules')
  async createMrlRule(@Body() dto: any) {
    return this.treatmentService.createMrlRule(dto);
  }

  @Get('animal')
  async findByAnimal(@Query('animalId') animalId: string) {
    return this.treatmentService.findByAnimal(animalId);
  }

  @Post()
  async create(@Body() dto: CreateTreatmentDto) {
    return this.treatmentService.create(dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.treatmentService.remove(id);
  }
}
