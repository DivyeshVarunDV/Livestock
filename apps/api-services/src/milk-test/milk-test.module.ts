
import { Module } from '@nestjs/common';
import { MilkTestController } from './milk-test.controller';
import { MilkTestService } from './milk-test.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MilkTestController],
  providers: [MilkTestService],
  exports: [MilkTestService],
})
export class MilkTestModule {}
