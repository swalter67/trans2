import { Test, TestingModule } from '@nestjs/testing';
import { JwtokenService } from './jwtoken.service';

describe('JwtokenService', () => {
  let service: JwtokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtokenService],
    }).compile();

    service = module.get<JwtokenService>(JwtokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
