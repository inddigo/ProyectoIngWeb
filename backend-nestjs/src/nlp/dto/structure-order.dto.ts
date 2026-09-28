import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { SUPPORTED_DOMAINS, Domain } from '../../common/constants/domains';

export class StructureOrderDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  rawText: string;

  @IsIn(SUPPORTED_DOMAINS)
  domain: Domain = 'cake';
}
