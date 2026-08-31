import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrescriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(animalId?: string, status?: string) {
    const where: any = {};
    if (animalId) where.animalId = animalId;
    if (status) where.status = status;

    return this.prisma.prescription.findMany({
      where,
      include: {
        animal: {
          select: { id: true, name: true, tagNumber: true, animalCode: true, species: true,
            farm: { select: { id: true, farmerId: true, name: true } },
          },
        },
        dispensingRecords: { orderBy: { createdAt: 'desc' } },
        treatments: { orderBy: { administrationDate: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        animal: {
          include: { farm: true },
        },
        dispensingRecords: { orderBy: { createdAt: 'desc' } },
        treatments: { orderBy: { administrationDate: 'desc' } },
      },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');
    return prescription;
  }

  async create(data: any) {
    const count = await this.prisma.prescription.count();
    const prescriptionCode = `RX${String(count + 1).padStart(3, '0')}`;

    const startDate = data.startDate ? new Date(data.startDate) : null;
    const duration = data.duration ? parseInt(data.duration, 10) : 0;
    let endDate = data.endDate ? new Date(data.endDate) : null;
    if (!endDate && startDate && duration > 0) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);
    }

    const prescription = await this.prisma.prescription.create({
      data: {
        prescriptionCode,
        animalId: data.animalId,
        farmerId: data.farmerId || null,
        medicine: data.medicine,
        activeIngredient: data.activeIngredient || null,
        veterinarianId: data.veterinarianId || null,
        veterinarianName: data.veterinarianName || 'Unknown Vet',
        dosage: data.dosage,
        route: data.route || null,
        frequency: data.frequency || null,
        duration: duration,
        startDate,
        endDate,
        instructions: data.instructions || '',
        applicableWithdrawalPeriod: data.applicableWithdrawalPeriod ? parseInt(data.applicableWithdrawalPeriod, 10) : null,
        prescriptionDate: new Date(data.prescriptionDate || Date.now()),
        status: data.status || 'ACTIVE',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userName: data.veterinarianName || 'System Auto',
        role: 'VETERINARIAN',
        action: 'Prescription Created',
        entity: 'PRESCRIPTION',
        entityId: prescription.id,
        newValue: JSON.stringify({ prescriptionCode, medicine: data.medicine, duration: `${duration} days` }),
      },
    });

    return prescription;
  }

  async remove(id: string) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundException('Prescription not found');
    return this.prisma.prescription.delete({ where: { id } });
  }
}
