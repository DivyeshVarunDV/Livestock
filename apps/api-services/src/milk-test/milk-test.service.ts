import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { ComplianceService } from '../compliance/compliance.service';
import { NotificationService } from '../notification/notification.service';
import { Actor } from '../common/actor';
import { generateCode } from '../common/codes';
import { parseDate } from '../common/diff';
import { resolveBatchScope } from '../collection-batch/collection-batch.service';

const RESULTS = ['PASS', 'FAIL', 'PENDING'];
const FUTURE_TOLERANCE_MS = 10 * 60 * 1000;

function optionalNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n < 0) throw new BadRequestException(`${field} must be a non-negative number`);
  return n;
}

/** Leading numeric value of an MRL limit such as "50 ug/kg". */
export function parseMrlLimit(limit?: string | null): number | null {
  if (!limit) return null;
  const m = String(limit).match(/^\s*([0-9]+(?:\.[0-9]+)?)/);
  return m ? parseFloat(m[1]) : null;
}

/**
 * Server-side compliance decision. Numeric evidence is authoritative: a
 * submitted result that contradicts the measured residue is rejected.
 */
export function evaluateResult(input: { result?: string | null; measuredValue: number | null; mrlValue: number | null }) {
  const claimed = input.result ? String(input.result).toUpperCase() : null;
  if (claimed && !RESULTS.includes(claimed)) {
    throw new BadRequestException(`result must be one of ${RESULTS.join(', ')}`);
  }
  if (input.measuredValue !== null && input.mrlValue !== null) {
    const complianceStatus = input.measuredValue <= input.mrlValue ? 'COMPLIANT' : 'NON_COMPLIANT';
    const derived = complianceStatus === 'COMPLIANT' ? 'PASS' : 'FAIL';
    if (claimed && claimed !== 'PENDING' && claimed !== derived) {
      throw new BadRequestException(
        `Result ${claimed} contradicts the measured residue (${input.measuredValue} vs MRL ${input.mrlValue}). The result must be ${derived}.`,
      );
    }
    return { result: derived, complianceStatus };
  }
  const result = claimed ?? 'PENDING';
  const complianceStatus = result === 'PASS' ? 'COMPLIANT' : result === 'FAIL' ? 'NON_COMPLIANT' : 'NOT_EVALUATED';
  return { result, complianceStatus };
}

@Injectable()
export class MilkTestService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private ledger: LedgerService,
    private compliance: ComplianceService,
    private notifications: NotificationService,
  ) {}

  async findAll() {
    return this.prisma.milkTest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.milkTest.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Record not found');
    return record;
  }

  async create(actor: Actor, dto: any) {
    const ref = String(dto?.batchId || '').trim();
    if (!ref) throw new BadRequestException('batchId (lot or batch code) is required');
    const scope = await resolveBatchScope(this.prisma, ref);
    if (!scope.aggregate && scope.collections.length === 0) {
      throw new BadRequestException(`No collection lot or batch is registered under "${ref}". Results can only be recorded against registered product.`);
    }

    const testDate = parseDate(dto.testDate, 'testDate') ?? new Date();
    if (testDate.getTime() > Date.now() + FUTURE_TOLERANCE_MS) throw new BadRequestException('testDate cannot be in the future');

    const substance = dto.substance ? String(dto.substance).trim() : null;
    const measuredValue = optionalNumber(dto.measuredValue, 'measuredValue');
    let mrlValue = optionalNumber(dto.applicableMRLValue, 'applicableMRLValue');
    let mrlSource: string | null = mrlValue !== null ? 'submitted' : null;
    if (mrlValue === null && substance && measuredValue !== null) {
      // Fall back to the regulatory MRL table.
      const rules = await this.prisma.mrlRule.findMany({ where: { status: 'ACTIVE' } });
      const match = rules.find(
        (r) => [r.substance, r.drugName].filter(Boolean).some((n) => String(n).toLowerCase() === substance.toLowerCase()) && parseMrlLimit(r.mrlLimit) !== null,
      );
      if (match) {
        mrlValue = parseMrlLimit(match.mrlLimit);
        mrlSource = `MRL rule ${match.drugName}/${match.species}`;
      }
    }
    const { result, complianceStatus } = evaluateResult({ result: dto.result, measuredValue, mrlValue });

    const productType = String(dto.productType || scope.aggregate?.productType || scope.collections[0]?.productType || 'MILK').toUpperCase();
    const singleLot = !scope.aggregate || scope.collections.length === 1 ? scope.collections[0] : undefined;

    const record = await this.prisma.milkTest.create({
      data: {
        testCode: generateCode('LAB'),
        batchId: ref,
        sampleId: dto.sampleId || null,
        productType,
        date: parseDate(dto.date, 'date') ?? testDate,
        testDate,
        type: dto.type || null,
        result,
        substance,
        measuredValue,
        measuredUnit: dto.measuredUnit || 'ug/kg',
        applicableMRLValue: mrlValue,
        complianceStatus,
        notes: dto.remarks || dto.notes || null,
        location: dto.location || null,
        testingLocation: dto.testingLocation || dto.location || null,
        farmId: singleLot?.farmId ?? null,
        animalId: singleLot?.animalId ?? null,
        recordedById: actor.id,
        recordedByName: actor.name,
      },
    });

    const failed = result === 'FAIL';
    let violationsRaised = 0;
    if (failed) {
      violationsRaised = await this.handleFailure(actor, scope, record.id, ref, productType, {
        substance,
        measuredValue,
        mrlValue,
        unit: record.measuredUnit,
        remarks: dto.remarks || dto.notes || null,
      });
    } else if (scope.aggregate && ['CREATED', 'COLLECTED'].includes(scope.aggregate.status)) {
      await this.prisma.collectionBatch.update({ where: { id: scope.aggregate.id }, data: { status: 'TESTING' } });
    }

    await this.audit.record(actor, {
      action: 'LAB_RESULT_RECORDED',
      entity: 'PRODUCT_TEST',
      entityId: record.id,
      newValue: { batchId: ref, result, complianceStatus, substance, measuredValue, mrlValue, mrlSource, violationsRaised },
    });
    await this.ledger.appendToLedger('CREATE_LAB_RESULT', record.id, record);

    return { ...record, violationsRaised };
  }

  /**
   * A failed result is traced back to every contributing farm/animal: each
   * gets a compliance case and an investigation hold on the product, and the
   * batch is failed (or recalled if already released).
   */
  private async handleFailure(
    actor: Actor,
    scope: Awaited<ReturnType<typeof resolveBatchScope>>,
    testId: string,
    ref: string,
    productType: string,
    evidence: { substance: string | null; measuredValue: number | null; mrlValue: number | null; unit: string | null; remarks: string | null },
  ) {
    if (scope.aggregate) {
      const status = scope.aggregate.status;
      const next = status === 'RELEASED' ? 'UNDER_INVESTIGATION' : status === 'REJECTED' ? status : 'FAILED';
      if (next !== status) {
        await this.prisma.collectionBatch.update({ where: { id: scope.aggregate.id }, data: { status: next } });
      }
      if (status === 'RELEASED') {
        await this.notifications.notify({
          title: 'PRODUCT RECALL REQUIRED',
          message: `Released batch ${scope.aggregate.batchCode} failed a residue test and has been placed under investigation.`,
          type: 'ALERT',
          entityId: scope.aggregate.id,
          roles: ['ADMIN', 'TESTER'],
        });
      }
    }

    const text =
      evidence.remarks ||
      `Residue detected: ${evidence.substance || 'Unknown'} (${evidence.measuredValue ?? 'n/a'} ${evidence.unit || 'ug/kg'}, MRL: ${evidence.mrlValue ?? 'N/A'})`;

    const sources = new Map<string, { farmId: string | null; animalId: string | null; collectionId: string | null }>();
    for (const c of scope.collections) {
      sources.set(`${c.farmId}|${c.animalId}`, { farmId: c.farmId, animalId: c.animalId, collectionId: c.id });
    }
    if (sources.size === 0) sources.set('batch', { farmId: null, animalId: null, collectionId: null });

    for (const s of sources.values()) {
      await this.prisma.violation.create({
        data: {
          violationCode: generateCode('VIO'),
          farmId: s.farmId,
          animalId: s.animalId,
          collectionId: s.collectionId,
          batchId: ref,
          productType,
          date: new Date(),
          type: 'FAILED_PRODUCT_TEST',
          description: `Laboratory result ${testId} failed for ${ref}`,
          severity: 'HIGH',
          evidence: text,
          status: 'PENDING_INVESTIGATION',
          veterinarianId: actor.id,
          veterinarianName: actor.name,
        },
      });
      if (s.animalId) {
        await this.compliance.placeInvestigationHold(s.animalId, productType, `Failed residue test on ${ref}`);
      }
    }

    await this.notifications.notify({
      title: 'Failed residue test',
      message: `${ref}: ${text}. ${sources.size} source(s) placed under investigation.`,
      type: 'ALERT',
      entityId: testId,
      roles: ['ADMIN'],
    });
    return sources.size;
  }

  /** Results are immutable evidence; only remarks can be amended (re-test to change a result). */
  async update(actor: Actor, id: string, dto: any) {
    const existing = await this.findOne(id);
    for (const locked of ['result', 'measuredValue', 'applicableMRLValue', 'complianceStatus', 'substance', 'batchId', 'testDate'] as const) {
      if (dto?.[locked] !== undefined && String(dto[locked]) !== String((existing as any)[locked] instanceof Date ? (existing as any)[locked].toISOString() : (existing as any)[locked])) {
        throw new BadRequestException(`Laboratory ${locked} cannot be altered after it is recorded. Record a re-test instead.`);
      }
    }
    const notes = dto?.remarks ?? dto?.notes;
    if (notes === undefined) return existing;
    const updated = await this.prisma.milkTest.update({ where: { id }, data: { notes } });
    await this.audit.record(actor, {
      action: 'LAB_RESULT_REMARKS_AMENDED',
      entity: 'PRODUCT_TEST',
      entityId: id,
      oldValue: { notes: existing.notes },
      newValue: { notes },
    });
    return updated;
  }

  async remove(actor: Actor, id: string) {
    const existing = await this.findOne(id);
    await this.prisma.milkTest.delete({ where: { id } });
    await this.audit.record(actor, { action: 'LAB_RESULT_DELETED', entity: 'PRODUCT_TEST', entityId: id, oldValue: existing });
    await this.ledger.appendToLedger('DELETE_LAB_RESULT', id, { deletedBy: actor.id, record: existing });
    return { success: true };
  }
}
