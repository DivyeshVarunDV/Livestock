import { Controller, Get, Post, Put, Param, Query, Body, UseGuards } from '@nestjs/common';
import { CollectionBatchService } from './collection-batch.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('collection-batches')
@UseGuards(JwtAuthGuard)
export class CollectionBatchController {
  constructor(private readonly collectionBatchService: CollectionBatchService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('productType') productType?: string,
  ) {
    return this.collectionBatchService.findAll(status, productType);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.collectionBatchService.findOne(id);
  }

  @Post()
  create(@Body() createDto: any) {
    return this.collectionBatchService.create(createDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.collectionBatchService.update(id, updateDto);
  }

  @Get(':id/traceability')
  getTraceability(@Param('id') id: string) {
    return this.collectionBatchService.getTraceability(id);
  }
}
