import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MedicineDispensingService {
  constructor(private prisma: PrismaService) {}

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

  async create(dto: any) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id: dto.prescriptionId } });
    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${dto.prescriptionId} not found`);
    }

    const count = await this.prisma.medicineDispensing.count();
    const dispensingCode = `DISP${String(count + 1).padStart(3, '0')}`;

    const newRecord = await this.prisma.medicineDispensing.create({
      data: {
        dispensingCode,
        prescriptionId: dto.prescriptionId,
        animalId: dto.animalId,
        medicine: dto.medicine,
        quantity: parseFloat(dto.quantity) || 1,
        dispensedDate: dto.dispensedDate ? new Date(dto.dispensedDate) : new Date(),
        dispensedBy: dto.dispensedBy || 'Unknown',
        dispensedById: dto.dispensedById || null,
        batchNumber: dto.batchNumber || null,
        notes: dto.notes || null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userName: dto.dispensedBy || 'System',
        role: 'VETERINARIAN',
        action: 'Medicine Dispensed',
        entity: 'MEDICINE_DISPENSING',
        entityId: newRecord.id,
        newValue: JSON.stringify({ medicine: dto.medicine, quantity: dto.quantity, prescriptionId: dto.prescriptionId }),
      },
    });

    return newRecord;
  }

  async remove(id: string) {
    const record = await this.prisma.medicineDispensing.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`MedicineDispensing with ID ${id} not found`);
    return this.prisma.medicineDispensing.delete({ where: { id } });
  }
}
