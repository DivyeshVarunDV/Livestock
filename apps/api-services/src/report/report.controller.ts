import { Controller, Get, Query } from '@nestjs/common';
import { ReportService } from './report.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';

@Controller('reports')
@RequirePermissions(Permission.REPORT_READ)
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

  @Get('amu')
  async getAmuReport(@Query('days') days?: string) {
    return this.reportService.getAmuReport(days ? Number(days) || 365 : 365);
  }

  @Get('farm-risk')
  async getFarmRiskReport() {
    return this.reportService.getFarmRiskReport();
  }
}
