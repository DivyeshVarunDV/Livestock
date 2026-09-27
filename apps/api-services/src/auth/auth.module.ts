import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { LoginRateLimiter } from './login-rate-limiter';
import { getJwtExpiresIn, getJwtSecret } from './jwt.config';

@Module({
  imports: [
    PassportModule,
    // Async so the secret is read after the environment has been loaded.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtSecret(),
        signOptions: { expiresIn: getJwtExpiresIn() as any, algorithm: 'HS256' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LoginRateLimiter],
  exports: [AuthService],
})
export class AuthModule {}
