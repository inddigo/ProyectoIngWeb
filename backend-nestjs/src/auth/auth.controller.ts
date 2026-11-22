import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  Get,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DeleteAccountDto, UpdateAccountDto } from './dto/account.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('account')
  @UseGuards(JwtAuthGuard)
  exportAccount(@CurrentUser() user: AuthUser) {
    return this.authService.exportAccount(user);
  }

  @Patch('account')
  @UseGuards(JwtAuthGuard)
  updateAccount(@CurrentUser() user: AuthUser, @Body() dto: UpdateAccountDto) {
    return this.authService.updateAccount(user, dto.name);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  deleteAccount(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto) {
    return this.authService.deleteAccount(user, dto.password);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }
}
