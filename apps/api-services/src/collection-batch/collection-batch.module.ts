import { Module } from '@nestjs/common';
import { CollectionBatchController } from './collection-batch.controller';
import { CollectionBatchService } from './collection-batch.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CollectionBatchController],
  providers: [CollectionBatchService],
  exports: [CollectionBatchService],
})
export class CollectionBatchModule {}
