import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CostsDto } from './recommendation.dto';

export class CreateQuoteDto {
  @IsUUID()
  orderId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(99999999.99)
  estimatedPrice: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  details: string;

  /** Desglose de la calculadora (insumos, mano de obra, margen). */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CostsDto)
  breakdown?: CostsDto;

  @IsOptional()
  @IsUUID()
  recommendationId?: string;
}
