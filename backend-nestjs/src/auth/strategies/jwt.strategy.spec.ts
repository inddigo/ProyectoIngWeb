import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const users = { findById: jest.fn() };
  const strategy = new JwtStrategy(
    {
      getOrThrow: () => 'test-secret-longer-than-32-characters',
    } as unknown as ConfigService,
    users as unknown as UsersService,
  );

  it('usa el rol vigente en la base de datos aunque el token conserve otro', async () => {
    users.findById.mockResolvedValue({
      id: 'u1',
      email: 'u@test.local',
      role: 'CLIENT',
    });
    await expect(
      strategy.validate({ sub: 'u1', email: 'old@test.local', role: 'BAKER' }),
    ).resolves.toEqual({ userId: 'u1', email: 'u@test.local', role: 'CLIENT' });
  });

  it('rechaza sesiones de cuentas eliminadas', async () => {
    users.findById.mockResolvedValue(null);
    await expect(
      strategy.validate({
        sub: 'missing',
        email: 'u@test.local',
        role: 'CLIENT',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
