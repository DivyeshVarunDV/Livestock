import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Authenticated, RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Authenticated()
  @Get()
  async findAll(@CurrentUser() actor: Actor) {
    return this.notificationService.findAll(actor);
  }

  @RequirePermissions(Permission.NOTIFICATION_BROADCAST)
  @Post()
  async create(@Body() dto: any) {
    return this.notificationService.create(dto);
  }

  // Declared before ':id/read' for clarity; paths do not overlap.
  @Authenticated()
  @Put('mark-all-read')
  async markAllRead(@CurrentUser() actor: Actor) {
    return this.notificationService.markAllRead(actor);
  }

  @Authenticated()
  @Put(':id/read')
  async markRead(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.notificationService.markRead(actor, id);
  }

  @Authenticated()
  @Delete(':id')
  async remove(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.notificationService.remove(actor, id);
  }
}
