import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

const errorsFor = async (body: object) =>
  (await validate(plainToInstance(RegisterDto, body))).map((e) => e.property);

describe('RegisterDto', () => {
  const valid = { email: 'a@b.cl', password: 'password1', name: 'Ana' };

  it('acepta un registro válido', async () => {
    expect(await errorsFor(valid)).toEqual([]);
  });

  it('no permite auto-asignarse el rol ADMIN', async () => {
    expect(await errorsFor({ ...valid, role: 'ADMIN' })).toContain('role');
  });

  it('no permite auto-asignarse acceso al panel profesional', async () => {
    expect(await errorsFor({ ...valid, role: 'BAKER' })).toContain('role');
  });

  it('rechaza contraseñas Unicode que bcrypt truncaría', async () => {
    expect(await errorsFor({ ...valid, password: 'ñ'.repeat(40) })).toContain(
      'password',
    );
  });

  it('exige email válido y contraseña de 8+ caracteres', async () => {
    const errors = await errorsFor({ ...valid, email: 'x', password: '123' });
    expect(errors).toEqual(expect.arrayContaining(['email', 'password']));
  });
});
