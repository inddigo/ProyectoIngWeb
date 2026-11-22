import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

export type PublicUser = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<PublicUser | null> {
    const user = await this.usersService.findByEmail(email.toLowerCase());
    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  login(user: Pick<User, 'id' | 'email' | 'name' | 'role'>) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  updateAccount(user: AuthUser, name: string) {
    return this.usersService.updateName(user.userId, name);
  }

  exportAccount(user: AuthUser) {
    return this.usersService.exportAccount(user.userId);
  }

  async deleteAccount(user: AuthUser, password: string) {
    if (Buffer.byteLength(password, 'utf8') > 72)
      throw new UnauthorizedException('Contraseña incorrecta');
    const current = await this.usersService.findById(user.userId);
    if (!current || !(await bcrypt.compare(password, current.password)))
      throw new UnauthorizedException('Contraseña incorrecta');
    await this.usersService.deleteAccount(user.userId);
    return { deleted: true };
  }

  async register(data: RegisterDto) {
    if (data.role && data.role !== 'CLIENT') {
      throw new BadRequestException('El registro público solo admite clientes');
    }
    const email = data.email.toLowerCase();
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.usersService.create({
      email,
      name: data.name,
      role: 'CLIENT',
      password: hashedPassword,
    });

    return this.login(user);
  }
}
