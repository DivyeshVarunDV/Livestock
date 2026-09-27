import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { Actor } from '../common/actor';
import { diffFields, parseDate } from '../common/diff';
import { MedicineService } from './medicine.service';

const TEXT_FIELDS = ['medicineName', 'manufacturer', 'batchNumber', 'supplier', 'storageLocation'] as const;
const INT_FIELDS = ['stock', 'minimumStock', 'withdrawalPeriod'] as const;

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private medicines: MedicineService,
  ) {}

  /** Stock of a catalogued medicine always carries the catalogue's withdrawal period. */
  private async applyCatalogue(data: any) {
    if (!data.medicineName) return;
    const medicine = await this.medicines.findByName(data.medicineName);
    if (medicine) {
      data.medicineName = medicine.name;
      data.withdrawalPeriod = medicine.withdrawalPeriod;
    }
  }

  async findAll() {
    return this.prisma.inventory.findMany({
      orderBy: { medicineName: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.inventory.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  /** Picks and validates the editable fields present in `dto`. */
  private sanitize(dto: any) {
    const data: any = {};
    for (const key of TEXT_FIELDS) {
      if (dto[key] !== undefined) {
        const v = String(dto[key] ?? '').trim();
        if (!v) throw new BadRequestException(`${key} cannot be empty`);
        data[key] = v;
      }
    }
    for (const key of INT_FIELDS) {
      if (dto[key] !== undefined && dto[key] !== '') {
        const n = Number(dto[key]);
        if (!Number.isInteger(n) || n < 0) throw new BadRequestException(`${key} must be a non-negative whole number`);
        data[key] = n;
      }
    }
    if (dto.cost !== undefined && dto.cost !== '') {
      const n = Number(dto.cost);
      if (!Number.isFinite(n) || n < 0) throw new BadRequestException('cost must be a non-negative number');
      data.cost = n;
    }
    if (dto.expiryDate !== undefined) {
      const d = parseDate(dto.expiryDate, 'expiryDate');
      if (!d) throw new BadRequestException('expiryDate is required');
      data.expiryDate = d;
    }
    return data;
  }

  async create(actor: Actor, dto: any) {
    const data = this.sanitize(dto);
    if (!data.medicineName) throw new BadRequestException('medicineName is required');
    if (!data.batchNumber) throw new BadRequestException('batchNumber is required');
    if (!data.expiryDate) throw new BadRequestException('expiryDate is required');
    await this.applyCatalogue(data);

    const item = await this.prisma.inventory.create({
      data: {
        manufacturer: 'Unknown Manufacturer',
        supplier: 'Unspecified Supplier',
        stock: 0,
        ...data,
      },
    });
    await this.audit.record(actor, {
      action: 'INVENTORY_ADDED',
      entity: 'INVENTORY',
      entityId: item.id,
      newValue: { medicineName: item.medicineName, batchNumber: item.batchNumber, stock: item.stock, expiryDate: item.expiryDate },
    });
    return item;
  }

  async update(actor: Actor, id: string, dto: any) {
    const existing = await this.findOne(id);
    const data = this.sanitize(dto);
    await this.applyCatalogue(data);
    const updated = await this.prisma.inventory.update({ where: { id }, data });
    const diff = diffFields(existing, updated, Object.keys(data));
    if (diff.changed) {
      await this.audit.record(actor, {
        action: diff.after.stock !== undefined ? 'INVENTORY_STOCK_ADJUSTED' : 'INVENTORY_UPDATED',
        entity: 'INVENTORY',
        entityId: id,
        oldValue: diff.before,
        newValue: diff.after,
      });
    }
    return updated;
  }

  async remove(actor: Actor, id: string) {
    const existing = await this.findOne(id);
    await this.prisma.inventory.delete({ where: { id } });
    await this.audit.record(actor, { action: 'INVENTORY_REMOVED', entity: 'INVENTORY', entityId: id, oldValue: existing });
    return { success: true };
  }

  async getAlerts() {
    const all = await this.findAll();
    const now = Date.now();
    const lowStock = all.filter((i) => i.stock <= i.minimumStock);
    // Includes already-expired items, as the portal has always displayed them here.
    const expiringSoon = all.filter((i) => new Date(i.expiryDate).getTime() - now < 1000 * 60 * 60 * 24 * 30);
    const expired = all.filter((i) => new Date(i.expiryDate).getTime() < now);
    return { lowStock, expiringSoon, expired };
  }
}
