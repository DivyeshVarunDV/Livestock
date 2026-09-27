import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { Actor } from '../common/actor';
import { diffFields } from '../common/diff';

/** Commonly used veterinary medicines, loaded once into an empty catalogue. */
export const STARTER_MEDICINES = [
  { name: 'Oxytetracycline 200mg/ml', activeIngredient: 'Oxytetracycline', category: 'ANTIBIOTIC', dosageForm: 'INJECTABLE', withdrawalPeriod: 28 },
  { name: 'Penicillin G Procaine', activeIngredient: 'Benzylpenicillin procaine', category: 'ANTIBIOTIC', dosageForm: 'INJECTABLE', withdrawalPeriod: 10 },
  { name: 'Amoxicillin LA 150mg/ml', activeIngredient: 'Amoxicillin', category: 'ANTIBIOTIC', dosageForm: 'INJECTABLE', withdrawalPeriod: 21 },
  { name: 'Enrofloxacin 10%', activeIngredient: 'Enrofloxacin', category: 'ANTIBIOTIC', dosageForm: 'INJECTABLE', withdrawalPeriod: 28 },
  { name: 'Ceftiofur Sodium', activeIngredient: 'Ceftiofur', category: 'ANTIBIOTIC', dosageForm: 'INJECTABLE', withdrawalPeriod: 4 },
  { name: 'Tylosin 200mg/ml', activeIngredient: 'Tylosin', category: 'ANTIBIOTIC', dosageForm: 'INJECTABLE', withdrawalPeriod: 21 },
  { name: 'Ivermectin 1% Injectable', activeIngredient: 'Ivermectin', category: 'ANTIPARASITIC', dosageForm: 'INJECTABLE', withdrawalPeriod: 35 },
  { name: 'Doramectin 1%', activeIngredient: 'Doramectin', category: 'ANTIPARASITIC', dosageForm: 'INJECTABLE', withdrawalPeriod: 35 },
  { name: 'Albendazole 10%', activeIngredient: 'Albendazole', category: 'ANTIPARASITIC', dosageForm: 'ORAL', withdrawalPeriod: 27 },
  { name: 'Flunixin Meglumine', activeIngredient: 'Flunixin', category: 'NSAID', dosageForm: 'INJECTABLE', withdrawalPeriod: 4 },
  { name: 'Meloxicam 20mg/ml', activeIngredient: 'Meloxicam', category: 'NSAID', dosageForm: 'INJECTABLE', withdrawalPeriod: 15 },
];

const TEXT_FIELDS = ['name', 'activeIngredient', 'category', 'dosageForm', 'notes'] as const;

@Injectable()
export class MedicineService implements OnModuleInit {
  private readonly logger = new Logger(MedicineService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** Seeds an empty catalogue with the starter list plus any drug already named in MRL rules or stock. */
  async onModuleInit() {
    try {
      if ((await this.prisma.medicine.count()) > 0) return;
      const [rules, stock] = await Promise.all([
        this.prisma.mrlRule.findMany({ where: { status: 'ACTIVE' } }),
        this.prisma.inventory.findMany(),
      ]);
      const byName = new Map<string, any>();
      for (const m of STARTER_MEDICINES) byName.set(m.name.toLowerCase(), { ...m });
      for (const r of rules) {
        const key = r.drugName.toLowerCase();
        const current = byName.get(key);
        byName.set(key, { name: r.drugName, activeIngredient: r.substance ?? null, withdrawalPeriod: Math.max(r.withdrawalPeriod, current?.withdrawalPeriod ?? 0), ...(current ? { category: current.category, dosageForm: current.dosageForm } : {}) });
      }
      for (const s of stock) {
        const key = s.medicineName.toLowerCase();
        if (!byName.has(key)) byName.set(key, { name: s.medicineName, withdrawalPeriod: s.withdrawalPeriod });
      }
      await this.prisma.medicine.createMany({ data: [...byName.values()] });
      this.logger.log(`Seeded medicine catalogue with ${byName.size} medicines`);
    } catch (e: any) {
      this.logger.warn(`Medicine catalogue seed skipped: ${e?.message ?? e}`);
    }
  }

  findAll() {
    return this.prisma.medicine.findMany({ orderBy: { name: 'asc' } });
  }

  /** Catalogue entry for a medicine name (case-insensitive), if any. */
  async findByName(name?: string | null) {
    if (!name) return null;
    const all = await this.prisma.medicine.findMany();
    return all.find((m) => m.name.toLowerCase() === name.trim().toLowerCase()) ?? null;
  }

  private sanitize(dto: any) {
    const data: any = {};
    for (const key of TEXT_FIELDS) {
      if (dto?.[key] !== undefined) data[key] = String(dto[key] ?? '').trim() || null;
    }
    if (data.name === null) throw new BadRequestException('Medicine name cannot be empty');
    if (dto?.withdrawalPeriod !== undefined && dto.withdrawalPeriod !== '') {
      const n = Number(dto.withdrawalPeriod);
      if (!Number.isInteger(n) || n < 0 || n > 3650) throw new BadRequestException('Withdrawal period must be a whole number of days (0-3650)');
      data.withdrawalPeriod = n;
    }
    if (dto?.status !== undefined) {
      const status = String(dto.status).toUpperCase();
      if (!['ACTIVE', 'INACTIVE'].includes(status)) throw new BadRequestException('status must be ACTIVE or INACTIVE');
      data.status = status;
    }
    return data;
  }

  async create(actor: Actor, dto: any) {
    const data = this.sanitize(dto);
    if (!data.name) throw new BadRequestException('Medicine name is required');
    if (await this.findByName(data.name)) throw new ConflictException(`${data.name} is already in the medicine list`);
    const medicine = await this.prisma.medicine.create({ data });
    await this.audit.record(actor, { action: 'MEDICINE_ADDED', entity: 'MEDICINE', entityId: medicine.id, newValue: medicine });
    return medicine;
  }

  /** Stock of this medicine follows a changed withdrawal period; past treatments keep the period they were given. */
  async update(actor: Actor, id: string, dto: any) {
    const existing = await this.prisma.medicine.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Medicine not found');
    const data = this.sanitize(dto);
    if (data.name && data.name.toLowerCase() !== existing.name.toLowerCase()) {
      const clash = await this.findByName(data.name);
      if (clash) throw new ConflictException(`${data.name} is already in the medicine list`);
    }
    const updated = await this.prisma.medicine.update({ where: { id }, data });
    if (data.withdrawalPeriod !== undefined && data.withdrawalPeriod !== existing.withdrawalPeriod) {
      const stock = await this.prisma.inventory.findMany({ select: { id: true, medicineName: true } });
      const ids = stock.filter((s) => s.medicineName.toLowerCase() === existing.name.toLowerCase()).map((s) => s.id);
      if (ids.length) {
        await this.prisma.inventory.updateMany({ where: { id: { in: ids } }, data: { withdrawalPeriod: data.withdrawalPeriod } });
      }
    }
    const diff = diffFields(existing, updated, Object.keys(data));
    if (diff.changed) {
      await this.audit.record(actor, {
        action: diff.after.withdrawalPeriod !== undefined ? 'MEDICINE_WITHDRAWAL_CHANGED' : 'MEDICINE_UPDATED',
        entity: 'MEDICINE',
        entityId: id,
        oldValue: diff.before,
        newValue: diff.after,
      });
    }
    return updated;
  }
}
