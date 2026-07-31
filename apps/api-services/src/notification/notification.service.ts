import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId?: string) {
    return this.prisma.notification.findMany({
      where: userId ? { OR: [{ userId }, { userId: null }] } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async create(dto: any) {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId || null,
        title: dto.title,
        message: dto.message,
        type: dto.type || 'GENERAL',
        read: false,
        entityId: dto.entityId || null,
      },
    });
  }

  async markRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllRead(userId?: string) {
    return this.prisma.notification.updateMany({
      where: userId ? { OR: [{ userId }, { userId: null }], read: false } : { read: false },
      data: { read: true },
    });
  }

  async remove(id: string) {
    return this.prisma.notification.delete({
      where: { id },
    });
  }
}
