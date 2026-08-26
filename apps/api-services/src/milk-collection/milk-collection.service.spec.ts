import { Test, TestingModule } from '@nestjs/testing';
import { MilkCollectionService } from './milk-collection.service';
import { PrismaService } from '../prisma.service';

describe('MilkCollectionService', () => {
  let service: MilkCollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilkCollectionService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<MilkCollectionService>(MilkCollectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
