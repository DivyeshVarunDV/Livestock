import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma.service';
import { getJwtSecret } from './../src/auth/jwt.config';

/**
 * Boots the complete application (all modules, global guards, pipes and
 * filters) against an in-memory Prisma double, and exercises the RBAC
 * boundary over real HTTP.
 */
const USERS: Record<string, any> = {
  admin: { id: 'admin', email: 'admin@x.gov', name: 'Admin', role: 'ADMIN', status: 'ACTIVE', tokenVersion: 0 },
  vet: { id: 'vet', email: 'vet@x.gov', name: 'Dr Vet', role: 'VETERINARIAN', status: 'ACTIVE', tokenVersion: 0 },
  tester: { id: 'tester', email: 'lab@x.gov', name: 'Lab', role: 'TESTER', status: 'ACTIVE', tokenVersion: 0 },
  farmer: { id: 'farmer', email: 'farmer@x.gov', name: 'Farmer', role: 'FARMER', status: 'ACTIVE', tokenVersion: 0 },
  suspended: { id: 'suspended', email: 's@x.gov', name: 'S', role: 'ADMIN', status: 'SUSPENDED', tokenVersion: 0 },
  revoked: { id: 'revoked', email: 'r@x.gov', name: 'R', role: 'ADMIN', status: 'ACTIVE', tokenVersion: 5 },
};

/** Any model method resolves to an empty result unless overridden. */
function prismaDouble() {
  const calls: Record<string, any[]> = {};
  const model = (name: string) =>
    new Proxy(
      {},
      {
        get: (_t, method: string) => {
          if (name === 'user' && method === 'findUnique') {
            return jest.fn(async ({ where }: any) => USERS[where.id] ?? null);
          }
          return jest.fn(async (args: any) => {
            (calls[`${name}.${method}`] ??= []).push(args);
            if (method === 'findMany' || method === 'groupBy') return [];
            if (method === 'count') return 0;
            if (method === 'updateMany' || method === 'deleteMany') return { count: 0 };
            return null;
          });
        },
      },
    );
  const target: any = {
    calls,
    $queryRaw: jest.fn(async () => [{ 1: 1 }]),
    $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(target) : Promise.all(arg))),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  };
  return new Proxy(target, { get: (t, p: string) => (p in t ? t[p] : (t[p] = model(p))) });
}

describe('LivestoCare API RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: any;
  let token: (who: string, tv?: number) => string;

  beforeAll(async () => {
    prisma = prismaDouble();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    const jwt = new JwtService({ secret: getJwtSecret() });
    token = (who, tv) => jwt.sign({ sub: USERS[who].id, role: USERS[who].role.toLowerCase(), tv: tv ?? USERS[who].tokenVersion });
  });

  afterAll(async () => {
    await app.close();
  });

  const as = (who: string) => ({ Authorization: `Bearer ${token(who)}` });

  it('exposes the health probe publicly', () => request(app.getHttpServer()).get('/healthz').expect(200));

  it('requires authentication everywhere else', async () => {
    await request(app.getHttpServer()).get('/farms').expect(401);
    await request(app.getHttpServer()).get('/inventory').expect(401);
    await request(app.getHttpServer()).get('/notifications').expect(401);
    await request(app.getHttpServer()).get('/audit-logs').expect(401);
  });

  it('no longer honours the hard-coded demo backdoor token', () =>
    request(app.getHttpServer()).get('/users').set('Authorization', 'Bearer gov-demo-token-2026').expect(401));

  it('rejects revoked tokens and suspended accounts', async () => {
    await request(app.getHttpServer()).get('/farms').set('Authorization', `Bearer ${token('revoked', 4)}`).expect(401);
    await request(app.getHttpServer()).get('/farms').set(as('suspended')).expect(401);
  });

  it('restricts user administration to administrators (class-level policy is enforced)', async () => {
    await request(app.getHttpServer()).get('/users').set(as('vet')).expect(403);
    await request(app.getHttpServer()).delete('/users/x').set(as('tester')).expect(403);
    await request(app.getHttpServer()).get('/users').set(as('admin')).expect(200);
  });

  it('keeps the audit trail administrator-only and read-only', async () => {
    await request(app.getHttpServer()).get('/audit-logs').set(as('vet')).expect(403);
    await request(app.getHttpServer()).get('/audit-logs').set(as('admin')).expect(200);
    await request(app.getHttpServer()).post('/audit-logs').set(as('admin')).send({ action: 'FORGED' }).expect(404);
  });

  it('enforces segregation of duties for clinical and laboratory records', async () => {
    await request(app.getHttpServer()).post('/treatments').set(as('admin')).send({ animalId: 'a', drugName: 'x', dosage: '1' }).expect(403);
    await request(app.getHttpServer()).post('/milk-tests').set(as('admin')).send({ batchId: 'B' }).expect(403);
    await request(app.getHttpServer()).post('/treatments/rules').set(as('vet')).send({ drugName: 'x', species: 'CATTLE', withdrawalPeriod: 1 }).expect(403);
  });

  it('validates treatment input for veterinarians', async () => {
    const res = await request(app.getHttpServer()).post('/treatments').set(as('vet')).send({ drugName: 'x' }).expect(400);
    expect(JSON.stringify(res.body.message)).toMatch(/animalId/);
  });

  it('gives farmers read-only access scoped to their own farms', async () => {
    await request(app.getHttpServer()).get('/treatments').set(as('farmer')).expect(403);
    await request(app.getHttpServer()).post('/farms').set(as('farmer')).send({}).expect(403);
    await request(app.getHttpServer()).get('/farms').set(as('farmer')).expect(200);
    const lastFarmQuery = prisma.calls['farm.findMany'].at(-1);
    expect(lastFarmQuery.where).toEqual({ ownerId: 'farmer' });
  });

  it('lets every signed-in role read its own notifications', async () => {
    await request(app.getHttpServer()).get('/notifications').set(as('tester')).expect(200);
    const q = prisma.calls['notification.findMany'].at(-1);
    expect(JSON.stringify(q.where)).toContain('"userId":"tester"');
  });

  it('reserves transfer approval for administrators', async () => {
    await request(app.getHttpServer()).delete('/ownership-transfers/x').set(as('vet')).expect(403);
  });
});
