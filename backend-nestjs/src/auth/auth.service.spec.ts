import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const users = { findByEmail: jest.fn(), create: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'signed.jwt') },
        },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('valida credenciales correctas y no expone el hash', async () => {
    const hash = await bcrypt.hash('secreta123', 4);
    users.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@b.cl',
      name: 'A',
      role: 'BAKER',
      password: hash,
    });
    const user = await service.validateUser('A@B.cl', 'secreta123');
    expect(user).toMatchObject({ id: 'u1', role: 'BAKER' });
    expect(user).not.toHaveProperty('password');
    expect(users.findByEmail).toHaveBeenCalledWith('a@b.cl');
  });

  it('rechaza una contraseña incorrecta', async () => {
    users.findByEmail.mockResolvedValue({
      password: await bcrypt.hash('otra', 4),
    });
    await expect(service.validateUser('a@b.cl', 'mala')).resolves.toBeNull();
  });

  it('registra como CLIENT por defecto y devuelve un token', async () => {
    users.findByEmail.mockResolvedValue(null);
    users.create.mockImplementation(async (data) => ({ id: 'u2', ...data }));
    const res = await service.register({
      email: 'Nuevo@Mail.cl',
      password: 'password1',
      name: 'Nuevo',
    });
    const created = users.create.mock.calls[0][0];
    expect(created.role).toBe('CLIENT');
    expect(created.email).toBe('nuevo@mail.cl');
    expect(created.password).not.toBe('password1');
    expect(res.access_token).toBe('signed.jwt');
  });

  it('impide registrar un email duplicado', async () => {
    users.findByEmail.mockResolvedValue({ id: 'x' });
    await expect(
      service.register({ email: 'a@b.cl', password: 'password1', name: 'A' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
