import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get('dashboard')
  async getDashboardStats() {
    return this.reportService.getDashboardStats();
  }

  @Get('health')
  async getHealthReport() {
    return this.reportService.getHealthReport();
  }

  @Get('vaccinations')
  async getVaccinationReport() {
    return this.reportService.getVaccinationReport();
  }

  @Get('treatments')
  async getTreatmentReport() {
    return this.reportService.getTreatmentReport();
  }

  @Get('compliance')
  async getMrlComplianceReport() {
    return this.reportService.getMrlComplianceReport();
  }
}
