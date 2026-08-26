
import { Module } from '@nestjs/common';
import { OwnershipTransferController } from './ownership-transfer.controller';
import { OwnershipTransferService } from './ownership-transfer.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OwnershipTransferController],
  providers: [OwnershipTransferService],
  exports: [OwnershipTransferService],
})
export class OwnershipTransferModule {}
