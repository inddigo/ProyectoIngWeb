import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class ListOrdersQuery {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}
