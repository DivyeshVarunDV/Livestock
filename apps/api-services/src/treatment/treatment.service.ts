import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Inventory, Prescription } from '@livestock/database';
import { PrismaService } from '../prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { ComplianceService } from '../compliance/compliance.service';
import { NotificationService } from '../notification/notification.service';
import { Actor, SYSTEM_ACTOR } from '../common/actor';
import { generateCode } from '../common/codes';
import { CreateMrlRuleDto, CreateTreatmentDto } from './dto/create-treatment.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 10 * 60 * 1000;

/** Default products restricted by a treatment when the vet does not specify them. */
export function defaultProductTypes(species: string, gender: string): string[] {
  if ((species || '').toUpperCase() === 'POULTRY') return ['MEAT', 'EGGS'];
  return (gender || '').toUpperCase() === 'MALE' ? ['MEAT'] : ['MILK', 'MEAT'];
}

/** Rule matches the exact drug name, or a drug name that starts with it (e.g. "Oxytetracycline 200mg/ml"). */
export function ruleMatchesDrug(ruleDrug: string, drugName: string, activeIngredient?: string | null) {
  const rule = ruleDrug.trim().toLowerCase();
  const candidates = [drugName, activeIngredient].filter(Boolean).map((s) => String(s).trim().toLowerCase());
  return candidates.some((c) => c === rule || c.startsWith(`${rule} `));
}

@Injectable()
export class TreatmentService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
    private audit: AuditService,
    private compliance: ComplianceService,
    private notifications: NotificationService,
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

  /** The legally applicable minimum withdrawal period for a drug/species, if a rule exists. */
  async findApplicableRule(drugName: string, species: string, activeIngredient?: string | null) {
    const rules = await this.prisma.mrlRule.findMany({ where: { species: species.toUpperCase(), status: 'ACTIVE' } });
    const matching = rules.filter((r) => ruleMatchesDrug(r.drugName, drugName, activeIngredient));
    if (matching.length === 0) return null;
    return matching.reduce((a, b) => (b.withdrawalPeriod > a.withdrawalPeriod ? b : a));
  }

  async create(actor: Actor, dto: CreateTreatmentDto) {
    const now = new Date();
    const adminDate = dto.administrationDate ? new Date(dto.administrationDate) : now;
    if (adminDate.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
      throw new BadRequestException('Administration date cannot be in the future.');
    }

    const animal = await this.prisma.animal.findUnique({ where: { id: dto.animalId } });
    if (!animal) {
      throw new NotFoundException('Animal not found');
    }
    if (animal.currentStatus && animal.currentStatus !== 'ACTIVE') {
      throw new BadRequestException(`Cannot record a treatment for an animal with status ${animal.currentStatus}.`);
    }

    // Prescription must be valid for this animal at the time of administration.
    let prescription: Prescription | null = null;
    if (dto.prescriptionId) {
      prescription = await this.prisma.prescription.findUnique({ where: { id: dto.prescriptionId } });
      if (!prescription) throw new BadRequestException('Linked prescription does not exist');
      if (prescription.animalId !== animal.id) throw new BadRequestException('Prescription was issued for a different animal');
      if (prescription.status !== 'ACTIVE') throw new BadRequestException(`Prescription is ${prescription.status}`);
      if (prescription.endDate && prescription.endDate.getTime() + DAY_MS < adminDate.getTime()) {
        throw new BadRequestException('Prescription validity period has ended');
      }
    }

    // Stock item must be in date.
    let inventory: Inventory | null = null;
    if (dto.inventoryId) {
      inventory = await this.prisma.inventory.findUnique({ where: { id: dto.inventoryId } });
      if (!inventory) throw new BadRequestException('Selected inventory item does not exist');
      if (inventory.expiryDate < adminDate) {
        throw new BadRequestException(`Batch ${inventory.batchNumber} of ${inventory.medicineName} expired on ${inventory.expiryDate.toISOString().slice(0, 10)} and must not be administered.`);
      }
    }

    // Withdrawal period: the largest of the vet's value, the medicine list, the prescription, the stock item and the MRL rule.
    const complianceNotes: string[] = [];
    const rule = await this.findApplicableRule(dto.drugName, animal.species, dto.activeIngredient ?? prescription?.activeIngredient);
    const requested = dto.withdrawalPeriod ?? 0;
    const catalogue = (await this.prisma.medicine.findMany({ where: { status: 'ACTIVE' } })).find(
      (m) => m.name.toLowerCase() === dto.drugName.trim().toLowerCase(),
    );
    const floors: { source: string; days: number }[] = [
      { source: 'requested', days: requested },
      { source: `medicine list (${catalogue?.name})`, days: catalogue?.withdrawalPeriod ?? 0 },
      { source: `MRL rule (${rule?.drugName}/${rule?.species})`, days: rule?.withdrawalPeriod ?? 0 },
      { source: 'prescription', days: prescription?.applicableWithdrawalPeriod ?? 0 },
      { source: `stock item ${inventory?.batchNumber}`, days: inventory?.withdrawalPeriod ?? 0 },
    ];
    const governing = floors.reduce((a, b) => (b.days > a.days ? b : a));
    const withdrawalPeriod = governing.days;
    if (withdrawalPeriod > requested) {
      complianceNotes.push(
        `Withdrawal period raised from ${requested} to ${withdrawalPeriod} day(s) to meet the ${governing.source} minimum.`,
      );
    }
    const withdrawalCompletionDate = new Date(adminDate.getTime() + withdrawalPeriod * DAY_MS);

    const productTypes = [
      ...new Set(
        dto.productTypes && dto.productTypes.length > 0
          ? dto.productTypes
          : dto.productType
            ? [dto.productType]
            : defaultProductTypes(animal.species, animal.gender),
      ),
    ];
    const recordAmu = Boolean(dto.isAntimicrobial || dto.recordAmu);
    const startDate = dto.treatmentStartDate ? new Date(dto.treatmentStartDate) : adminDate;
    const endDate = dto.treatmentEndDate ? new Date(dto.treatmentEndDate) : null;
    if (endDate && endDate < startDate) throw new BadRequestException('Treatment end date is before its start date');

    const { treatment, remainingStock } = await this.prisma.$transaction(async (tx) => {
      let remaining: number | null = null;
      if (inventory) {
        // Atomic decrement: never goes below zero even under concurrent requests.
        const dec = await tx.inventory.updateMany({
          where: { id: inventory.id, stock: { gte: 1 } },
          data: { stock: { decrement: 1 } },
        });
        if (dec.count === 0) throw new ConflictException(`${inventory.medicineName} (batch ${inventory.batchNumber}) is out of stock.`);
        remaining = (await tx.inventory.findUnique({ where: { id: inventory.id } }))!.stock;
      }

      const created = await tx.treatment.create({
        data: {
          animalId: animal.id,
          prescriptionId: prescription?.id ?? null,
          disease: dto.disease || null,
          drugName: dto.drugName,
          activeIngredient: dto.activeIngredient || prescription?.activeIngredient || null,
          dosage: dto.dosage,
          route: dto.route || null,
          reason: dto.reason || null,
          notes: dto.notes || null,
          followUpRequired: Boolean(dto.followUpRequired),
          treatmentStartDate: startDate,
          treatmentEndDate: endDate,
          administrationDate: adminDate,
          withdrawalPeriod,
          withdrawalCompletionDate,
          veterinarianId: actor.id,
          veterinarianName: actor.name,
        },
      });

      for (const productType of productTypes) {
        await tx.withdrawalRecord.create({
          data: {
            withdrawalCode: dto.withdrawalCode || generateCode('WD'),
            treatmentId: created.id,
            animalId: animal.id,
            productType,
            medicine: dto.drugName,
            treatmentDate: adminDate,
            withdrawalPeriod,
            withdrawalEndDate: withdrawalCompletionDate,
            status: withdrawalCompletionDate > now ? 'RESTRICTED' : 'WITHDRAWAL_COMPLETED',
            followUpRequired: Boolean(dto.followUpRequired),
            notes: dto.notes || null,
          },
        });
      }

      if (recordAmu) {
        await tx.amuRecord.create({
          data: {
            amuCode: dto.amuCode || generateCode('AMU'),
            animalId: animal.id,
            treatmentId: created.id,
            medicine: dto.drugName,
            activeIngredient: dto.activeIngredient || prescription?.activeIngredient || null,
            dosage: dto.dosage,
            route: dto.route || null,
            startDate,
            endDate,
            reason: dto.reason || null,
            veterinarianId: actor.id,
            veterinarianName: actor.name,
          },
        });
      }
      return { treatment: created, remainingStock: remaining };
    });

    // Derived state (withdrawal statuses, product clearances, MRL status) from the authoritative records.
    await this.compliance.recomputeAnimal(animal.id, actor);

    await this.audit.record(actor, {
      action: 'TREATMENT_CREATED',
      entity: 'TREATMENT',
      entityId: treatment.id,
      newValue: {
        animalId: animal.id,
        drug: dto.drugName,
        dosage: dto.dosage,
        productTypes,
        withdrawalPeriod,
        withdrawalEnds: withdrawalCompletionDate.toISOString(),
        prescriptionId: prescription?.id ?? null,
        inventoryId: inventory?.id ?? null,
        amuRecorded: recordAmu,
        complianceNotes,
      },
    });

    if (inventory && remainingStock !== null && remainingStock <= inventory.minimumStock) {
      await this.notifications.notify({
        title: 'Low Stock Alert',
        message: `${inventory.medicineName} (batch ${inventory.batchNumber}) is running low: ${remainingStock} remaining.`,
        type: 'WARNING',
        entityId: inventory.id,
        roles: ['ADMIN', 'VETERINARIAN'],
      });
    }

    await this.ledgerService.appendToLedger('CREATE_TREATMENT', treatment.id, treatment);

    return { ...treatment, productTypes, complianceNotes };
  }

  async remove(actor: Actor, id: string) {
    const treatment = await this.prisma.treatment.findUnique({
      where: { id },
      include: { withdrawalRecords: true, amuRecords: true },
    });
    if (!treatment) throw new NotFoundException('Treatment not found');

    const withdrawalIds = treatment.withdrawalRecords.map((w) => w.id);
    await this.prisma.$transaction([
      this.prisma.productClearance.updateMany({
        where: { relatedWithdrawalId: { in: withdrawalIds } },
        data: { relatedWithdrawalId: null },
      }),
      this.prisma.withdrawalRecord.deleteMany({ where: { treatmentId: id } }),
      this.prisma.amuRecord.deleteMany({ where: { treatmentId: id } }),
      this.prisma.treatment.delete({ where: { id } }),
    ]);
    await this.compliance.recomputeAnimal(treatment.animalId, actor);
    await this.audit.record(actor, { action: 'TREATMENT_DELETED', entity: 'TREATMENT', entityId: id, oldValue: treatment });
    await this.ledgerService.appendToLedger('DELETE_TREATMENT', id, { deletedBy: actor.id, treatment });
    return { success: true };
  }

  /** Backward-compatible wrapper around the compliance engine. */
  async updateAnimalMrlStatus(animalId: string, actor: Actor = SYSTEM_ACTOR) {
    return this.compliance.recomputeAnimal(animalId, actor);
  }

  async updateAnimalMrlStatuses(actor: Actor = SYSTEM_ACTOR) {
    const processed = await this.compliance.sweep(actor);
    return { processed };
  }

  async getActiveMrlAlerts() {
    await this.compliance.sweep();
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
    return this.prisma.mrlRule.findMany({ orderBy: [{ species: 'asc' }, { drugName: 'asc' }] });
  }

  async createMrlRule(actor: Actor, dto: CreateMrlRuleDto) {
    const where = { drugName_species: { drugName: dto.drugName, species: dto.species } };
    const existing = await this.prisma.mrlRule.findUnique({ where });
    const fields = {
      withdrawalPeriod: dto.withdrawalPeriod,
      mrlLimit: dto.mrlLimit ?? existing?.mrlLimit ?? null,
      substance: dto.substance ?? existing?.substance ?? null,
      applicableTissue: dto.applicableTissue ?? existing?.applicableTissue ?? null,
      unit: dto.unit ?? existing?.unit ?? null,
      reference: dto.reference ?? existing?.reference ?? null,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : existing?.effectiveDate ?? null,
      status: 'ACTIVE',
    };
    const rule = await this.prisma.mrlRule.upsert({
      where,
      update: fields,
      create: { drugName: dto.drugName, species: dto.species, ...fields },
    });
    await this.audit.record(actor, {
      action: existing ? 'MRL_RULE_UPDATED' : 'MRL_RULE_CREATED',
      entity: 'MRL_RULE',
      entityId: rule.id,
      oldValue: existing,
      newValue: rule,
    });
    return rule;
  }
}
