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
        animal: {
          include: {
            withdrawalRecords: {
              where: { status: 'RESTRICTED' },
              orderBy: { withdrawalEndDate: 'desc' },
            },
            treatments: {
              orderBy: { administrationDate: 'desc' },
              take: 3,
            },
            vaccinations: {
              orderBy: { vaccinationDate: 'desc' },
              take: 3,
            },
            healthRecords: {
              orderBy: { date: 'desc' },
              take: 3,
            },
          },
        },
        approvedBy: { select: { id: true, name: true, email: true } },
        currentOwner: { select: { id: true, name: true, email: true } },
        newOwner: { select: { id: true, name: true, email: true } },
        fromFarm: { select: { id: true, farmerId: true, name: true, ownerName: true, mobileNumber: true, district: true, village: true } },
        toFarm: { select: { id: true, farmerId: true, name: true, ownerName: true, mobileNumber: true, district: true, village: true } },
      },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.ownershipTransfer.findUnique({
      where: { id },
      include: {
        animal: {
          include: {
            withdrawalRecords: true,
            treatments: true,
            vaccinations: true,
            healthRecords: true,
            productClearances: true,
          },
        },
        approvedBy: { select: { id: true, name: true, email: true } },
        currentOwner: { select: { id: true, name: true, email: true } },
        newOwner: { select: { id: true, name: true, email: true } },
        fromFarm: { select: { id: true, farmerId: true, name: true, ownerName: true, mobileNumber: true, district: true } },
        toFarm: { select: { id: true, farmerId: true, name: true, ownerName: true, mobileNumber: true, district: true } },
      },
    });
    if (!record) throw new NotFoundException('Transfer record not found');
    return record;
  }

  async getAnimalsByFarmerId(farmerId: string) {
    const farm = await this.prisma.farm.findFirst({
      where: {
        OR: [
          { farmerId: { equals: farmerId } },
          { id: { equals: farmerId } },
        ],
      },
      include: {
        animals: {
          include: {
            withdrawalRecords: {
              where: { status: 'RESTRICTED' },
              orderBy: { withdrawalEndDate: 'desc' },
            },
            treatments: {
              orderBy: { administrationDate: 'desc' },
              take: 3,
            },
            vaccinations: {
              orderBy: { vaccinationDate: 'desc' },
              take: 3,
            },
            healthRecords: {
              orderBy: { date: 'desc' },
              take: 3,
            },
          },
        },
      },
    });

    if (!farm) {
      throw new NotFoundException(`No farm found for Farmer ID: ${farmerId}`);
    }

    return farm;
  }

  async create(dto: any) {
    const animal = await this.prisma.animal.findUnique({
      where: { id: dto.animalId },
      include: { farm: true },
    });
    if (!animal) {
      throw new NotFoundException(`Animal with ID ${dto.animalId} not found`);
    }

    let fromFarmId = dto.fromFarmId || animal.farmId;
    let fromFarm: any = animal.farm;
    if (!fromFarm && fromFarmId) {
      fromFarm = await this.prisma.farm.findUnique({ where: { id: fromFarmId } });
    }

    let toFarmId = dto.toFarmId;
    let toFarm: any = null;
    if (dto.toFarmerId && !toFarmId) {
      toFarm = await this.prisma.farm.findFirst({
        where: {
          OR: [
            { farmerId: dto.toFarmerId },
            { id: dto.toFarmerId },
          ],
        },
      });
      if (toFarm) {
        toFarmId = toFarm.id;
      }
    } else if (toFarmId) {
      toFarm = await this.prisma.farm.findUnique({ where: { id: toFarmId } });
    }

    if (!toFarmId) {
      throw new BadRequestException('Destination Farm / Farmer is required.');
    }

    if (fromFarmId === toFarmId) {
      throw new BadRequestException('Source and Destination farms cannot be the same.');
    }

    const count = await this.prisma.ownershipTransfer.count();
    const transferCode = `TRF${String(count + 1).padStart(3, '0')}`;

    const created = await this.prisma.ownershipTransfer.create({
      data: {
        transferCode,
        animalId: dto.animalId,
        currentOwnerId: fromFarm?.ownerId || dto.currentOwnerId || null,
        newOwnerId: toFarm?.ownerId || dto.newOwnerId || null,
        fromFarmId,
        toFarmId,
        requestDate: dto.requestDate ? new Date(dto.requestDate) : new Date(),
        reason: dto.reason || null,
        notes: dto.notes || null,
        status: 'PENDING',
      },
      include: {
        animal: true,
        fromFarm: true,
        toFarm: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userName: dto.requestedByName || 'Veterinarian',
        role: 'VETERINARIAN',
        action: 'Ownership Transfer Requested',
        entity: 'OWNERSHIP_TRANSFER',
        entityId: created.id,
        newValue: JSON.stringify({
          transferCode,
          animal: animal.name,
          animalCode: animal.animalCode || animal.tagNumber,
          from: fromFarm?.farmerId || fromFarm?.name,
          to: toFarm?.farmerId || toFarm?.name,
          reason: dto.reason,
        }),
      },
    });

    return created;
  }

  async update(id: string, dto: any) {
    const existing = await this.prisma.ownershipTransfer.findUnique({
      where: { id },
      include: { animal: true, fromFarm: true, toFarm: true },
    });
    if (!existing) {
      throw new NotFoundException('Transfer record not found');
    }

    const nextStatus = dto.status || existing.status;
    const now = new Date();

    const transfer = await this.prisma.ownershipTransfer.update({
      where: { id },
      data: {
        status: nextStatus,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        reason: dto.reason !== undefined ? dto.reason : existing.reason,
        rejectionReason: dto.rejectionReason !== undefined ? dto.rejectionReason : existing.rejectionReason,
        approvedById: dto.approvedById || (nextStatus === 'APPROVED' ? dto.userId : undefined),
        approvalDate: nextStatus === 'APPROVED' ? now : existing.approvalDate,
        resolvedDate: nextStatus !== 'PENDING' ? now : existing.resolvedDate,
      },
    });

    if (nextStatus === 'APPROVED' && existing.status !== 'APPROVED') {
      const targetFarmId = transfer.toFarmId;
      if (!targetFarmId) {
        throw new BadRequestException('Approved transfer requires a valid destination farm.');
      }

      await this.prisma.animal.update({
        where: { id: transfer.animalId },
        data: {
          farmId: targetFarmId,
          currentStatus: 'ACTIVE',
        },
      });

      await this.prisma.auditLog.create({
        data: {
          userId: dto.approvedById || dto.userId || null,
          userName: dto.userName || 'System Administrator',
          role: 'ADMIN',
          action: 'Ownership Transfer Approved',
          entity: 'OWNERSHIP_TRANSFER',
          entityId: transfer.id,
          oldValue: JSON.stringify({ farmId: existing.fromFarmId, farmName: existing.fromFarm?.name }),
          newValue: JSON.stringify({ farmId: transfer.toFarmId, farmName: existing.toFarm?.name }),
        },
      });
    } else if (nextStatus === 'REJECTED' && existing.status !== 'REJECTED') {
      await this.prisma.auditLog.create({
        data: {
          userId: dto.userId || null,
          userName: dto.userName || 'System Administrator',
          role: 'ADMIN',
          action: 'Ownership Transfer Rejected',
          entity: 'OWNERSHIP_TRANSFER',
          entityId: transfer.id,
          newValue: JSON.stringify({ reason: dto.rejectionReason || 'Transfer rejected by Admin' }),
        },
      });
    }

    return this.findOne(transfer.id);
  }

  async remove(id: string) {
    return this.prisma.ownershipTransfer.delete({ where: { id } });
  }
}
