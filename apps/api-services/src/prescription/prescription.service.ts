import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrescriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.prescription.findMany({
      include: {
        animal: {
          select: { name: true, tagNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: any) {
    const prescription = await this.prisma.prescription.create({
      data: {
        animalId: data.animalId,
        medicine: data.medicine,
        veterinarianId: data.veterinarianId,
        veterinarianName: data.veterinarianName || 'Unknown Vet',
        dosage: data.dosage,
        duration: data.duration ? parseInt(data.duration, 10) : 0,
        instructions: data.instructions || '',
        prescriptionDate: new Date(data.prescriptionDate || Date.now()),
        status: data.status || 'ACTIVE',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userName: data.veterinarianName || 'System Auto',
        action: 'Prescription Created',
        entity: 'PRESCRIPTION',
        entityId: prescription.id,
        newValue: JSON.stringify({ medicine: data.medicine, duration: `${data.duration} days` })
      }
    });

    return prescription;
  }

  async remove(id: string) {
    return this.prisma.prescription.delete({
      where: { id },
    });
  }
}
