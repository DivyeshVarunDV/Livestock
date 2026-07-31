import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  async findAll(@Query('userId') userId?: string) {
    return this.notificationService.findAll(userId);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.notificationService.create(dto);
  }

  @Put(':id/read')
  async markRead(@Param('id') id: string) {
    return this.notificationService.markRead(id);
  }

  @Put('mark-all-read')
  async markAllRead(@Query('userId') userId?: string) {
    return this.notificationService.markAllRead(userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.notificationService.remove(id);
  }
}
