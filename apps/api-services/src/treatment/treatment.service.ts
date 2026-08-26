import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class TreatmentService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService
  ) {}

  async findAll() {
    return this.prisma.treatment.findMany({
      include: {
        animal: {
          select: {
            id: true,
            animalCode: true,
            name: true,
            tagNumber: true,
            species: true,
            farm: { select: { name: true, farmerId: true } },
          },
        },
        withdrawalRecords: {
          orderBy: { withdrawalEndDate: 'desc' },
        },
        amuRecords: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { administrationDate: 'desc' },
    });
  }

  async findByAnimal(animalId: string) {
    return this.prisma.treatment.findMany({
      where: { animalId },
      include: {
        withdrawalRecords: {
          orderBy: { withdrawalEndDate: 'desc' },
        },
        amuRecords: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { administrationDate: 'desc' },
    });
  }

  async create(dto: any) {
    const adminDate = dto.administrationDate
      ? new Date(dto.administrationDate)
      : new Date();

    const animal = await this.prisma.animal.findUnique({ where: { id: dto.animalId } });
    if (!animal) {
      throw new NotFoundException('Animal not found');
    }

    let withdrawalPeriod = Number(dto.withdrawalPeriod || 0);
    if (!withdrawalPeriod && dto.drugName && animal.species) {
      const rule = await this.prisma.mrlRule.findFirst({
        where: {
          drugName: dto.drugName,
          species: animal.species,
        },
      });
      if (rule) {
        withdrawalPeriod = rule.withdrawalPeriod;
      }
    }

    const withdrawalCompletionDate = new Date(adminDate);
    withdrawalCompletionDate.setDate(
      withdrawalCompletionDate.getDate() + withdrawalPeriod,
    );

    if (dto.inventoryId) {
      const inventory = await this.prisma.inventory.findUnique({
        where: { id: dto.inventoryId },
      });
      if (inventory && inventory.stock > 0) {
        const newStock = inventory.stock - 1;
        await this.prisma.inventory.update({
          where: { id: dto.inventoryId },
          data: { stock: newStock },
        });
        if (newStock <= inventory.minimumStock) {
          await this.prisma.notification.create({
            data: {
              title: 'Low Stock Alert',
              message: `Low stock alert: ${inventory.medicineName} is running low (${newStock} remaining)`,
              type: 'WARNING',
            },
          });
        }
      } else {
        console.warn(`Warning: Inventory item ${dto.inventoryId} not found or out of stock.`);
      }
    }

    const treatment = await this.prisma.treatment.create({
      data: {
        animalId: dto.animalId,
        disease: dto.disease || null,
        drugName: dto.drugName,
        activeIngredient: dto.activeIngredient || null,
        dosage: dto.dosage,
        route: dto.route || null,
        reason: dto.reason || null,
        notes: dto.notes || null,
        followUpRequired: Boolean(dto.followUpRequired),
        treatmentStartDate: dto.treatmentStartDate ? new Date(dto.treatmentStartDate) : adminDate,
        treatmentEndDate: dto.treatmentEndDate ? new Date(dto.treatmentEndDate) : null,
        administrationDate: adminDate,
        withdrawalPeriod,
        withdrawalCompletionDate,
        veterinarianId: dto.veterinarianId || null,
        veterinarianName: dto.veterinarianName || 'System Vet',
      },
    });

    const withdrawalProducts = Array.isArray(dto.productTypes) && dto.productTypes.length > 0
      ? dto.productTypes
      : [dto.productType || 'MILK'];

    for (const productType of withdrawalProducts) {
      await this.prisma.withdrawalRecord.create({
        data: {
          withdrawalCode: dto.withdrawalCode || null,
          treatmentId: treatment.id,
          animalId: dto.animalId,
          productType,
          medicine: dto.drugName,
          treatmentDate: adminDate,
          withdrawalPeriod,
          withdrawalEndDate: withdrawalCompletionDate,
          status: withdrawalPeriod > 0 ? 'RESTRICTED' : 'WITHDRAWAL_COMPLETED',
          followUpRequired: Boolean(dto.followUpRequired),
          notes: dto.notes || null,
        },
      });
    }

    if (dto.isAntimicrobial || dto.recordAmu) {
      await this.prisma.amuRecord.create({
        data: {
          amuCode: dto.amuCode || null,
          animalId: dto.animalId,
          treatmentId: treatment.id,
          medicine: dto.drugName,
          activeIngredient: dto.activeIngredient || null,
          dosage: dto.dosage,
          route: dto.route || null,
          startDate: dto.treatmentStartDate ? new Date(dto.treatmentStartDate) : adminDate,
          endDate: dto.treatmentEndDate ? new Date(dto.treatmentEndDate) : null,
          reason: dto.reason || null,
          veterinarianId: dto.veterinarianId || null,
          veterinarianName: dto.veterinarianName || 'System Vet',
        },
      });
    }

    await this.updateAnimalMrlStatus(dto.animalId, dto.veterinarianName);

    await this.prisma.auditLog.create({
      data: {
        userName: dto.veterinarianName || 'System Auto',
        role: 'VETERINARIAN',
        action: 'Treatment Created',
        entity: 'TREATMENT',
        entityId: treatment.id,
        newValue: JSON.stringify({ drug: dto.drugName, dosage: dto.dosage, productTypes: withdrawalProducts })
      }
    });

    if (withdrawalPeriod > 0) {
      await this.prisma.auditLog.create({
        data: {
          userName: dto.veterinarianName || 'System Auto',
          role: 'VETERINARIAN',
          action: 'Withdrawal Started',
          entity: 'TREATMENT',
          entityId: treatment.id,
          newValue: JSON.stringify({ drug: dto.drugName, duration: `${withdrawalPeriod} days`, productTypes: withdrawalProducts })
        }
      });
    }

    await this.ledgerService.appendToLedger('CREATE_TREATMENT', treatment.id, treatment);

    return treatment;
  }

  async remove(id: string) {
    const treatment = await this.prisma.treatment.findUnique({ where: { id } });
    if (!treatment) throw new NotFoundException('Treatment not found');

    await this.prisma.withdrawalRecord.deleteMany({ where: { treatmentId: id } });
    await this.prisma.amuRecord.deleteMany({ where: { treatmentId: id } });
    await this.prisma.treatment.delete({ where: { id } });
    await this.updateAnimalMrlStatus(treatment.animalId, 'System Auto');
    return { success: true };
  }

  async updateAnimalMrlStatus(animalId: string, userName: string = 'System Auto') {
    const now = new Date();
    const animal = await this.prisma.animal.findUnique({ where: { id: animalId } });
    if (!animal) return;

    const previousMrlStatus = animal.mrlStatus;

    const withdrawals = await this.prisma.withdrawalRecord.findMany({
      where: { animalId },
      orderBy: { withdrawalEndDate: 'desc' },
    });

    if (withdrawals.length === 0) {
      await this.prisma.animal.update({
        where: { id: animalId },
        data: { mrlStatus: 'CLEARED', status: 'HEALTHY' },
      });
      if (previousMrlStatus !== 'CLEARED') {
        await this.prisma.auditLog.create({
          data: {
            userName,
            action: 'Withdrawal Cleared',
            entity: 'ANIMAL',
            entityId: animalId,
            oldValue: previousMrlStatus,
            newValue: 'CLEARED'
          }
        });
      }
      return;
    }

    let latestCompletion = new Date(0);
    for (const record of withdrawals) {
      const compDate = new Date(record.withdrawalEndDate);
      if (compDate > latestCompletion) {
        latestCompletion = compDate;
      }
      const nextStatus = compDate > now ? 'RESTRICTED' : 'WITHDRAWAL_COMPLETED';
      if (record.status !== nextStatus) {
        await this.prisma.withdrawalRecord.update({
          where: { id: record.id },
          data: { status: nextStatus },
        });
      }
    }

    let mrlStatus = 'CLEARED';
    let animalStatus = 'HEALTHY';

    if (latestCompletion > now) {
      animalStatus = 'UNDER_TREATMENT';
      const diffMs = latestCompletion.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays <= 3) {
        mrlStatus = 'CLEARING_SOON';
      } else {
        mrlStatus = 'DO_NOT_SELL';
      }
    }

    await this.prisma.animal.update({
      where: { id: animalId },
      data: { mrlStatus, status: animalStatus },
    });

    if (previousMrlStatus !== mrlStatus) {
      if (mrlStatus === 'CLEARED') {
        await this.prisma.auditLog.create({
          data: {
            userName,
            action: 'Withdrawal Cleared',
            entity: 'ANIMAL',
            entityId: animalId,
            oldValue: previousMrlStatus,
            newValue: mrlStatus
          }
        });
      } else {
        await this.prisma.auditLog.create({
          data: {
            userName,
            action: 'MRL Status Changed',
            entity: 'ANIMAL',
            entityId: animalId,
            oldValue: previousMrlStatus,
            newValue: mrlStatus
          }
        });
      }
    }
  }

  async updateAnimalMrlStatuses() {
    const animals = await this.prisma.animal.findMany({
      where: { mrlStatus: { not: 'CLEARED' } },
    });

    for (const animal of animals) {
      await this.updateAnimalMrlStatus(animal.id);
    }
  }

  async getActiveMrlAlerts() {
    await this.updateAnimalMrlStatuses();
    return this.prisma.animal.findMany({
      where: {
        mrlStatus: {
          in: ['DO_NOT_SELL', 'CLEARING_SOON'],
        },
      },
      include: {
        farm: { select: { name: true, farmerId: true } },
        treatments: {
          orderBy: { withdrawalCompletionDate: 'desc' },
          take: 1,
        },
        withdrawalRecords: {
          where: { status: 'RESTRICTED' },
          orderBy: { withdrawalEndDate: 'desc' },
          take: 3,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMrlRules() {
    return this.prisma.mrlRule.findMany();
  }

  async createMrlRule(dto: any) {
    return this.prisma.mrlRule.upsert({
      where: {
        drugName_species: {
          drugName: dto.drugName,
          species: dto.species,
        },
      },
      update: {
        withdrawalPeriod: Number(dto.withdrawalPeriod),
        mrlLimit: dto.mrlLimit,
      },
      create: {
        drugName: dto.drugName,
        species: dto.species,
        withdrawalPeriod: Number(dto.withdrawalPeriod),
        mrlLimit: dto.mrlLimit,
      },
    });
  }
}
