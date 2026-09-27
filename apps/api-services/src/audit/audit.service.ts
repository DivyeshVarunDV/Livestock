import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma.service';
import { Actor, SYSTEM_ACTOR } from '../common/actor';

export const AUDIT_GENESIS_HASH = '0'.repeat(64);
const MAX_VALUE_LENGTH = 20000;

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface AuditFilters {
  role?: string;
  entity?: string;
  action?: string;
  entityId?: string;
  userId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

function serialize(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return s.length > MAX_VALUE_LENGTH ? `${s.slice(0, MAX_VALUE_LENGTH)}…[truncated]` : s;
}

/**
 * Append-only, hash-chained audit trail.
 *
 * Each row stores `sequence`, `prevHash` and `hash = sha256(prevHash | fields)`.
 * Altering, deleting or re-ordering any historic row breaks the chain, which
 * `verifyChain()` detects and reports. Writes are serialised in-process so the
 * chain never forks; the unique `sequence` column guards against a second
 * writer (the write is retried on conflict).
 */
@Injectable()
export class AuditService implements OnModuleInit {
  private readonly logger = new Logger(AuditService.name);
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    try {
      const sealed = await this.sealLegacyEntries();
      if (sealed > 0) this.logger.log(`Sealed ${sealed} pre-existing audit entries into the hash chain.`);
    } catch (err) {
      this.logger.error(`Failed to seal legacy audit entries: ${(err as Error).message}`);
    }
  }

  static computeHash(row: {
    sequence: number;
    prevHash: string;
    createdAt: Date;
    userId: string | null;
    userEmail: string | null;
    userName: string | null;
    role: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    oldValue: string | null;
    newValue: string | null;
    ipAddress: string | null;
  }): string {
    const canonical = JSON.stringify([
      row.sequence,
      row.prevHash,
      row.createdAt.toISOString(),
      row.userId,
      row.userEmail,
      row.userName,
      row.role,
      row.action,
      row.entity,
      row.entityId,
      row.oldValue,
      row.newValue,
      row.ipAddress,
    ]);
    return createHash('sha256').update(canonical).digest('hex');
  }

  /** Runs `fn` after all previously queued chain writes; a failure never blocks later writes. */
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Records an audit event attributed to `actor`. Never throws into business flows. */
  record(actor: Actor | null | undefined, entry: AuditEntry) {
    const who = actor ?? SYSTEM_ACTOR;
    return this.enqueue(() => this.append(who, entry)).catch((err) => {
      this.logger.error(`Audit write failed for ${entry.action} ${entry.entity}: ${(err as Error).message}`);
      return null;
    });
  }

  private async append(actor: Actor, entry: AuditEntry, attempt = 0): Promise<unknown> {
    const last = await this.prisma.auditLog.findFirst({
      where: { sequence: { not: null } },
      orderBy: { sequence: 'desc' },
      select: { sequence: true, hash: true },
    });
    const row = {
      sequence: (last?.sequence ?? 0) + 1,
      prevHash: last?.hash ?? AUDIT_GENESIS_HASH,
      createdAt: new Date(),
      userId: actor.id ?? null,
      userEmail: actor.email ?? null,
      userName: actor.name ?? null,
      role: actor.role ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      oldValue: serialize(entry.oldValue),
      newValue: serialize(entry.newValue),
      ipAddress: actor.ip ?? null,
    };
    try {
      return await this.prisma.auditLog.create({ data: { ...row, hash: AuditService.computeHash(row) } });
    } catch (err: any) {
      if (err?.code === 'P2002' && attempt < 3) return this.append(actor, entry, attempt + 1);
      throw err;
    }
  }

  /** Chains any rows written before hash-chaining existed, in creation order. */
  async sealLegacyEntries(): Promise<number> {
    const legacy = await this.prisma.auditLog.findMany({
      where: { sequence: null },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    if (legacy.length === 0) return 0;

    await this.enqueue(async () => {
      const last = await this.prisma.auditLog.findFirst({
        where: { sequence: { not: null } },
        orderBy: { sequence: 'desc' },
        select: { sequence: true, hash: true },
      });
      let sequence = last?.sequence ?? 0;
      let prevHash = last?.hash ?? AUDIT_GENESIS_HASH;
      for (const r of legacy) {
        sequence += 1;
        const hash = AuditService.computeHash({ ...r, sequence, prevHash });
        await this.prisma.auditLog.update({ where: { id: r.id }, data: { sequence, prevHash, hash } });
        prevHash = hash;
      }
    });
    return legacy.length;
  }

  async verifyChain() {
    const rows = await this.prisma.auditLog.findMany({
      where: { sequence: { not: null } },
      orderBy: { sequence: 'asc' },
    });
    let expectedPrev = AUDIT_GENESIS_HASH;
    let expectedSeq = 1;
    for (const r of rows) {
      if (r.sequence !== expectedSeq) {
        return { valid: false, checked: rows.length, brokenAtSequence: expectedSeq, reason: 'Missing or re-ordered entry (sequence gap)' };
      }
      if (r.prevHash !== expectedPrev) {
        return { valid: false, checked: rows.length, brokenAtSequence: r.sequence, entryId: r.id, reason: 'Previous-hash link mismatch' };
      }
      const recomputed = AuditService.computeHash({ ...r, sequence: r.sequence!, prevHash: r.prevHash! });
      if (recomputed !== r.hash) {
        return { valid: false, checked: rows.length, brokenAtSequence: r.sequence, entryId: r.id, reason: 'Entry content was modified after it was recorded' };
      }
      expectedPrev = r.hash!;
      expectedSeq += 1;
    }
    const unsealed = await this.prisma.auditLog.count({ where: { sequence: null } });
    return { valid: true, checked: rows.length, unsealed, headHash: rows.length ? expectedPrev : null, verifiedAt: new Date().toISOString() };
  }

  async findAll(filters: AuditFilters = {}) {
    const where: any = {};
    if (filters.role && filters.role !== 'ALL') where.role = filters.role;
    if (filters.entity && filters.entity !== 'ALL') where.entity = filters.entity;
    if (filters.action && filters.action !== 'ALL') where.action = filters.action;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 200, 1), 5000);
    return this.prisma.auditLog.findMany({ where, orderBy: [{ createdAt: 'desc' }, { sequence: 'desc' }], take: limit });
  }

  async exportCsv(filters: AuditFilters = {}) {
    const rows = await this.findAll({ ...filters, limit: filters.limit ?? 5000 });
    const header = ['sequence', 'timestamp', 'userName', 'userEmail', 'role', 'action', 'entity', 'entityId', 'oldValue', 'newValue', 'ipAddress', 'hash'];
    const escape = (v: unknown) => {
      let s = v === null || v === undefined ? '' : String(v instanceof Date ? v.toISOString() : v);
      // Neutralise spreadsheet formula injection.
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = rows.map((r) =>
      [r.sequence, r.createdAt, r.userName, r.userEmail, r.role, r.action, r.entity, r.entityId, r.oldValue, r.newValue, r.ipAddress, r.hash]
        .map(escape)
        .join(','),
    );
    return [header.join(','), ...lines].join('\r\n');
  }
}
