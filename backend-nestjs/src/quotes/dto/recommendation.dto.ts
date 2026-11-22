import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CostItemDto {
  @IsString() @MaxLength(100) name: string;
  @IsNumber() @Min(0) @Max(99999999) packageCost: number;
  @IsNumber() @Min(0.000001) @Max(1000000) packageQuantity: number;
  @IsNumber() @Min(0) @Max(1000000) quantityUsed: number;
  @IsIn(['g', 'kg', 'ml', 'L', 'u', 'h']) unit: string;
}

export class CostsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CostItemDto)
  items: CostItemDto[];
  @IsNumber() @Min(0) @Max(99999999) laborCost: number;
  @IsNumber() @Min(0) @Max(99999999) fixedCosts: number;
  @IsNumber() @Min(0) @Max(500) profitMargin: number;
}

export class RecommendationDto extends CostsDto {
  @IsOptional() @IsIn(['baseline', 'adaptive']) mode?: 'baseline' | 'adaptive';
}

export class ProfessionalProfileDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(99999999) hourlyRate: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(99999999) fixedCosts: number;
  @IsNumber() @Min(0) @Max(500) profitMargin: number;
  @IsBoolean() useHistory: boolean;
}
