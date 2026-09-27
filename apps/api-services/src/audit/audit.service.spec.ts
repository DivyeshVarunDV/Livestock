import { AuditService, AUDIT_GENESIS_HASH } from './audit.service';

/** Minimal in-memory stand-in for the auditLog table. */
function fakePrisma() {
  const rows: any[] = [];
  let id = 0;
  const sortBySeq = (a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0);
  return {
    rows,
    auditLog: {
      findFirst: jest.fn(async () => [...rows].filter((r) => r.sequence !== null).sort(sortBySeq).pop() ?? null),
      findMany: jest.fn(async ({ where }: any) =>
        where?.sequence === null
          ? rows.filter((r) => r.sequence === null).sort((a, b) => a.createdAt - b.createdAt)
          : rows.filter((r) => r.sequence !== null).sort(sortBySeq),
      ),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `log-${++id}`, ...data };
        rows.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id), data)),
      count: jest.fn(async () => rows.filter((r) => r.sequence === null).length),
    },
  };
}

const actor = { id: 'u1', email: 'vet@example.gov', name: 'Dr Vet', role: 'VETERINARIAN', ip: '10.0.0.1' };

describe('AuditService hash chain', () => {
  it('chains entries and verifies them', async () => {
    const prisma = fakePrisma();
    const service = new AuditService(prisma as any);
    await service.record(actor, { action: 'A', entity: 'X', entityId: '1', newValue: { a: 1 } });
    await service.record(actor, { action: 'B', entity: 'X', entityId: '2' });
    await service.record(null, { action: 'C', entity: 'Y' });

    expect(prisma.rows.map((r) => r.sequence)).toEqual([1, 2, 3]);
    expect(prisma.rows[0].prevHash).toBe(AUDIT_GENESIS_HASH);
    expect(prisma.rows[1].prevHash).toBe(prisma.rows[0].hash);
    expect(prisma.rows[2].role).toBe('SYSTEM');
    await expect(service.verifyChain()).resolves.toEqual(expect.objectContaining({ valid: true, checked: 3 }));
  });

  it('serialises concurrent writes without forking the chain', async () => {
    const prisma = fakePrisma();
    const service = new AuditService(prisma as any);
    await Promise.all(Array.from({ length: 10 }, (_, i) => service.record(actor, { action: `A${i}`, entity: 'X' })));
    expect(new Set(prisma.rows.map((r) => r.sequence)).size).toBe(10);
    await expect(service.verifyChain()).resolves.toEqual(expect.objectContaining({ valid: true }));
  });

  it('detects an entry modified after the fact', async () => {
    const prisma = fakePrisma();
    const service = new AuditService(prisma as any);
    await service.record(actor, { action: 'TREATMENT_CREATED', entity: 'TREATMENT', newValue: { withdrawal: 14 } });
    await service.record(actor, { action: 'LOGIN', entity: 'AUTH' });
    prisma.rows[0].newValue = JSON.stringify({ withdrawal: 1 });
    await expect(service.verifyChain()).resolves.toEqual(
      expect.objectContaining({ valid: false, brokenAtSequence: 1, reason: expect.stringMatching(/modified/) }),
    );
  });

  it('detects a deleted entry', async () => {
    const prisma = fakePrisma();
    const service = new AuditService(prisma as any);
    for (const a of ['A', 'B', 'C']) await service.record(actor, { action: a, entity: 'X' });
    prisma.rows.splice(1, 1);
    await expect(service.verifyChain()).resolves.toEqual(expect.objectContaining({ valid: false, brokenAtSequence: 2 }));
  });

  it('seals legacy (pre-chain) entries in creation order', async () => {
    const prisma = fakePrisma();
    prisma.rows.push(
      { id: 'old-2', sequence: null, createdAt: new Date('2026-01-02'), action: 'B', entity: 'X', userId: null, userEmail: null, userName: null, role: null, entityId: null, oldValue: null, newValue: null, ipAddress: null },
      { id: 'old-1', sequence: null, createdAt: new Date('2026-01-01'), action: 'A', entity: 'X', userId: null, userEmail: null, userName: null, role: null, entityId: null, oldValue: null, newValue: null, ipAddress: null },
    );
    const service = new AuditService(prisma as any);
    await expect(service.sealLegacyEntries()).resolves.toBe(2);
    expect(prisma.rows.find((r) => r.id === 'old-1').sequence).toBe(1);
    expect(prisma.rows.find((r) => r.id === 'old-2').sequence).toBe(2);
    await expect(service.verifyChain()).resolves.toEqual(expect.objectContaining({ valid: true, checked: 2 }));
  });

  it('never throws into business flows when the database write fails', async () => {
    const prisma = fakePrisma();
    prisma.auditLog.create.mockRejectedValueOnce(new Error('disk full'));
    const service = new AuditService(prisma as any);
    await expect(service.record(actor, { action: 'A', entity: 'X' })).resolves.toBeNull();
    await service.record(actor, { action: 'B', entity: 'X' });
    expect(prisma.rows).toHaveLength(1);
  });

  it('neutralises spreadsheet formulas in CSV export', async () => {
    const prisma: any = { auditLog: { findMany: jest.fn().mockResolvedValue([{ sequence: 1, createdAt: new Date(0), userName: '=HYPERLINK("x")', action: 'A', entity: 'X' }]) } };
    const csv = await new AuditService(prisma).exportCsv();
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
