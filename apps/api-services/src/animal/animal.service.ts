import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { Actor } from '../common/actor';
import { diffFields, parseDate, requireFields } from '../common/diff';

export const ANIMAL_HEALTH_STATUSES = ['HEALTHY', 'UNDER_TREATMENT', 'QUARANTINED'];
export const ANIMAL_LIFECYCLE_STATUSES = ['ACTIVE', 'SOLD', 'DEAD', 'TRANSFERRED'];
const GENDERS = ['MALE', 'FEMALE'];

const EDITABLE_FIELDS = [
  'tagNumber', 'name', 'species', 'breed', 'gender', 'dateOfBirth', 'age', 'weight', 'color',
  'identificationMark', 'photoUrl', 'registrationDate', 'currentStatus', 'status',
] as const;

@Injectable()
export class AnimalService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** Farmers may only see animals on farms they own. */
  static scopeFor(actor: Actor) {
    return actor.role === 'FARMER' ? { farm: { ownerId: actor.id ?? '__none__' } } : {};
  }

  private buildAnimalCode(species?: string, id?: string) {
    const prefixMap: Record<string, string> = {
      CATTLE: 'COW',
      BUFFALO: 'BUFFALO',
      GOAT: 'GOAT',
      SHEEP: 'SHEEP',
      PIG: 'PIG',
      POULTRY: 'POULTRY',
    };
    const prefix = prefixMap[(species || '').toUpperCase()] || 'ANIMAL';
    const suffix = (id || '').replace(/-/g, '').slice(0, 6).toUpperCase();
    return `${prefix}${suffix}`;
  }

  private toNumber(value: unknown, field: string, { min = 0, allowZero = true } = {}) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || (!allowZero && n === 0)) {
      throw new BadRequestException(`${field} must be a ${allowZero ? 'non-negative' : 'positive'} number`);
    }
    return n;
  }

  async findAll(actor: Actor, farmId?: string) {
    return this.prisma.animal.findMany({
      where: { ...(farmId ? { farmId } : {}), ...AnimalService.scopeFor(actor) },
      include: {
        farm: { select: { id: true, name: true, farmerId: true, ownerName: true } },
        withdrawalRecords: {
          where: { status: 'RESTRICTED' },
          orderBy: { withdrawalEndDate: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(actor: Actor, id: string) {
    const animal = await this.prisma.animal.findFirst({
      where: { id, ...AnimalService.scopeFor(actor) },
      include: {
        farm: {
          select: {
            id: true,
            name: true,
            farmerId: true,
            ownerName: true,
            fullName: true,
            address: true,
            district: true,
            village: true,
            mobileNumber: true,
          },
        },
        healthRecords: { orderBy: { date: 'desc' } },
        vaccinations: { orderBy: { vaccinationDate: 'desc' } },
        treatments: { orderBy: { administrationDate: 'desc' } },
        prescriptions: { orderBy: { prescriptionDate: 'desc' } },
        amuRecords: { orderBy: { createdAt: 'desc' } },
        withdrawalRecords: { orderBy: { withdrawalEndDate: 'desc' } },
        medicineDispensings: { orderBy: { dispensedDate: 'desc' } },
        productClearances: { orderBy: { productType: 'asc' } },
        milkCollections: { orderBy: { createdAt: 'desc' } },
        violations: { orderBy: { createdAt: 'desc' } },
        ownershipTransfers: {
          orderBy: { requestDate: 'desc' },
          include: {
            currentOwner: { select: { id: true, name: true, email: true } },
            newOwner: { select: { id: true, name: true, email: true } },
            fromFarm: { select: { id: true, farmerId: true, name: true, ownerName: true } },
            toFarm: { select: { id: true, farmerId: true, name: true, ownerName: true } },
          },
        },
      },
    });
    if (!animal) throw new NotFoundException('Animal not found');
    return animal;
  }

  async getTimeline(actor: Actor, id: string) {
    const animal = await this.findOne(actor, id);
    const events: any[] = [];

    (animal.healthRecords || []).forEach((h: any) => {
      events.push({
        id: `health-${h.id}`,
        type: 'HEALTH_CHECK',
        title: 'Health Check / Diagnosis',
        description: `${h.diagnosis}${h.symptoms ? ` (${h.symptoms})` : ''}`,
        date: h.date || h.checkupDate || h.createdAt,
        actor: h.veterinarianName,
        details: h,
      });
    });

    (animal.vaccinations || []).forEach((v: any) => {
      events.push({
        id: `vac-${v.id}`,
        type: 'VACCINATION',
        title: `Vaccination: ${v.vaccineName}`,
        description: `Next due: ${v.nextDueDate ? new Date(v.nextDueDate).toLocaleDateString() : 'N/A'}`,
        date: v.vaccinationDate || v.createdAt,
        actor: v.veterinarianName,
        details: v,
      });
    });

    (animal.prescriptions || []).forEach((p: any) => {
      events.push({
        id: `presc-${p.id}`,
        type: 'PRESCRIPTION',
        title: `Prescription: ${p.prescriptionCode || ''} - ${p.medicine}`,
        description: `${p.dosage} for ${p.duration} days`,
        date: p.prescriptionDate || p.createdAt,
        actor: p.veterinarianName,
        details: p,
      });
    });

    (animal.medicineDispensings || []).forEach((d: any) => {
      events.push({
        id: `disp-${d.id}`,
        type: 'MEDICINE_DISPENSED',
        title: `Dispensed: ${d.dispensingCode || ''} - ${d.medicine}`,
        description: `Quantity: ${d.quantity} units, Batch: ${d.batchNumber || 'N/A'}`,
        date: d.dispensedDate || d.createdAt,
        actor: d.dispensedBy,
        details: d,
      });
    });

    (animal.treatments || []).forEach((t: any) => {
      events.push({
        id: `treat-${t.id}`,
        type: 'TREATMENT',
        title: `Treatment: ${t.drugName}`,
        description: `Withdrawal period: ${t.withdrawalPeriod} days (until ${new Date(t.withdrawalCompletionDate).toLocaleDateString()})`,
        date: t.administrationDate || t.treatmentStartDate || t.createdAt,
        actor: t.veterinarianName,
        details: t,
      });
    });

    (animal.amuRecords || []).forEach((a: any) => {
      events.push({
        id: `amu-${a.id}`,
        type: 'AMU_RECORD',
        title: `AMU Logged: ${a.medicine}`,
        description: `Reason: ${a.reason || 'Not specified'}, Route: ${a.route || 'N/A'}`,
        date: a.startDate || a.createdAt,
        actor: a.veterinarianName,
        details: a,
      });
    });

    (animal.withdrawalRecords || []).forEach((w: any) => {
      events.push({
        id: `with-${w.id}`,
        type: 'WITHDRAWAL_STATUS',
        title: `Withdrawal ${w.status} (${w.productType})`,
        description: `Product: ${w.productType}, Ends: ${new Date(w.withdrawalEndDate).toLocaleDateString()}`,
        date: w.treatmentDate || w.createdAt,
        details: w,
      });
    });

    (animal.ownershipTransfers || []).forEach((o: any) => {
      events.push({
        id: `trans-${o.id}`,
        type: 'OWNERSHIP_TRANSFER',
        title: `Ownership Transfer: ${o.status}`,
        description: `From Farm: ${o.fromFarm?.name || 'N/A'} to ${o.toFarm?.name || 'N/A'}`,
        date: o.approvalDate || o.requestDate || o.createdAt,
        details: o,
      });
    });

    (animal.violations || []).forEach((v: any) => {
      events.push({
        id: `vio-${v.id}`,
        type: 'VIOLATION',
        title: `Violation Flagged: ${v.type}`,
        description: `${v.severity} severity - Status: ${v.status}`,
        date: v.date || v.createdAt,
        details: v,
      });
    });

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return events;
  }

  async getClearance(actor: Actor, id: string) {
    const animal = await this.prisma.animal.findFirst({
      where: { id, ...AnimalService.scopeFor(actor) },
      include: {
        productClearances: true,
        withdrawalRecords: {
          where: { withdrawalEndDate: { gt: new Date() } },
          orderBy: { withdrawalEndDate: 'desc' },
        },
      },
    });

    if (!animal) throw new NotFoundException('Animal not found');

    const clearanceMap: Record<string, any> = {};
    for (const c of animal.productClearances) {
      clearanceMap[c.productType] = {
        status: c.status,
        reason: c.reason,
        restrictionStart: c.restrictionStart,
        restrictionEnd: c.restrictionEnd,
      };
    }

    // Active withdrawals always win over cached clearance rows.
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

    if (!clearanceMap['MILK']) {
      clearanceMap['MILK'] = { status: animal.mrlStatus === 'CLEARED' ? 'CLEARED' : 'RESTRICTED', reason: null };
    }
    if (!clearanceMap['MEAT']) {
      clearanceMap['MEAT'] = { status: animal.mrlStatus === 'CLEARED' ? 'CLEARED' : 'RESTRICTED', reason: null };
    }

    return {
      animalId: animal.id,
      animalCode: animal.animalCode,
      tagNumber: animal.tagNumber,
      mrlStatus: animal.mrlStatus,
      clearances: clearanceMap,
    };
  }

  async create(actor: Actor, dto: any) {
    requireFields(dto, ['tagNumber', 'name', 'species', 'breed', 'gender', 'farmId']);
    const gender = String(dto.gender).toUpperCase();
    if (!GENDERS.includes(gender)) throw new BadRequestException('gender must be MALE or FEMALE');
    const status = dto.status ? String(dto.status).toUpperCase() : 'HEALTHY';
    if (!ANIMAL_HEALTH_STATUSES.includes(status)) {
      throw new BadRequestException(`status must be one of ${ANIMAL_HEALTH_STATUSES.join(', ')}`);
    }

    const farm = await this.prisma.farm.findUnique({ where: { id: dto.farmId } });
    if (!farm) throw new BadRequestException('Selected farm does not exist');
    if (farm.farmStatus !== 'ACTIVE') {
      throw new BadRequestException(`Animals cannot be registered to a farm with status ${farm.farmStatus}`);
    }

    const tagNumber = String(dto.tagNumber).trim();
    const dup = await this.prisma.animal.findUnique({ where: { tagNumber } });
    if (dup) throw new ConflictException('An animal with this Tag Number already exists.');

    const id = randomUUID();
    const dateOfBirth = parseDate(dto.dateOfBirth, 'dateOfBirth');
    if (dateOfBirth && dateOfBirth > new Date()) throw new BadRequestException('dateOfBirth cannot be in the future');

    const created = await this.prisma.animal.create({
      data: {
        id,
        tagNumber,
        animalCode: dto.animalCode || this.buildAnimalCode(dto.species, id),
        name: String(dto.name).trim(),
        species: String(dto.species).toUpperCase(),
        breed: dto.breed,
        gender,
        dateOfBirth,
        age: this.toNumber(dto.age ?? 0, 'age'),
        weight: this.toNumber(dto.weight ?? 0, 'weight'),
        color: dto.color || null,
        identificationMark: dto.identificationMark || null,
        photoUrl: dto.photoUrl || null,
        registrationDate: parseDate(dto.registrationDate, 'registrationDate') ?? new Date(),
        currentStatus: 'ACTIVE',
        status,
        // Computed from withdrawal records only; never accepted from the client.
        mrlStatus: 'CLEARED',
        farmId: dto.farmId,
      },
    });

    await this.audit.record(actor, {
      action: 'ANIMAL_REGISTERED',
      entity: 'ANIMAL',
      entityId: created.id,
      newValue: { tagNumber, animalCode: created.animalCode, species: created.species, farmId: created.farmId },
    });
    return created;
  }

  async update(actor: Actor, id: string, dto: any) {
    const existing = await this.prisma.animal.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Animal not found');

    if (dto.farmId !== undefined && dto.farmId !== existing.farmId) {
      throw new BadRequestException('An animal can only change farm through an approved ownership transfer.');
    }
    if (dto.mrlStatus !== undefined && dto.mrlStatus !== existing.mrlStatus) {
      throw new BadRequestException('MRL status is computed from withdrawal records and cannot be set manually.');
    }
    if (existing.currentStatus === 'DEAD') {
      throw new BadRequestException('Records of a deceased animal are closed and cannot be modified.');
    }

    const data: any = {};
    for (const key of EDITABLE_FIELDS) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    if (data.tagNumber !== undefined) {
      data.tagNumber = String(data.tagNumber).trim();
      if (!data.tagNumber) throw new BadRequestException('tagNumber cannot be empty');
    }
    if (data.gender !== undefined) {
      data.gender = String(data.gender).toUpperCase();
      if (!GENDERS.includes(data.gender)) throw new BadRequestException('gender must be MALE or FEMALE');
    }
    if (data.species !== undefined) data.species = String(data.species).toUpperCase();
    if (data.age !== undefined) data.age = this.toNumber(data.age, 'age');
    if (data.weight !== undefined) data.weight = this.toNumber(data.weight, 'weight');
    if (data.dateOfBirth !== undefined) data.dateOfBirth = parseDate(data.dateOfBirth, 'dateOfBirth');
    if (data.registrationDate !== undefined) data.registrationDate = parseDate(data.registrationDate, 'registrationDate');
    if (data.status !== undefined) {
      data.status = String(data.status).toUpperCase();
      if (!ANIMAL_HEALTH_STATUSES.includes(data.status)) {
        throw new BadRequestException(`status must be one of ${ANIMAL_HEALTH_STATUSES.join(', ')}`);
      }
      if (data.status === 'HEALTHY' && existing.mrlStatus !== 'CLEARED') {
        throw new BadRequestException('Animal is under an active withdrawal period and cannot be marked HEALTHY yet.');
      }
    }
    if (data.currentStatus !== undefined) {
      data.currentStatus = String(data.currentStatus).toUpperCase();
      if (!ANIMAL_LIFECYCLE_STATUSES.includes(data.currentStatus)) {
        throw new BadRequestException(`currentStatus must be one of ${ANIMAL_LIFECYCLE_STATUSES.join(', ')}`);
      }
      if (data.currentStatus === 'TRANSFERRED') {
        throw new BadRequestException('Use the ownership transfer workflow to transfer an animal.');
      }
      if (data.currentStatus === 'SOLD' && existing.mrlStatus !== 'CLEARED') {
        throw new BadRequestException('Animal is under an active withdrawal period and cannot be sold.');
      }
    }

    const updated = await this.prisma.animal.update({ where: { id }, data });
    const diff = diffFields(existing, updated, Object.keys(data));
    if (diff.changed) {
      await this.audit.record(actor, {
        action: data.currentStatus && data.currentStatus !== existing.currentStatus ? 'ANIMAL_LIFECYCLE_CHANGED' : 'ANIMAL_UPDATED',
        entity: 'ANIMAL',
        entityId: id,
        oldValue: diff.before,
        newValue: diff.after,
      });
    }
    return updated;
  }

  /**
   * Only an erroneous registration with no history can be deleted; otherwise
   * the veterinary and food-safety record would be destroyed (the schema
   * cascades). Such animals must be marked SOLD / DEAD instead.
   */
  async remove(actor: Actor, id: string) {
    const animal = await this.prisma.animal.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            healthRecords: true, vaccinations: true, treatments: true, prescriptions: true, withdrawalRecords: true,
            amuRecords: true, milkCollections: true, violations: true, ownershipTransfers: true, milkTests: true,
            medicineDispensings: true,
          },
        },
      },
    });
    if (!animal) throw new NotFoundException('Animal not found');
    const linked = Object.entries(animal._count).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`);
    if (linked.length > 0) {
      throw new ConflictException(
        `Animal has official records (${linked.join(', ')}) and cannot be deleted. Update its lifecycle status (SOLD / DEAD) instead.`,
      );
    }
    await this.prisma.$transaction([
      this.prisma.productClearance.deleteMany({ where: { animalId: id } }),
      this.prisma.animal.delete({ where: { id } }),
    ]);
    const { _count, ...snapshot } = animal;
    await this.audit.record(actor, { action: 'ANIMAL_DELETED', entity: 'ANIMAL', entityId: id, oldValue: snapshot });
    return { success: true };
  }
}
