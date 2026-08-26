import { UserService } from './user.service';

describe('UserService.findAll', () => {
  const findMany = jest.fn();
  const prisma = {
    user: { findMany },
  } as any;

  let service: UserService;

  beforeEach(() => {
    findMany.mockReset();
    service = new UserService(prisma);
  });

  it('filters by role and status', async () => {
    findMany.mockResolvedValue([]);

    await service.findAll({ role: 'ADMIN', status: 'ACTIVE' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: 'ADMIN', status: 'ACTIVE' }),
      }),
    );
  });

  it('ignores ALL role and status values', async () => {
    findMany.mockResolvedValue([]);

    await service.findAll({ role: 'ALL', status: 'ALL' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });

  it('adds search OR filters', async () => {
    findMany.mockResolvedValue([]);

    await service.findAll({ search: 'raj' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: 'raj' } },
            { email: { contains: 'raj' } },
          ],
        }),
      }),
    );
  });
});
