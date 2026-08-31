import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ProductClearanceService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: { animalId?: string; farmerId?: string; status?: string }) {
    const where: any = {};
    if (filters.animalId) where.animalId = filters.animalId;
    if (filters.status) where.status = filters.status;
    if (filters.farmerId) {
      where.animal = { farm: { farmerId: filters.farmerId } };
    }

    return this.prisma.productClearance.findMany({
      where,
      include: {
        animal: {
          select: { id: true, animalCode: true, name: true, tagNumber: true, species: true, breed: true, mrlStatus: true,
            farm: { select: { id: true, farmerId: true, name: true, ownerName: true } },
          },
        },
        relatedWithdrawal: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByAnimal(animalId: string) {
    return this.prisma.productClearance.findMany({
      where: { animalId },
      include: { relatedWithdrawal: true },
      orderBy: { productType: 'asc' },
    });
  }

  async getByFarmer(farmerId: string) {
    const farm = await this.prisma.farm.findFirst({
      where: { farmerId },
    });
    if (!farm) throw new NotFoundException(`Farm not found for farmer ID: ${farmerId}`);

    const animals = await this.prisma.animal.findMany({
      where: { farmId: farm.id },
      include: {
        productClearances: { orderBy: { productType: 'asc' } },
        withdrawalRecords: {
          where: { status: 'RESTRICTED' },
          orderBy: { withdrawalEndDate: 'desc' },
        },
      },
    });

    return {
      farm: { id: farm.id, farmerId: farm.farmerId, name: farm.name, ownerName: farm.ownerName, fullName: farm.fullName },
      animals: animals.map((animal) => {
        // Build clearance map per product type
        const clearanceMap: Record<string, any> = {};
        for (const c of animal.productClearances) {
          clearanceMap[c.productType] = {
            status: c.status,
            reason: c.reason,
            restrictionStart: c.restrictionStart,
            restrictionEnd: c.restrictionEnd,
          };
        }

        // Also derive clearance from active withdrawal records if no explicit clearance exists
        for (const w of animal.withdrawalRecords) {
          if (!clearanceMap[w.productType]) {
            clearanceMap[w.productType] = {
              status: 'RESTRICTED',
              reason: `Active withdrawal: ${w.medicine}`,
              restrictionStart: w.treatmentDate,
              restrictionEnd: w.withdrawalEndDate,
            };
          }
        }

        // Default products if none exist
        if (Object.keys(clearanceMap).length === 0) {
          clearanceMap['MILK'] = { status: 'CLEARED', reason: null, restrictionStart: null, restrictionEnd: null };
        }

        return {
          id: animal.id,
          animalCode: animal.animalCode,
          tagNumber: animal.tagNumber,
          name: animal.name,
          species: animal.species,
          breed: animal.breed,
          mrlStatus: animal.mrlStatus,
          clearances: clearanceMap,
        };
      }),
    };
  }

  async refreshClearance(animalId: string) {
    const animal = await this.prisma.animal.findUnique({ where: { id: animalId } });
    if (!animal) throw new NotFoundException(`Animal with ID ${animalId} not found`);

    const withdrawals = await this.prisma.withdrawalRecord.findMany({
      where: { animalId },
    });

    const productTypes = [...new Set(withdrawals.map((w) => w.productType))];
    if (productTypes.length === 0) productTypes.push('MILK');

    const now = new Date();
    const updatedClearances = [];

    for (const productType of productTypes) {
      const activeWithdrawals = withdrawals.filter(
        (w) => w.productType === productType && new Date(w.withdrawalEndDate) > now,
      );

      const status = activeWithdrawals.length > 0 ? 'RESTRICTED' : 'CLEARED';
      const reason = activeWithdrawals.length > 0
        ? `Active withdrawal: ${activeWithdrawals.map((w) => w.medicine).join(', ')}`
        : null;
      const restrictionEnd = activeWithdrawals.length > 0
        ? new Date(Math.max(...activeWithdrawals.map((w) => new Date(w.withdrawalEndDate).getTime())))
        : null;
      const restrictionStart = activeWithdrawals.length > 0
        ? new Date(Math.min(...activeWithdrawals.map((w) => new Date(w.treatmentDate).getTime())))
        : null;

      const existing = await this.prisma.productClearance.findFirst({
        where: { animalId, productType },
      });

      if (existing) {
        const updated = await this.prisma.productClearance.update({
          where: { id: existing.id },
          data: { status, reason, restrictionStart, restrictionEnd },
        });
        updatedClearances.push(updated);
      } else {
        const created = await this.prisma.productClearance.create({
          data: { animalId, productType, status, reason, restrictionStart, restrictionEnd },
        });
        updatedClearances.push(created);
      }
    }

    return updatedClearances;
  }

  async checkClearance(animalId: string, productType: string) {
    // First try explicit clearance record
    const clearance = await this.prisma.productClearance.findFirst({
      where: { animalId, productType },
    });

    if (clearance) {
      return {
        cleared: clearance.status === 'CLEARED',
        status: clearance.status,
        reason: clearance.reason,
        restrictionEnd: clearance.restrictionEnd,
      };
    }

    // Fall back to withdrawal records
    const now = new Date();
    const activeWithdrawal = await this.prisma.withdrawalRecord.findFirst({
      where: {
        animalId,
        productType,
        withdrawalEndDate: { gt: now },
        status: 'RESTRICTED',
      },
    });

    if (activeWithdrawal) {
      return {
        cleared: false,
        status: 'RESTRICTED',
        reason: `Active withdrawal: ${activeWithdrawal.medicine}`,
        restrictionEnd: activeWithdrawal.withdrawalEndDate,
      };
    }

    return { cleared: true, status: 'CLEARED', reason: null, restrictionEnd: null };
  }
}
