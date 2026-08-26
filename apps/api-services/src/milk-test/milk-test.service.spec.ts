import { Test, TestingModule } from '@nestjs/testing';
import { MilkTestService } from './milk-test.service';
import { PrismaService } from '../prisma.service';

describe('MilkTestService', () => {
  let service: MilkTestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilkTestService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<MilkTestService>(MilkTestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
