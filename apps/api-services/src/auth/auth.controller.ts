import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: any) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: any) {
    return this.authService.login(dto);
  }
}
