import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { Domain, SUPPORTED_DOMAINS } from '../../common/constants/domains';

export class ListOrdersQuery {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}

export class SearchWebReferencesQuery {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  q?: string;

  @IsIn(SUPPORTED_DOMAINS)
  @IsOptional()
  domain?: Domain;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  source?: string;
}

