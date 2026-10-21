import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role: AuthUser['role'];
  }) {
    if (typeof payload.sub !== 'string') throw new UnauthorizedException();
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return { userId: user.id, email: user.email, role: user.role };
  }
}
