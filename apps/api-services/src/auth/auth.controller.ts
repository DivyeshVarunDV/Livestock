import { Controller, Post, Body, Get, Req, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Authenticated, Public } from './permissions.decorator';
import { CurrentUser, extractIp } from '../common/actor';
import type { Actor } from '../common/actor';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto';
import { LoginRateLimiter } from './login-rate-limiter';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private rateLimiter: LoginRateLimiter,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    const ip = extractIp(req);
    this.rateLimiter.consume(`register:${ip}`);
    return this.authService.register(dto, ip);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = extractIp(req);
    this.rateLimiter.consume(`login:${ip}`);
    return this.authService.login(dto, ip);
  }

  @Authenticated()
  @Get('me')
  async me(@CurrentUser() actor: Actor) {
    return this.authService.me(actor);
  }

  @Authenticated()
  @Post('change-password')
  @HttpCode(200)
  async changePassword(@CurrentUser() actor: Actor, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(actor, dto);
  }

  @Authenticated()
  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() actor: Actor) {
    return this.authService.logout(actor);
  }

  @Authenticated()
  @Post('logout-all')
  @HttpCode(200)
  async logoutAll(@CurrentUser() actor: Actor) {
    return this.authService.logoutAll(actor);
  }
}
