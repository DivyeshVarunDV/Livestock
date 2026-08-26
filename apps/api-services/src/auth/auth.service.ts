import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

const ALLOWED_ROLES = new Set(['ADMIN', 'VETERINARIAN', 'TESTER', 'FARMER']);

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private normalizeRole(role?: string) {
    const normalized = (role || '').toUpperCase();
    if (!ALLOWED_ROLES.has(normalized)) {
      throw new BadRequestException('Invalid role');
    }
    return normalized;
  }

  async register(dto: any) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = this.normalizeRole(dto.role);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role,
        phone: dto.phone || null,
        department: dto.department || null,
      },
    });

    const normalizedRole = user.role.toLowerCase();
    const payload = { sub: user.id, email: user.email, role: normalizedRole };
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: normalizedRole,
      },
    };
  }

  async login(dto: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status && user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const normalizedRole = user.role.toLowerCase();
    const payload = { sub: user.id, email: user.email, role: normalizedRole };
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: normalizedRole,
      },
    };
  }
}
