import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SUPPORTED_DOMAINS, Domain } from '../../common/constants/domains';

export class WebReferenceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsUrl({ require_protocol: true })
  imageUrl: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  source: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  rawText: string;

  @IsIn(SUPPORTED_DOMAINS)
  domain: Domain;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, unknown>;

  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @IsOptional()
  imageUrl?: string;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => WebReferenceDto)
  @IsOptional()
  webReferences?: WebReferenceDto[];

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  confidenceScore?: number;
}
