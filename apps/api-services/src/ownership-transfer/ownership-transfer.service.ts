import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OwnershipTransferService {
  constructor(private prisma: PrismaService) {}

  private buildTransferCode(id: string) {
    return `TRF${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  }

  async findAll() {
    return this.prisma.ownershipTransfer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        animal: true,
        currentOwner: { select: { id: true, name: true, email: true } },
        newOwner: { select: { id: true, name: true, email: true } },
        fromFarm: { select: { id: true, farmerId: true, name: true, ownerName: true } },
        toFarm: { select: { id: true, farmerId: true, name: true, ownerName: true } },
      },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.ownershipTransfer.findUnique({
      where: { id },
      include: {
        animal: true,
        currentOwner: { select: { id: true, name: true, email: true } },
        newOwner: { select: { id: true, name: true, email: true } },
        fromFarm: { select: { id: true, farmerId: true, name: true, ownerName: true } },
        toFarm: { select: { id: true, farmerId: true, name: true, ownerName: true } },
      },
    });
    if (!record) throw new NotFoundException('Record not found');
    return record;
  }

  async create(dto: any) {
    const created = await this.prisma.ownershipTransfer.create({
      data: {
        animalId: dto.animalId,
        currentOwnerId: dto.currentOwnerId,
        newOwnerId: dto.newOwnerId,
        fromFarmId: dto.fromFarmId || null,
        toFarmId: dto.toFarmId || null,
        requestDate: dto.requestDate ? new Date(dto.requestDate) : new Date(),
        reason: dto.reason || null,
        status: dto.status || 'PENDING',
      },
    });

    return this.prisma.ownershipTransfer.update({
      where: { id: created.id },
      data: {
        transferCode: dto.transferCode || this.buildTransferCode(created.id),
      },
    });
  }

  async update(id: string, dto: any) {
    const existing = await this.prisma.ownershipTransfer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    if (dto.status === 'APPROVED' && dto.approvedById && dto.approvedById === existing.currentOwnerId) {
      throw new BadRequestException('Current owner cannot approve their own transfer.');
    }

    const transfer = await this.prisma.ownershipTransfer.update({
      where: { id },
      data: {
        currentOwnerId: dto.currentOwnerId,
        newOwnerId: dto.newOwnerId,
        fromFarmId: dto.fromFarmId,
        toFarmId: dto.toFarmId,
        reason: dto.reason,
        status: dto.status,
        approvedById: dto.approvedById,
        approvalDate: dto.status === 'APPROVED' ? new Date() : dto.approvalDate ? new Date(dto.approvalDate) : undefined,
        resolvedDate: dto.status && dto.status !== 'PENDING' ? new Date() : dto.resolvedDate ? new Date(dto.resolvedDate) : undefined,
      },
    });

    if (dto.status === 'APPROVED') {
      const targetFarmId = transfer.toFarmId || dto.toFarmId;
      if (!targetFarmId) {
        throw new BadRequestException('Approved transfer requires a destination farm.');
      }

      await this.prisma.animal.update({
        where: { id: transfer.animalId },
        data: {
          farmId: targetFarmId,
          currentStatus: 'TRANSFERRED',
        },
      });

      await this.prisma.auditLog.create({
        data: {
          userId: dto.approvedById || null,
          action: 'Ownership Transfer Approved',
          entity: 'OWNERSHIP_TRANSFER',
          entityId: transfer.id,
          oldValue: JSON.stringify({ fromFarmId: existing.fromFarmId, currentOwnerId: existing.currentOwnerId }),
          newValue: JSON.stringify({ toFarmId: transfer.toFarmId, newOwnerId: transfer.newOwnerId }),
        },
      });
    }

    return this.findOne(transfer.id);
  }

  async remove(id: string) {
    return this.prisma.ownershipTransfer.delete({ where: { id } });
  }
}
