import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';
import { getJwtSecret } from './jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException();
    }
    // Suspended / deactivated accounts lose access immediately, not at token expiry.
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    // Tokens are revoked by bumping tokenVersion (password change/reset, role change, sign-out-everywhere).
    if ((payload.tv ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('Session has been revoked. Please sign in again.');
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role.toUpperCase() };
  }
}
