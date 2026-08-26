import { Module } from '@nestjs/common';
import { AmuController } from './amu.controller';
import { AmuService } from './amu.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AmuController],
  providers: [AmuService],
  exports: [AmuService],
})
export class AmuModule {}
