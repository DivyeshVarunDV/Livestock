import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { Actor } from '../common/actor';
import { generateCode } from '../common/codes';
import { diffFields, parseDate, requireFields } from '../common/diff';

const FARM_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
const EDITABLE_FIELDS = [
  'name', 'farmerId', 'ownerName', 'fullName', 'address', 'contactNumber', 'mobileNumber',
  'location', 'village', 'district', 'state', 'governmentId', 'farmStatus', 'registrationDate', 'ownerId',
] as const;

@Injectable()
export class FarmService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** Farmers may only ever see farms they own. */
  static scopeFor(actor: Actor) {
    return actor.role === 'FARMER' ? { ownerId: actor.id ?? '__none__' } : {};
  }

  async findAll(actor: Actor) {
    return this.prisma.farm.findMany({
      where: FarmService.scopeFor(actor),
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { animals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(actor: Actor, id: string) {
    const farm = await this.prisma.farm.findFirst({
      where: { id, ...FarmService.scopeFor(actor) },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        animals: {
          include: {
            withdrawalRecords: {
              where: { status: 'RESTRICTED' },
              orderBy: { withdrawalEndDate: 'desc' },
            },
            violations: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        milkCollections: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        violations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!farm) throw new NotFoundException('Farm not found');
    return farm;
  }

  private async validateOwner(ownerId: unknown) {
    if (!ownerId) return;
    const owner = await this.prisma.user.findUnique({ where: { id: String(ownerId) } });
    if (!owner) throw new BadRequestException('Selected owner account does not exist');
    if (owner.role !== 'FARMER') throw new BadRequestException('A farm owner account must have the FARMER role');
  }

  private async assertFarmerIdFree(farmerId: string, exceptId?: string) {
    const clash = await this.prisma.farm.findFirst({ where: { farmerId, ...(exceptId ? { id: { not: exceptId } } : {}) } });
    if (clash) throw new ConflictException(`Farmer ID ${farmerId} is already registered to another farm`);
  }

  async create(actor: Actor, dto: any) {
    requireFields(dto, ['name', 'address', 'location']);
    if (!dto.contactNumber && !dto.mobileNumber) {
      throw new BadRequestException('A contact or mobile number is required');
    }
    if (dto.farmStatus && !FARM_STATUSES.includes(dto.farmStatus)) {
      throw new BadRequestException(`farmStatus must be one of ${FARM_STATUSES.join(', ')}`);
    }
    await this.validateOwner(dto.ownerId);

    const farmerId = dto.farmerId ? String(dto.farmerId).trim() : generateCode('FRM');
    await this.assertFarmerIdFree(farmerId);

    const created = await this.prisma.farm.create({
      data: {
        name: String(dto.name).trim(),
        farmerId,
        ownerName: dto.ownerName || dto.fullName || 'Unknown Owner',
        fullName: dto.fullName || dto.ownerName || dto.name,
        address: dto.address,
        contactNumber: dto.contactNumber || dto.mobileNumber || '',
        mobileNumber: dto.mobileNumber || dto.contactNumber || null,
        location: dto.location,
        village: dto.village || null,
        district: dto.district || null,
        state: dto.state || null,
        governmentId: dto.governmentId || null,
        registrationDate: parseDate(dto.registrationDate, 'registrationDate') ?? new Date(),
        farmStatus: dto.farmStatus || 'ACTIVE',
        ...(dto.ownerId ? { owner: { connect: { id: dto.ownerId } } } : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    await this.audit.record(actor, {
      action: 'FARM_REGISTERED',
      entity: 'FARM',
      entityId: created.id,
      newValue: { farmerId, name: created.name, district: created.district, ownerId: created.ownerId },
    });
    return created;
  }

  async update(actor: Actor, id: string, dto: any) {
    const existing = await this.prisma.farm.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Farm not found');

    const data: any = {};
    for (const key of EDITABLE_FIELDS) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    if (data.farmStatus !== undefined && !FARM_STATUSES.includes(data.farmStatus)) {
      throw new BadRequestException(`farmStatus must be one of ${FARM_STATUSES.join(', ')}`);
    }
    if (data.registrationDate !== undefined) data.registrationDate = parseDate(data.registrationDate, 'registrationDate');
    if (data.farmerId !== undefined) {
      data.farmerId = String(data.farmerId).trim();
      if (!data.farmerId) throw new BadRequestException('farmerId cannot be empty');
      await this.assertFarmerIdFree(data.farmerId, id);
    }
    for (const required of ['name', 'address', 'location'] as const) {
      if (data[required] !== undefined && String(data[required]).trim() === '') {
        throw new BadRequestException(`${required} cannot be empty`);
      }
    }
    if (data.ownerId !== undefined) {
      if (data.ownerId) await this.validateOwner(data.ownerId);
      else data.ownerId = null;
    }

    const updated = await this.prisma.farm.update({ where: { id }, data });
    const diff = diffFields(existing, updated, Object.keys(data));
    if (diff.changed) {
      await this.audit.record(actor, { action: 'FARM_UPDATED', entity: 'FARM', entityId: id, oldValue: diff.before, newValue: diff.after });
    }
    return updated;
  }

  async remove(actor: Actor, id: string) {
    const farm = await this.prisma.farm.findUnique({
      where: { id },
      include: {
        _count: {
          select: { animals: true, milkCollections: true, violations: true, milkTests: true, ownershipTransfersAsFrom: true, ownershipTransfersAsTo: true },
        },
      },
    });
    if (!farm) throw new NotFoundException('Farm not found');
    const linked = Object.entries(farm._count).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`);
    if (linked.length > 0) {
      throw new ConflictException(
        `Farm has registered records (${linked.join(', ')}) and cannot be deleted. Set its status to INACTIVE instead.`,
      );
    }
    await this.prisma.farm.delete({ where: { id } });
    const { _count, ...snapshot } = farm;
    await this.audit.record(actor, { action: 'FARM_DELETED', entity: 'FARM', entityId: id, oldValue: snapshot });
    return { success: true };
  }
}
