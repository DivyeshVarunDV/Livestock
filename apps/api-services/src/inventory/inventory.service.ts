import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

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

  async create(dto: any) {
    return this.prisma.inventory.create({
      data: {
        medicineName: dto.medicineName,
        manufacturer: dto.manufacturer || 'Unknown Manufacturer',
        batchNumber: dto.batchNumber || `BATCH-${Date.now().toString().slice(-6)}`,
        expiryDate: new Date(dto.expiryDate || Date.now() + 31536000000),
        stock: Number(dto.stock || 0),
        minimumStock: Number(dto.minimumStock || 10),
        supplier: dto.supplier || 'AgriShield Global Supply',
        cost: Number(dto.cost || 0),
        storageLocation: dto.storageLocation || 'Main Pharmacy Room',
        withdrawalPeriod: Number(dto.withdrawalPeriod || 0),
      },
    });
  }

  async update(id: string, dto: any) {
    const data: any = { ...dto };
    if (data.expiryDate) {
      data.expiryDate = new Date(data.expiryDate);
    }
    if (data.stock !== undefined) {
      data.stock = Number(data.stock);
    }
    if (data.minimumStock !== undefined) {
      data.minimumStock = Number(data.minimumStock);
    }
    if (data.cost !== undefined) {
      data.cost = Number(data.cost);
    }
    if (data.withdrawalPeriod !== undefined) {
      data.withdrawalPeriod = Number(data.withdrawalPeriod);
    }
    return this.prisma.inventory.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.inventory.delete({
      where: { id },
    });
  }

  async getAlerts() {
    const all = await this.findAll();
    const lowStock = all.filter((i: any) => i.stock <= i.minimumStock);
    const expiringSoon = all.filter(
      (i: any) =>
        new Date(i.expiryDate).getTime() - Date.now() <
        1000 * 60 * 60 * 24 * 30,
    );
    return { lowStock, expiringSoon };
  }
}
