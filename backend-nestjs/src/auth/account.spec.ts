import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';

describe('Privacidad de la cuenta', () => {
  const users = {
    findById: jest.fn(),
    deleteAccount: jest.fn(),
    exportAccount: jest.fn(),
    updateName: jest.fn(),
  };
  const service = new AuthService(users as any, {} as any);
  const user = {
    userId: 'owner',
    email: 'owner@example.test',
    role: 'CLIENT' as const,
  };
  beforeEach(() => jest.clearAllMocks());
  it('exige la contraseña actual antes de eliminar', async () => {
    users.findById.mockResolvedValue({
      password: await bcrypt.hash('correct-password', 4),
    });
    await expect(
      service.deleteAccount(user, 'incorrecta'),
    ).rejects.toMatchObject({ status: 401 });
    expect(users.deleteAccount).not.toHaveBeenCalled();
    await expect(
      service.deleteAccount(user, 'correct-password'),
    ).resolves.toEqual({ deleted: true });
    expect(users.deleteAccount).toHaveBeenCalledWith('owner');
  });
  it('exporta y modifica solo la identidad del token', () => {
    service.exportAccount(user);
    service.updateAccount(user, 'Nombre actualizado');
    expect(users.exportAccount).toHaveBeenCalledWith('owner');
    expect(users.updateName).toHaveBeenCalledWith(
      'owner',
      'Nombre actualizado',
    );
  });
});
