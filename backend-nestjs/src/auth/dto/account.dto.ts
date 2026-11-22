import { IsString, Length, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateAccountDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 100)
  name: string;
}

export class DeleteAccountDto {
  @IsString()
  @MaxLength(100)
  password: string;
}
