import { Controller, Get, NotFoundException, Param, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ComplianceService } from '../compliance/compliance.service';
import { Public } from '../auth/permissions.decorator';

/**
 * Unauthenticated, read-only endpoints. They are designed to be safe to expose:
 * no personal data (owner names, phone numbers, addresses) is ever returned.
 */
@Public()
@Controller()
export class PublicController {
  private readonly startedAt = Date.now();

  constructor(
    private prisma: PrismaService,
    private compliance: ComplianceService,
  ) {}

  /** Liveness / readiness probe for load balancers and monitoring. */
  @Get('healthz')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'unreachable' });
    }
    return { status: 'ok', database: 'ok', uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000), time: new Date().toISOString() };
  }

  /** QR-code verification of an animal's food-safety status by animal code or ear-tag number. */
  @Get('public/verify/animal/:code')
  async verifyAnimal(@Param('code') code: string) {
    const ref = String(code || '').trim();
    const animal = ref
      ? await this.prisma.animal.findFirst({
          where: { OR: [{ animalCode: ref }, { tagNumber: ref }] },
          select: { id: true, animalCode: true, tagNumber: true, species: true, breed: true, currentStatus: true, farm: { select: { district: true, state: true } } },
        })
      : null;
    if (!animal) throw new NotFoundException('No registered animal matches this code');

    const products = animal.species === 'POULTRY' ? ['MEAT', 'EGGS'] : ['MILK', 'MEAT'];
    const clearances: Record<string, { cleared: boolean; status: string; restrictedUntil: Date | null }> = {};
    for (const p of products) {
      const c = await this.compliance.checkClearance(animal.id, p);
      clearances[p] = { cleared: c.cleared, status: c.status, restrictedUntil: c.restrictionEnd ?? null };
    }
    return {
      verified: true,
      animalCode: animal.animalCode,
      tagNumber: animal.tagNumber,
      species: animal.species,
      breed: animal.breed,
      lifecycleStatus: animal.currentStatus,
      region: [animal.farm?.district, animal.farm?.state].filter(Boolean).join(', ') || null,
      clearances,
      checkedAt: new Date().toISOString(),
    };
  }

  /** Verification of a product batch / lot's release status. */
  @Get('public/verify/batch/:code')
  async verifyBatch(@Param('code') code: string) {
    const ref = String(code || '').trim();
    const batch = ref ? await this.prisma.collectionBatch.findUnique({ where: { batchCode: ref } }) : null;
    if (!batch) throw new NotFoundException('No registered batch matches this code');
    const lots = await this.prisma.milkCollection.findMany({ where: { collectionBatchId: batch.id }, select: { batchId: true } });
    const refs = [batch.batchCode, ...lots.map((l) => l.batchId).filter((b): b is string => !!b)];
    const tests = await this.prisma.milkTest.findMany({ where: { batchId: { in: refs } }, select: { result: true, testDate: true } });
    return {
      verified: true,
      batchCode: batch.batchCode,
      productType: batch.productType,
      collectionDate: batch.collectionDate,
      status: batch.status,
      releasedForSale: batch.status === 'RELEASED',
      laboratory: {
        tests: tests.length,
        passed: tests.filter((t) => t.result === 'PASS').length,
        failed: tests.filter((t) => t.result === 'FAIL').length,
        lastTested: tests.reduce<Date | null>((d, t) => (!d || t.testDate > d ? t.testDate : d), null),
      },
      checkedAt: new Date().toISOString(),
    };
  }
}
