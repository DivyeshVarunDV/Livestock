import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { role?: string; entity?: string; action?: string }) {
    const where: any = {};
    if (filters?.role && filters.role !== 'ALL') where.role = filters.role;
    if (filters?.entity && filters.entity !== 'ALL') where.entity = filters.entity;
    if (filters?.action && filters.action !== 'ALL') where.action = filters.action;

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async create(dto: any) {
    return this.prisma.auditLog.create({
      data: {
        userId: dto.userId || null,
        userEmail: dto.userEmail || 'system@agrishield.io',
        userName: dto.userName || 'System Auto',
        role: dto.role || 'ADMIN',
        action: dto.action || 'UPDATE',
        entity: dto.entity || 'SYSTEM',
        entityId: dto.entityId || null,
        oldValue: dto.oldValue || null,
        newValue: dto.newValue || null,
        ipAddress: dto.ipAddress || '127.0.0.1',
      },
    });
  }
}
