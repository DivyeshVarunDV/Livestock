
import { Module } from '@nestjs/common';
import { ViolationController } from './violation.controller';
import { ViolationService } from './violation.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ViolationController],
  providers: [ViolationService],
  exports: [ViolationService],
})
export class ViolationModule {}
