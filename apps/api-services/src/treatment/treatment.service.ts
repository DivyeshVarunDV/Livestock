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
            name: true,
            tagNumber: true,
            species: true,
            farm: { select: { name: true } },
          },
        },
      },
      orderBy: { administrationDate: 'desc' },
    });
  }

  async findByAnimal(animalId: string) {
    return this.prisma.treatment.findMany({
      where: { animalId },
      orderBy: { administrationDate: 'desc' },
    });
  }

  async create(dto: any) {
    const adminDate = dto.administrationDate
      ? new Date(dto.administrationDate)
      : new Date();
    const withdrawalPeriod = Number(dto.withdrawalPeriod);

    // Calculate withdrawal completion date
    const withdrawalCompletionDate = new Date(adminDate);
    withdrawalCompletionDate.setDate(
      withdrawalCompletionDate.getDate() + withdrawalPeriod,
    );

    // Inventory check
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

    // Create the treatment record
    const treatment = await this.prisma.treatment.create({
      data: {
        animalId: dto.animalId,
        drugName: dto.drugName,
        dosage: dto.dosage,
        administrationDate: adminDate,
        withdrawalPeriod,
        withdrawalCompletionDate,
        veterinarianId: dto.veterinarianId || null,
        veterinarianName: dto.veterinarianName || 'System Vet',
      },
    });

    // Update the animal's MRL status
    await this.updateAnimalMrlStatus(dto.animalId, dto.veterinarianName);

    // Audit Log: Treatment Created
    await this.prisma.auditLog.create({
      data: {
        userName: dto.veterinarianName || 'System Auto',
        action: 'Treatment Created',
        entity: 'TREATMENT',
        entityId: treatment.id,
        newValue: JSON.stringify({ drug: dto.drugName, dosage: dto.dosage })
      }
    });

    if (withdrawalPeriod > 0) {
      // Audit Log: Withdrawal Started
      await this.prisma.auditLog.create({
        data: {
          userName: dto.veterinarianName || 'System Auto',
          action: 'Withdrawal Started',
          entity: 'TREATMENT',
          entityId: treatment.id,
          newValue: JSON.stringify({ drug: dto.drugName, duration: `${withdrawalPeriod} days` })
        }
      });
    }

    // Cryptographically secure the record
    await this.ledgerService.appendToLedger('CREATE_TREATMENT', treatment.id, treatment);

    return treatment;
  }

  async remove(id: string) {
    const treatment = await this.prisma.treatment.findUnique({ where: { id } });
    if (!treatment) throw new NotFoundException('Treatment not found');

    await this.prisma.treatment.delete({ where: { id } });
    await this.updateAnimalMrlStatus(treatment.animalId, 'System Auto');
    return { success: true };
  }

  // Recalculates and updates the animal's MRL status
  async updateAnimalMrlStatus(animalId: string, userName: string = 'System Auto') {
    const now = new Date();
    const animal = await this.prisma.animal.findUnique({ where: { id: animalId } });
    if (!animal) return;

    const previousMrlStatus = animal.mrlStatus;

    const treatments = await this.prisma.treatment.findMany({
      where: { animalId },
    });

    if (treatments.length === 0) {
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

    // Find the latest withdrawal completion date
    let latestCompletion = new Date(0);
    for (const t of treatments) {
      const compDate = new Date(t.withdrawalCompletionDate);
      if (compDate > latestCompletion) {
        latestCompletion = compDate;
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
    const now = new Date();
    const animals = await this.prisma.animal.findMany({
      where: { mrlStatus: { not: 'CLEARED' } },
    });

    for (const animal of animals) {
      const treatments = await this.prisma.treatment.findMany({
        where: { animalId: animal.id },
        orderBy: { withdrawalCompletionDate: 'desc' },
      });

      if (treatments.length === 0) {
        await this.prisma.animal.update({
          where: { id: animal.id },
          data: { mrlStatus: 'CLEARED', status: 'HEALTHY' },
        });
        continue;
      }

      const latestCompletion = new Date(treatments[0].withdrawalCompletionDate);
      const allPast = treatments.every((t) => new Date(t.withdrawalCompletionDate) <= now);

      let newMrlStatus = animal.mrlStatus;
      let newStatus = animal.status;

      if (allPast) {
        newMrlStatus = 'CLEARED';
        newStatus = 'HEALTHY';
      } else {
        const diffMs = latestCompletion.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays <= 3 && diffDays > 0) {
          newMrlStatus = 'CLEARING_SOON';
          newStatus = 'UNDER_TREATMENT';
        } else if (diffDays <= 0) {
          newMrlStatus = 'CLEARED';
          newStatus = 'HEALTHY';
        } else {
          newMrlStatus = 'DO_NOT_SELL';
          newStatus = 'UNDER_TREATMENT';
        }
      }

      if (newMrlStatus !== animal.mrlStatus || newStatus !== animal.status) {
        await this.prisma.animal.update({
          where: { id: animal.id },
          data: { mrlStatus: newMrlStatus, status: newStatus },
        });
      }
    }
  }

  // Get active alerts for the dashboard
  async getActiveMrlAlerts() {
    await this.updateAnimalMrlStatuses();
    return this.prisma.animal.findMany({
      where: {
        mrlStatus: {
          in: ['DO_NOT_SELL', 'CLEARING_SOON'],
        },
      },
      include: {
        farm: { select: { name: true } },
        treatments: {
          orderBy: { withdrawalCompletionDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Get MRL Rules CRUD
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
