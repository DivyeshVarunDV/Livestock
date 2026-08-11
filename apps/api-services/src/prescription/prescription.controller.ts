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
import { PrescriptionService } from './prescription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Get()
  async findAll() {
    return this.prescriptionService.findAll();
  }

  @Post()
  async create(@Body() dto: any) {
    return this.prescriptionService.create(dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prescriptionService.remove(id);
  }
}
