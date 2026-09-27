import { Module } from '@nestjs/common';
import { MilkCollectionController } from './milk-collection.controller';
import { MilkCollectionService } from './milk-collection.service';

@Module({
  controllers: [MilkCollectionController],
  providers: [MilkCollectionService],
  exports: [MilkCollectionService],
})
export class MilkCollectionModule {}
