import { JwtokenMiddleware } from './jwtoken.middleware';

describe('JwtokenMiddleware', () => {
  it('should be defined', () => {
    expect(new JwtokenMiddleware()).toBeDefined();
  });
});
