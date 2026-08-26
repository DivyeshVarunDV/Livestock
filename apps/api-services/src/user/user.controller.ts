import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
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
  async create(@Body() dto: any) {
    return this.userService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.userService.update(id, dto);
  }

  @Put(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() body: any) {
    return this.userService.resetPassword(id, body?.password);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
