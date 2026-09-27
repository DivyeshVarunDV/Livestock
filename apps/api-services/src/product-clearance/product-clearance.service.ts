import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ComplianceService } from '../compliance/compliance.service';
import { Actor } from '../common/actor';

@Injectable()
export class ProductClearanceService {
  constructor(
    private prisma: PrismaService,
    private compliance: ComplianceService,
  ) {}

  private farmScope(actor: Actor) {
    return actor.role === 'FARMER' ? { ownerId: actor.id ?? '__none__' } : {};
  }

  private async assertAnimalVisible(actor: Actor, animalId: string) {
    const animal = await this.prisma.animal.findFirst({
      where: { id: animalId, ...(actor.role === 'FARMER' ? { farm: this.farmScope(actor) } : {}) },
      select: { id: true },
    });
    if (!animal) throw new NotFoundException(`Animal with ID ${animalId} not found`);
  }

  async findAll(actor: Actor, filters: { animalId?: string; farmerId?: string; status?: string }) {
    const where: any = {};
    if (filters.animalId) where.animalId = filters.animalId;
    if (filters.status) where.status = filters.status;
    const farmWhere: any = { ...this.farmScope(actor) };
    if (filters.farmerId) farmWhere.farmerId = filters.farmerId;
    if (Object.keys(farmWhere).length > 0) where.animal = { farm: farmWhere };

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

  async getByAnimal(actor: Actor, animalId: string) {
    await this.assertAnimalVisible(actor, animalId);
    return this.prisma.productClearance.findMany({
      where: { animalId },
      include: { relatedWithdrawal: true },
      orderBy: { productType: 'asc' },
    });
  }

  async getByFarmer(actor: Actor, farmerId: string) {
    const farm = await this.prisma.farm.findFirst({
      where: { farmerId, ...this.farmScope(actor) },
    });
    if (!farm) throw new NotFoundException(`Farm not found for farmer ID: ${farmerId}`);

    const now = new Date();
    const animals = await this.prisma.animal.findMany({
      where: { farmId: farm.id },
      include: {
        productClearances: { orderBy: { productType: 'asc' } },
        withdrawalRecords: {
          where: { withdrawalEndDate: { gt: now } },
          orderBy: { withdrawalEndDate: 'desc' },
        },
      },
    });

    return {
      farm: { id: farm.id, farmerId: farm.farmerId, name: farm.name, ownerName: farm.ownerName, fullName: farm.fullName },
      animals: animals.map((animal) => {
        const clearanceMap: Record<string, any> = {};
        for (const c of animal.productClearances) {
          clearanceMap[c.productType] = {
            status: c.status,
            reason: c.reason,
            restrictionStart: c.restrictionStart,
            restrictionEnd: c.restrictionEnd,
          };
        }

        // Live withdrawal records are authoritative over cached clearance rows.
        for (const w of animal.withdrawalRecords) {
          const current = clearanceMap[w.productType];
          if (!current || current.status === 'CLEARED' || new Date(current.restrictionEnd ?? 0) < w.withdrawalEndDate) {
            clearanceMap[w.productType] = {
              status: 'RESTRICTED',
              reason: `Active withdrawal: ${w.medicine}`,
              restrictionStart: w.treatmentDate,
              restrictionEnd: w.withdrawalEndDate,
            };
          }
        }
        // A cached RESTRICTED row whose withdrawal has expired is reported as cleared.
        for (const [type, c] of Object.entries(clearanceMap)) {
          if (c.status === 'RESTRICTED' && !animal.withdrawalRecords.some((w) => w.productType === type)) {
            clearanceMap[type] = { status: 'CLEARED', reason: null, restrictionStart: null, restrictionEnd: null };
          }
        }

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
          currentStatus: animal.currentStatus,
          clearances: clearanceMap,
        };
      }),
    };
  }

  async refreshClearance(actor: Actor, animalId: string) {
    await this.compliance.recomputeAnimal(animalId, actor);
    return this.prisma.productClearance.findMany({ where: { animalId }, orderBy: { productType: 'asc' } });
  }

  async checkClearance(actor: Actor, animalId: string, productType: string) {
    await this.assertAnimalVisible(actor, animalId);
    return this.compliance.checkClearance(animalId, productType);
  }
}
