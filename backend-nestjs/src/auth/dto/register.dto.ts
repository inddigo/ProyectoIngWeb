import {
  IsEmail,
  IsByteLength,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// Las cuentas con acceso a pedidos del negocio se aprovisionan fuera del registro público.
export const SELF_REGISTER_ROLES = ['CLIENT'] as const;

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @IsByteLength(8, 72) // bcrypt limita bytes, no caracteres Unicode.
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsIn(SELF_REGISTER_ROLES)
  role?: (typeof SELF_REGISTER_ROLES)[number];
}
