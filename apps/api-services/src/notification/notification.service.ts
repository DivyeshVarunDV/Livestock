import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Actor } from '../common/actor';
import { normalizeRole } from '../auth/permissions';

export interface NotifyInput {
  title: string;
  message: string;
  type?: 'GENERAL' | 'ALERT' | 'WARNING' | 'INFO';
  entityId?: string | null;
  /** Deliver to one user. */
  userId?: string | null;
  /** Deliver to every active user holding one of these roles. */
  roles?: string[];
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  /** Rows visible to the actor: their own, plus legacy un-addressed broadcasts. */
  private visibleTo(actor: Actor) {
    return {
      OR: [
        { userId: actor.id },
        { userId: null, targetRole: null },
        { userId: null, targetRole: actor.role },
      ],
    };
  }

  async findAll(actor: Actor) {
    return this.prisma.notification.findMany({
      where: this.visibleTo(actor),
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Internal delivery used by business services. Role broadcasts are fanned
   * out to one row per recipient so that read state is per user.
   * Never throws into the calling business flow.
   */
  async notify(input: NotifyInput) {
    try {
      const recipients = new Set<string>();
      if (input.userId) recipients.add(input.userId);
      if (input.roles && input.roles.length > 0) {
        const users = await this.prisma.user.findMany({
          where: { role: { in: input.roles.map((r) => r.toUpperCase()) }, status: 'ACTIVE' },
          select: { id: true },
        });
        users.forEach((u) => recipients.add(u.id));
      }
      if (recipients.size === 0) return 0;
      await this.prisma.notification.createMany({
        data: [...recipients].map((userId) => ({
          userId,
          title: input.title,
          message: input.message,
          type: input.type || 'GENERAL',
          entityId: input.entityId || null,
        })),
      });
      return recipients.size;
    } catch (err) {
      this.logger.error(`Failed to deliver notification "${input.title}": ${(err as Error).message}`);
      return 0;
    }
  }

  /** Administrator broadcast (to a user, a role, or everyone). */
  async create(dto: any) {
    const title = String(dto?.title || '').trim();
    const message = String(dto?.message || '').trim();
    if (!title || !message) throw new BadRequestException('title and message are required');
    const type = ['GENERAL', 'ALERT', 'WARNING', 'INFO'].includes(dto?.type) ? dto.type : 'GENERAL';
    const role = dto?.targetRole ? normalizeRole(dto.targetRole) : null;
    const delivered = await this.notify({
      title,
      message,
      type,
      entityId: dto?.entityId || null,
      userId: dto?.userId || null,
      roles: dto?.userId ? undefined : role ? [role] : ['ADMIN', 'VETERINARIAN', 'TESTER', 'FARMER'],
    });
    return { delivered };
  }

  private async findVisible(actor: Actor, id: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, ...this.visibleTo(actor) } });
    if (!n) throw new NotFoundException('Notification not found');
    return n;
  }

  async markRead(actor: Actor, id: string) {
    await this.findVisible(actor, id);
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async markAllRead(actor: Actor) {
    return this.prisma.notification.updateMany({
      where: { ...this.visibleTo(actor), read: false },
      data: { read: true },
    });
  }

  async remove(actor: Actor, id: string) {
    const n = await this.findVisible(actor, id);
    // Shared legacy broadcasts may only be removed by an administrator.
    if (n.userId !== actor.id && actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only an administrator can remove a shared broadcast.');
    }
    await this.prisma.notification.delete({ where: { id } });
    return { success: true };
  }
}
