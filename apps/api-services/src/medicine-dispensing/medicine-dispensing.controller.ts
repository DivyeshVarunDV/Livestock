import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { MedicineDispensingService } from './medicine-dispensing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('medicine-dispensing')
@UseGuards(JwtAuthGuard)
export class MedicineDispensingController {
  constructor(private readonly medicineDispensingService: MedicineDispensingService) {}

  @Get()
  findAll(
    @Query('animalId') animalId?: string,
    @Query('prescriptionId') prescriptionId?: string,
  ) {
    return this.medicineDispensingService.findAll(animalId, prescriptionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.medicineDispensingService.findOne(id);
  }

  @Post()
  create(@Body() createDto: any) {
    return this.medicineDispensingService.create(createDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.medicineDispensingService.remove(id);
  }
}
