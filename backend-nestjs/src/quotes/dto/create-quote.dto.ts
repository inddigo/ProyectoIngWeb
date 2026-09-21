import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class CreateQuoteDto {
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @IsNumber()
  @Min(0)
  estimatedPrice: number;

  @IsString()
  @IsNotEmpty()
  details: string;
}
