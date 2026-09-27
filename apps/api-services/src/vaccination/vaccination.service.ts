import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { Actor } from '../common/actor';
import { generateCode } from '../common/codes';
import { parseDate } from '../common/diff';

const FUTURE_TOLERANCE_MS = 10 * 60 * 1000;

@Injectable()
export class VaccinationService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
    private audit: AuditService,
  ) {}

  async findByAnimal(animalId?: string) {
    return this.prisma.vaccination.findMany({
      where: animalId ? { animalId } : undefined,
      orderBy: { vaccinationDate: 'desc' },
    });
  }

  async create(actor: Actor, dto: any) {
    if (!dto?.animalId) throw new BadRequestException('animalId is required');
    const vaccineName = String(dto.vaccineName || '').trim();
    if (!vaccineName) throw new BadRequestException('vaccineName is required');

    const animal = await this.prisma.animal.findUnique({ where: { id: dto.animalId } });
    if (!animal) throw new BadRequestException('Animal not found');
    if (animal.currentStatus === 'DEAD') throw new BadRequestException('Records of a deceased animal are closed.');

    const vaccinationDate = parseDate(dto.vaccinationDate, 'vaccinationDate') ?? new Date();
    if (vaccinationDate.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      throw new BadRequestException('vaccinationDate cannot be in the future');
    }
    const nextDueDate = parseDate(dto.nextDueDate, 'nextDueDate');
    if (!nextDueDate) throw new BadRequestException('nextDueDate is required');
    if (nextDueDate <= vaccinationDate) throw new BadRequestException('nextDueDate must be after the vaccination date');

    const cost = dto.cost === undefined || dto.cost === '' || dto.cost === null ? null : Number(dto.cost);
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) throw new BadRequestException('cost must be a non-negative number');

    const vac = await this.prisma.vaccination.create({
      data: {
        animalId: animal.id,
        vaccinationCode: dto.vaccinationCode || generateCode('VAC'),
        vaccineName,
        disease: dto.disease || null,
        route: dto.route || null,
        batchNumber: dto.batchNumber || null,
        manufacturer: dto.manufacturer || null,
        cost,
        notes: dto.notes || null,
        vaccinationDate,
        nextDueDate,
        veterinarianId: actor.id,
        veterinarianName: actor.name,
      },
    });

    await this.audit.record(actor, {
      action: 'VACCINATION_ADDED',
      entity: 'VACCINATION',
      entityId: vac.id,
      newValue: { animalId: animal.id, vaccineName, nextDueDate: nextDueDate.toISOString() },
    });
    await this.ledgerService.appendToLedger('CREATE_VACCINATION', vac.id, vac);
    return vac;
  }

  async getUpcoming() {
    return this.prisma.vaccination.findMany({
      where: {
        nextDueDate: {
          gte: new Date(),
        },
      },
      include: {
        animal: {
          select: {
            id: true,
            name: true,
            tagNumber: true,
            farm: { select: { name: true, farmerId: true } },
          },
        },
      },
      orderBy: { nextDueDate: 'asc' },
      take: 10,
    });
  }

  async remove(actor: Actor, id: string) {
    const record = await this.prisma.vaccination.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Vaccination record not found');
    await this.prisma.vaccination.delete({ where: { id } });
    await this.audit.record(actor, { action: 'VACCINATION_DELETED', entity: 'VACCINATION', entityId: id, oldValue: record });
    await this.ledgerService.appendToLedger('DELETE_VACCINATION', id, { deletedBy: actor.id, record });
    return { success: true };
  }
}
