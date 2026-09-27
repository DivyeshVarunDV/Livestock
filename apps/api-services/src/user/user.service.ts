import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { Actor } from '../common/actor';
import { assertStrongPassword, BCRYPT_ROUNDS } from '../auth/password-policy';
import { CreateUserDto, UpdateUserDto } from './dto';
import * as bcrypt from 'bcrypt';

const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  phone: true,
  department: true,
  lastLoginAt: true,
  lockedUntil: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(query?: { search?: string; role?: string; status?: string }) {
    const where: any = {};
    if (query?.role && query.role !== 'ALL') {
      where.role = query.role;
    }
    if (query?.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search } },
        { email: { contains: query.search } },
      ];
    }
    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: PUBLIC_USER_FIELDS,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_FIELDS });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(actor: Actor, dto: CreateUserDto) {
    assertStrongPassword(dto.password);
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        name: dto.name,
        role: dto.role,
        status: dto.status || 'ACTIVE',
        phone: dto.phone || null,
        department: dto.department || null,
        passwordChangedAt: new Date(),
        // The administrator knows this password, so the user must replace it.
        mustChangePassword: true,
      },
      select: PUBLIC_USER_FIELDS,
    });
    await this.audit.record(actor, {
      action: 'USER_CREATED',
      entity: 'USER',
      entityId: user.id,
      newValue: { email: user.email, name: user.name, role: user.role, status: user.status },
    });
    return user;
  }

  private async assertNotLastActiveAdmin(userId: string) {
    const others = await this.prisma.user.count({
      where: { role: 'ADMIN', status: 'ACTIVE', id: { not: userId } },
    });
    if (others === 0) {
      throw new BadRequestException('At least one active administrator account must remain.');
    }
  }

  async update(actor: Actor, id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    const roleChanged = dto.role !== undefined && dto.role !== existing.role;
    const statusChanged = dto.status !== undefined && dto.status !== existing.status;
    const losesAdmin =
      existing.role === 'ADMIN' && existing.status === 'ACTIVE' &&
      ((roleChanged && dto.role !== 'ADMIN') || (statusChanged && dto.status !== 'ACTIVE'));

    if (actor.id === id && (roleChanged || (statusChanged && dto.status !== 'ACTIVE'))) {
      throw new BadRequestException('You cannot change your own role or deactivate your own account.');
    }
    if (losesAdmin) await this.assertNotLastActiveAdmin(id);

    const data: any = {};
    for (const key of ['email', 'name', 'role', 'status', 'phone', 'department'] as const) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    // Any change in privileges or status revokes the user's existing sessions.
    if (roleChanged || statusChanged) data.tokenVersion = { increment: 1 };

    const updated = await this.prisma.user.update({ where: { id }, data, select: PUBLIC_USER_FIELDS });

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const key of Object.keys(data)) {
      if (key === 'tokenVersion') continue;
      before[key] = (existing as any)[key];
      after[key] = (updated as any)[key];
    }
    await this.audit.record(actor, {
      action: roleChanged ? 'USER_ROLE_CHANGED' : statusChanged ? 'USER_STATUS_CHANGED' : 'USER_UPDATED',
      entity: 'USER',
      entityId: id,
      oldValue: before,
      newValue: after,
    });
    return updated;
  }

  async resetPassword(actor: Actor, id: string, newPassword: string) {
    assertStrongPassword(newPassword);
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
        passwordChangedAt: new Date(),
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        tokenVersion: { increment: 1 },
      },
      select: { id: true, email: true },
    });
    await this.audit.record(actor, { action: 'USER_PASSWORD_RESET', entity: 'USER', entityId: id, newValue: { email: existing.email } });
    return updated;
  }

  async unlock(actor: Actor, id: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
      select: PUBLIC_USER_FIELDS,
    });
    await this.audit.record(actor, { action: 'USER_UNLOCKED', entity: 'USER', entityId: id });
    return updated;
  }

  /**
   * Accounts that own records or have acted in the system are never deleted,
   * because that would break attribution in the official record. They must be
   * deactivated instead.
   */
  async remove(actor: Actor, id: string) {
    if (actor.id === id) {
      throw new BadRequestException('You cannot delete your own account.');
    }
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { farms: true, ownershipTransfersAsCurrent: true, ownershipTransfersAsNew: true, approvedTransfers: true },
        },
      },
    });
    if (!existing) throw new NotFoundException('User not found');
    if (existing.role === 'ADMIN' && existing.status === 'ACTIVE') await this.assertNotLastActiveAdmin(id);

    const linked = Object.values(existing._count).reduce((a, b) => a + b, 0);
    const activity = await this.prisma.auditLog.count({
      where: { userId: id, action: { notIn: ['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'LOGIN_BLOCKED_LOCKED'] } },
    });
    if (linked > 0 || activity > 0 || existing.lastLoginAt) {
      throw new ConflictException(
        'This account has activity or linked records in the official register and cannot be deleted. Set its status to INACTIVE instead.',
      );
    }

    await this.prisma.user.delete({ where: { id } });
    await this.audit.record(actor, {
      action: 'USER_DELETED',
      entity: 'USER',
      entityId: id,
      oldValue: { email: existing.email, name: existing.name, role: existing.role, status: existing.status },
    });
    return { success: true };
  }
}
