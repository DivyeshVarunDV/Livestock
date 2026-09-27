import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from './dto';

@RequirePermissions(Permission.USER_MANAGE)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.userService.findAll({ search, role, status });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post()
  async create(@CurrentUser() actor: Actor, @Body() dto: CreateUserDto) {
    return this.userService.create(actor, dto);
  }

  @Put(':id')
  async update(@CurrentUser() actor: Actor, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(actor, id, dto);
  }

  @Put(':id/reset-password')
  async resetPassword(@CurrentUser() actor: Actor, @Param('id') id: string, @Body() body: ResetPasswordDto) {
    return this.userService.resetPassword(actor, id, body.password);
  }

  @Put(':id/unlock')
  async unlock(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.userService.unlock(actor, id);
  }

  @Delete(':id')
  async remove(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.userService.remove(actor, id);
  }
}
