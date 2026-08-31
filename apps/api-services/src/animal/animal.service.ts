import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AnimalService {
  constructor(private prisma: PrismaService) {}

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

  async findAll(farmId?: string) {
    const where: any = {};
    if (farmId) {
      where.farmId = farmId;
    }
    return this.prisma.animal.findMany({
      where,
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

  async findOne(id: string) {
    const animal = await this.prisma.animal.findUnique({
      where: { id },
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

  async getTimeline(id: string) {
    const animal = await this.findOne(id);
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

  async getClearance(id: string) {
    const animal = await this.prisma.animal.findUnique({
      where: { id },
      include: {
        productClearances: true,
        withdrawalRecords: {
          where: { status: 'RESTRICTED' },
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

  async create(dto: any) {
    try {
      const created = await this.prisma.animal.create({
        data: {
          tagNumber: dto.tagNumber,
          name: dto.name,
          species: dto.species,
          breed: dto.breed,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          age: Number(dto.age),
          weight: Number(dto.weight),
          color: dto.color || null,
          identificationMark: dto.identificationMark || null,
          photoUrl: dto.photoUrl || null,
          registrationDate: dto.registrationDate ? new Date(dto.registrationDate) : new Date(),
          currentStatus: dto.currentStatus || 'ACTIVE',
          status: dto.status || 'HEALTHY',
          mrlStatus: dto.mrlStatus || 'CLEARED',
          farmId: dto.farmId,
        },
      });

      return this.prisma.animal.update({
        where: { id: created.id },
        data: {
          animalCode: dto.animalCode || this.buildAnimalCode(dto.species, created.id),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('An animal with this Tag Number already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: any) {
    const data: any = { ...dto };
    if (dto.age !== undefined) data.age = Number(dto.age);
    if (dto.weight !== undefined) data.weight = Number(dto.weight);
    if (dto.dateOfBirth !== undefined) data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.registrationDate !== undefined) data.registrationDate = dto.registrationDate ? new Date(dto.registrationDate) : null;

    return this.prisma.animal.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.animal.delete({
      where: { id },
    });
  }
}
