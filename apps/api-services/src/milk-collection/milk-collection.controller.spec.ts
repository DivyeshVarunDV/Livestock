import { Test, TestingModule } from '@nestjs/testing';
import { MilkCollectionController } from './milk-collection.controller';
import { MilkCollectionService } from './milk-collection.service';

describe('MilkCollectionController', () => {
  let controller: MilkCollectionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MilkCollectionController],
      providers: [
        {
          provide: MilkCollectionService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<MilkCollectionController>(MilkCollectionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
