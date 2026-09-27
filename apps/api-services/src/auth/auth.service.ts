import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { Actor } from '../common/actor';
import { permissionsForRole } from './permissions';
import { assertStrongPassword, BCRYPT_ROUNDS } from './password-policy';
import { LOGIN_LOCK_MINUTES, LOGIN_MAX_ATTEMPTS } from './jwt.config';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto';
import * as bcrypt from 'bcrypt';

// Used to keep response timing identical whether or not the account exists.
const DUMMY_HASH = '$2b$12$xwGVZ74TFJhCCSFhdaqNmeoaCBmoqFIfNEXd.7t3eeFnu0dfcSMSq';

type UserRecord = { id: string; email: string; name: string; role: string; tokenVersion: number; mustChangePassword: boolean };

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private audit: AuditService,
  ) {}

  private session(user: UserRecord) {
    const role = user.role.toLowerCase();
    const payload = { sub: user.id, email: user.email, role, tv: user.tokenVersion };
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
        permissions: permissionsForRole(user.role),
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  /**
   * Self-registration is disabled by default: official accounts are provisioned
   * by an administrator. When enabled, it can only ever create a FARMER account
   * awaiting administrator approval (the role in the request is ignored).
   */
  async register(dto: RegisterDto, ip: string | null) {
    if (process.env.ALLOW_SELF_REGISTRATION !== 'true') {
      throw new ForbiddenException('Self-registration is disabled. Please contact your district livestock office.');
    }
    assertStrongPassword(dto.password);
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        name: dto.name.trim(),
        role: 'FARMER',
        status: 'PENDING_APPROVAL',
        phone: dto.phone || null,
        passwordChangedAt: new Date(),
      },
    });
    await this.audit.record(
      { id: user.id, email, name: user.name, role: 'FARMER', ip },
      { action: 'SELF_REGISTERED', entity: 'USER', entityId: user.id, newValue: { email, status: user.status } },
    );
    return { message: 'Registration received. Your account will be activated after verification by an administrator.' };
  }

  async login(dto: LoginDto, ip: string | null) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const now = new Date();

    if (!user) {
      await bcrypt.compare(dto.password, DUMMY_HASH);
      await this.audit.record(
        { id: null, email, name: 'Unknown', role: 'ANONYMOUS', ip },
        { action: 'LOGIN_FAILED', entity: 'AUTH', newValue: { reason: 'unknown account' } },
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const actor: Actor = { id: user.id, email: user.email, name: user.name, role: user.role.toUpperCase(), ip };

    if (user.lockedUntil && user.lockedUntil > now) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
      await this.audit.record(actor, { action: 'LOGIN_BLOCKED_LOCKED', entity: 'AUTH', entityId: user.id });
      throw new UnauthorizedException(`Account temporarily locked after repeated failed sign-in attempts. Try again in ${minutes} minute(s).`);
    }

    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      const attempts = user.failedLoginAttempts + 1;
      const lock = attempts >= LOGIN_MAX_ATTEMPTS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: lock
          ? { failedLoginAttempts: 0, lockedUntil: new Date(now.getTime() + LOGIN_LOCK_MINUTES * 60000) }
          : { failedLoginAttempts: attempts },
      });
      await this.audit.record(actor, {
        action: lock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
        entity: 'AUTH',
        entityId: user.id,
        newValue: { attempts, reason: 'wrong password' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Checked only after the password so account status is not disclosed to guessers.
    if (user.status !== 'ACTIVE') {
      await this.audit.record(actor, { action: 'LOGIN_BLOCKED_INACTIVE', entity: 'AUTH', entityId: user.id, newValue: { status: user.status } });
      throw new UnauthorizedException(
        user.status === 'PENDING_APPROVAL' ? 'Account is awaiting administrator approval' : 'Account is not active',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now },
    });
    await this.audit.record(actor, { action: 'LOGIN', entity: 'AUTH', entityId: user.id });
    return this.session(updated);
  }

  async me(actor: Actor) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id ?? '' },
      select: {
        id: true, email: true, name: true, role: true, status: true, phone: true, department: true,
        lastLoginAt: true, passwordChangedAt: true, mustChangePassword: true, createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return { ...user, role: user.role.toLowerCase(), permissions: permissionsForRole(user.role) };
  }

  async changePassword(actor: Actor, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id ?? '' } });
    if (!user) throw new NotFoundException('User not found');
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      await this.audit.record(actor, { action: 'PASSWORD_CHANGE_FAILED', entity: 'USER', entityId: user.id });
      throw new BadRequestException('Current password is incorrect');
    }
    assertStrongPassword(dto.newPassword);
    if (await bcrypt.compare(dto.newPassword, user.passwordHash)) {
      throw new BadRequestException('New password must be different from the current password');
    }
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS),
        passwordChangedAt: new Date(),
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
    });
    await this.audit.record(actor, { action: 'PASSWORD_CHANGED', entity: 'USER', entityId: user.id });
    // Other sessions are revoked; hand this client a fresh token.
    return this.session(updated);
  }

  async logout(actor: Actor) {
    await this.audit.record(actor, { action: 'LOGOUT', entity: 'AUTH', entityId: actor.id });
    return { success: true };
  }

  async logoutAll(actor: Actor) {
    await this.prisma.user.update({ where: { id: actor.id ?? '' }, data: { tokenVersion: { increment: 1 } } });
    await this.audit.record(actor, { action: 'LOGOUT_ALL_SESSIONS', entity: 'AUTH', entityId: actor.id });
    return { success: true };
  }
}
