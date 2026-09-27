import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { Actor } from '../common/actor';
import { generateCode } from '../common/codes';
import { parseDate } from '../common/diff';

@Injectable()
export class MedicineDispensingService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationService,
  ) {}

  async findAll(animalId?: string, prescriptionId?: string) {
    return this.prisma.medicineDispensing.findMany({
      where: {
        ...(animalId ? { animalId } : {}),
        ...(prescriptionId ? { prescriptionId } : {}),
      },
      include: {
        animal: { select: { id: true, animalCode: true, name: true, tagNumber: true, species: true } },
        prescription: { select: { id: true, prescriptionCode: true, medicine: true, dosage: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.medicineDispensing.findUnique({
      where: { id },
      include: {
        animal: true,
        prescription: true,
      },
    });
    if (!record) throw new NotFoundException(`MedicineDispensing with ID ${id} not found`);
    return record;
  }

  async create(actor: Actor, dto: any) {
    if (!dto?.prescriptionId) throw new BadRequestException('prescriptionId is required');
    const prescription = await this.prisma.prescription.findUnique({ where: { id: dto.prescriptionId } });
    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${dto.prescriptionId} not found`);
    }
    if (prescription.status !== 'ACTIVE') {
      throw new BadRequestException(`Medicine cannot be dispensed against a ${prescription.status} prescription.`);
    }
    if (prescription.endDate && prescription.endDate.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
      throw new BadRequestException('Prescription validity period has ended.');
    }
    // The animal is always the one the prescription was issued for.
    if (dto.animalId && dto.animalId !== prescription.animalId) {
      throw new BadRequestException('Selected animal does not match the prescription.');
    }
    const quantity = dto.quantity === undefined || dto.quantity === '' ? 1 : Number(dto.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('quantity must be a positive number');
    }

    let inventory: { id: string; medicineName: string; batchNumber: string; expiryDate: Date; minimumStock: number } | null = null;
    if (dto.inventoryId) {
      inventory = await this.prisma.inventory.findUnique({ where: { id: dto.inventoryId } });
      if (!inventory) throw new BadRequestException('Selected inventory item does not exist');
      if (inventory.expiryDate < new Date()) {
        throw new BadRequestException(`Batch ${inventory.batchNumber} expired on ${inventory.expiryDate.toISOString().slice(0, 10)} and cannot be dispensed.`);
      }
    }
    const units = Math.ceil(quantity);

    const { record, remaining } = await this.prisma.$transaction(async (tx) => {
      let left: number | null = null;
      if (inventory) {
        const dec = await tx.inventory.updateMany({
          where: { id: inventory.id, stock: { gte: units } },
          data: { stock: { decrement: units } },
        });
        if (dec.count === 0) throw new ConflictException(`Insufficient stock of ${inventory.medicineName} (batch ${inventory.batchNumber}).`);
        left = (await tx.inventory.findUnique({ where: { id: inventory.id } }))!.stock;
      }
      const created = await tx.medicineDispensing.create({
        data: {
          dispensingCode: generateCode('DISP'),
          prescriptionId: prescription.id,
          animalId: prescription.animalId,
          medicine: prescription.medicine,
          quantity,
          dispensedDate: parseDate(dto.dispensedDate, 'dispensedDate') ?? new Date(),
          dispensedBy: actor.name,
          dispensedById: actor.id,
          batchNumber: dto.batchNumber || (inventory ? inventory.batchNumber : null),
          notes: dto.notes || null,
        },
      });
      return { record: created, remaining: left };
    });

    await this.audit.record(actor, {
      action: 'MEDICINE_DISPENSED',
      entity: 'MEDICINE_DISPENSING',
      entityId: record.id,
      newValue: { medicine: record.medicine, quantity, prescriptionId: prescription.id, animalId: prescription.animalId, inventoryId: inventory?.id ?? null },
    });

    if (inventory && remaining !== null && remaining <= inventory.minimumStock) {
      await this.notifications.notify({
        title: 'Low Stock Alert',
        message: `${inventory.medicineName} (batch ${inventory.batchNumber}) is running low: ${remaining} remaining.`,
        type: 'WARNING',
        entityId: inventory.id,
        roles: ['ADMIN', 'VETERINARIAN'],
      });
    }
    return record;
  }

  async remove(actor: Actor, id: string) {
    const record = await this.prisma.medicineDispensing.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`MedicineDispensing with ID ${id} not found`);
    await this.prisma.medicineDispensing.delete({ where: { id } });
    await this.audit.record(actor, { action: 'DISPENSING_DELETED', entity: 'MEDICINE_DISPENSING', entityId: id, oldValue: record });
    return { success: true };
  }
}
