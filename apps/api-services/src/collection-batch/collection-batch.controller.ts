import { Controller, Get, Post, Put, Param, Query, Body } from '@nestjs/common';
import { CollectionBatchService } from './collection-batch.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('collection-batches')
export class CollectionBatchController {
  constructor(private readonly collectionBatchService: CollectionBatchService) {}

  @Get()
  @RequirePermissions(Permission.BATCH_READ)
  findAll(
    @Query('status') status?: string,
    @Query('productType') productType?: string,
  ) {
    return this.collectionBatchService.findAll(status, productType);
  }

  @Get(':id')
  @RequirePermissions(Permission.BATCH_READ)
  findOne(@Param('id') id: string) {
    return this.collectionBatchService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.BATCH_WRITE)
  create(@CurrentUser() actor: Actor, @Body() createDto: any) {
    return this.collectionBatchService.create(actor, createDto);
  }

  @Put(':id')
  @RequirePermissions(Permission.BATCH_WRITE)
  update(@CurrentUser() actor: Actor, @Param('id') id: string, @Body() updateDto: any) {
    return this.collectionBatchService.update(actor, id, updateDto);
  }

  @Get(':id/traceability')
  @RequirePermissions(Permission.BATCH_READ)
  getTraceability(@Param('id') id: string) {
    return this.collectionBatchService.getTraceability(id);
  }
}
