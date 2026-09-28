import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// ADMIN no se puede auto-asignar desde el registro público.
export const SELF_REGISTER_ROLES = ['CLIENT', 'BAKER'] as const;

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // límite de bcrypt
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsIn(SELF_REGISTER_ROLES)
  role?: (typeof SELF_REGISTER_ROLES)[number];
}
