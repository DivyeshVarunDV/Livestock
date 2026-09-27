import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { Actor, SYSTEM_ACTOR } from '../common/actor';

const DAY_MS = 24 * 60 * 60 * 1000;
export const CLEARING_SOON_DAYS = 3;

export type MrlStatus = 'CLEARED' | 'CLEARING_SOON' | 'DO_NOT_SELL';

export interface WithdrawalLike {
  productType: string;
  medicine: string;
  treatmentDate: Date | string;
  withdrawalEndDate: Date | string;
  id?: string;
}

/** Pure: MRL status of an animal given all of its withdrawal records. */
export function deriveMrlStatus(withdrawals: Pick<WithdrawalLike, 'withdrawalEndDate'>[], now = new Date()): {
  mrlStatus: MrlStatus;
  latestEnd: Date | null;
} {
  let latest: Date | null = null;
  for (const w of withdrawals) {
    const end = new Date(w.withdrawalEndDate);
    if (end > now && (!latest || end > latest)) latest = end;
  }
  if (!latest) return { mrlStatus: 'CLEARED', latestEnd: null };
  const daysLeft = (latest.getTime() - now.getTime()) / DAY_MS;
  return { mrlStatus: daysLeft <= CLEARING_SOON_DAYS ? 'CLEARING_SOON' : 'DO_NOT_SELL', latestEnd: latest };
}

/** Pure: clearance of one product type given all withdrawal records of the animal. */
export function deriveProductClearance(withdrawals: WithdrawalLike[], productType: string, now = new Date()) {
  const active = withdrawals.filter((w) => w.productType === productType && new Date(w.withdrawalEndDate) > now);
  if (active.length === 0) {
    return { status: 'CLEARED' as const, reason: null, restrictionStart: null, restrictionEnd: null, relatedWithdrawalId: null };
  }
  const governing = active.reduce((a, b) => (new Date(a.withdrawalEndDate) >= new Date(b.withdrawalEndDate) ? a : b));
  return {
    status: 'RESTRICTED' as const,
    reason: `Active withdrawal: ${[...new Set(active.map((w) => w.medicine))].join(', ')}`,
    restrictionStart: new Date(Math.min(...active.map((w) => new Date(w.treatmentDate).getTime()))),
    restrictionEnd: new Date(governing.withdrawalEndDate),
    relatedWithdrawalId: governing.id ?? null,
  };
}

/**
 * Single source of truth for withdrawal / MRL / product-clearance state.
 *
 * Withdrawal end dates are authoritative; cached statuses (withdrawal record
 * status, animal.mrlStatus, ProductClearance rows) are always re-derived from
 * them, so a restriction can neither be lifted early (e.g. by a later, shorter
 * treatment) nor linger after it has legally expired. A background sweep keeps
 * cached state current as time passes.
 */
@Injectable()
export class ComplianceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ComplianceService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    const minutes = Number(process.env.COMPLIANCE_SWEEP_MINUTES || 60);
    if (minutes <= 0) return;
    const run = () =>
      this.sweep()
        .then((n) => n > 0 && this.logger.log(`Compliance sweep re-evaluated ${n} animal(s).`))
        .catch((err) => this.logger.error(`Compliance sweep failed: ${(err as Error).message}`));
    setTimeout(run, 5_000).unref();
    this.timer = setInterval(run, minutes * 60_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Active (not yet expired) restriction for an animal/product, straight from withdrawal records. */
  async activeRestriction(animalId: string, productType: string, at = new Date()) {
    return this.prisma.withdrawalRecord.findFirst({
      where: { animalId, productType, withdrawalEndDate: { gt: at } },
      orderBy: { withdrawalEndDate: 'desc' },
    });
  }

  /** Re-derives and persists every compliance field for one animal. */
  async recomputeAnimal(animalId: string, actor: Actor = SYSTEM_ACTOR) {
    const animal = await this.prisma.animal.findUnique({ where: { id: animalId } });
    if (!animal) throw new NotFoundException('Animal not found');
    const now = new Date();

    const withdrawals = await this.prisma.withdrawalRecord.findMany({ where: { animalId } });

    // 1. Withdrawal record statuses
    for (const w of withdrawals) {
      const next = new Date(w.withdrawalEndDate) > now ? 'RESTRICTED' : 'WITHDRAWAL_COMPLETED';
      if (w.status !== next) {
        await this.prisma.withdrawalRecord.update({ where: { id: w.id }, data: { status: next } });
      }
    }

    // 2. Product clearances (every product type that has ever been restricted or tracked)
    const existing = await this.prisma.productClearance.findMany({ where: { animalId } });
    const productTypes = new Set<string>([...withdrawals.map((w) => w.productType), ...existing.map((c) => c.productType)]);
    for (const productType of productTypes) {
      const current = existing.find((c) => c.productType === productType);
      // An investigation hold is only lifted by closing the case (releaseInvestigationHold), never by time.
      if (current?.status === 'UNDER_INVESTIGATION') continue;
      const data = deriveProductClearance(withdrawals, productType, now);
      if (current) {
        const changed =
          current.status !== data.status ||
          current.reason !== data.reason ||
          current.relatedWithdrawalId !== data.relatedWithdrawalId ||
          (current.restrictionEnd?.getTime() ?? null) !== (data.restrictionEnd?.getTime() ?? null);
        if (changed) await this.prisma.productClearance.update({ where: { id: current.id }, data });
      } else {
        await this.prisma.productClearance.create({ data: { animalId, productType, ...data } });
      }
    }

    // 3. Animal MRL status and clinical status
    const { mrlStatus } = deriveMrlStatus(withdrawals, now);
    const data: { mrlStatus: string; status?: string } = { mrlStatus };
    if (animal.status !== 'QUARANTINED') {
      if (mrlStatus !== 'CLEARED') data.status = 'UNDER_TREATMENT';
      else if (animal.mrlStatus !== 'CLEARED' && animal.status === 'UNDER_TREATMENT') data.status = 'HEALTHY';
    }
    if (animal.mrlStatus !== data.mrlStatus || (data.status && data.status !== animal.status)) {
      await this.prisma.animal.update({ where: { id: animalId }, data });
    }
    if (animal.mrlStatus !== mrlStatus) {
      await this.audit.record(actor, {
        action: mrlStatus === 'CLEARED' ? 'WITHDRAWAL_CLEARED' : 'MRL_STATUS_CHANGED',
        entity: 'ANIMAL',
        entityId: animalId,
        oldValue: animal.mrlStatus,
        newValue: mrlStatus,
      });
    }
    return { animalId, mrlStatus };
  }

  /** Re-evaluates every animal whose cached state could be stale. Returns the count processed. */
  async sweep(actor: Actor = SYSTEM_ACTOR): Promise<number> {
    const candidates = await this.prisma.animal.findMany({
      where: {
        OR: [
          { mrlStatus: { not: 'CLEARED' } },
          { withdrawalRecords: { some: { status: 'RESTRICTED' } } },
          { productClearances: { some: { status: 'RESTRICTED' } } },
        ],
      },
      select: { id: true },
    });
    for (const a of candidates) {
      await this.recomputeAnimal(a.id, actor);
    }
    return candidates.length;
  }

  /** Places an investigation hold: the product may not be supplied until the case is closed. */
  async placeInvestigationHold(animalId: string, productType: string, reason: string) {
    const type = productType.toUpperCase();
    const existing = await this.prisma.productClearance.findFirst({ where: { animalId, productType: type } });
    const data = { status: 'UNDER_INVESTIGATION', reason, restrictionStart: new Date(), restrictionEnd: null };
    if (existing) await this.prisma.productClearance.update({ where: { id: existing.id }, data });
    else await this.prisma.productClearance.create({ data: { animalId, productType: type, ...data } });
  }

  /** Lifts an investigation hold once no open violation remains for the animal/product. */
  async releaseInvestigationHold(animalId: string, productType: string | null, actor: Actor = SYSTEM_ACTOR) {
    const open = await this.prisma.violation.count({
      where: {
        animalId,
        status: { in: ['PENDING_INVESTIGATION', 'UNDER_REVIEW', 'CONFIRMED'] },
        ...(productType ? { OR: [{ productType: productType.toUpperCase() }, { productType: null }] } : {}),
      },
    });
    if (open > 0) return false;
    await this.prisma.productClearance.updateMany({
      where: { animalId, status: 'UNDER_INVESTIGATION', ...(productType ? { productType: productType.toUpperCase() } : {}) },
      data: { status: 'CLEARED', reason: null, restrictionStart: null, restrictionEnd: null },
    });
    // Re-derive: an active withdrawal may still restrict the product.
    await this.recomputeAnimal(animalId, actor);
    return true;
  }

  /** Live clearance decision for selling/collecting a product from an animal. */
  async checkClearance(animalId: string, productType: string) {
    const animal = await this.prisma.animal.findUnique({ where: { id: animalId } });
    if (!animal) throw new NotFoundException('Animal not found');
    const type = productType.toUpperCase();

    if (animal.currentStatus === 'DEAD') {
      return { cleared: false, status: 'RESTRICTED', reason: 'Animal is recorded as deceased', restrictionEnd: null };
    }
    const active = await this.activeRestriction(animalId, type);
    if (active) {
      return { cleared: false, status: 'RESTRICTED', reason: `Active withdrawal: ${active.medicine}`, restrictionEnd: active.withdrawalEndDate };
    }
    const hold = await this.prisma.productClearance.findFirst({ where: { animalId, productType: type, status: 'UNDER_INVESTIGATION' } });
    if (hold) {
      return { cleared: false, status: 'UNDER_INVESTIGATION', reason: hold.reason, restrictionEnd: hold.restrictionEnd };
    }
    return { cleared: true, status: 'CLEARED', reason: null, restrictionEnd: null };
  }
}
