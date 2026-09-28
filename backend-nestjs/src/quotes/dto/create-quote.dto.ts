import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateQuoteDto {
  @IsUUID()
  orderId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  estimatedPrice: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  details: string;

  /** Desglose de la calculadora (insumos, mano de obra, margen). */
  @IsObject()
  @IsOptional()
  breakdown?: Record<string, unknown>;
}
