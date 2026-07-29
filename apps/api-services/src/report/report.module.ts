import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { TreatmentModule } from '../treatment/treatment.module';

@Module({
  imports: [TreatmentModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
