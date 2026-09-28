import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateQuoteDto } from './dto/create-quote.dto';

export const BASE_PRICE_PER_SERVING = 3000;
export const RESTRICTION_SURCHARGE = 5000;
export const TATTOO_PRICE_PER_CM = 5000;
const THEME_COMPLEXITY_MULTIPLIER: Record<string, number> = {
  General: 1.0,
  Personalizada: 1.2,
  Cumpleaños: 1.3,
  Superhéroes: 1.5,
  Boda: 2.0,
};

type Attributes = Record<string, unknown>;

/** Estimación referencial basada en reglas por rubro (punto de partida de la calculadora). */
export function estimatePrice(domain: string, attrs: Attributes) {
  if (domain === 'tattoo') {
    const sizeCm = parseInt(String(attrs['size'] ?? ''), 10) || 10;
    const baseCost = sizeCm * TATTOO_PRICE_PER_CM;
    const multiplier = attrs['style'] === 'A color' ? 1.5 : 1.0;
    return {
      breakdown: { baseCost, multiplier },
      suggestedTotal: Math.round(baseCost * multiplier),
    };
  }

  const servings = Number(attrs['servings']) || 10;
  const baseCost = servings * BASE_PRICE_PER_SERVING;
  const theme = String(attrs['theme'] ?? '').toLowerCase();
  const themeKey = Object.keys(THEME_COMPLEXITY_MULTIPLIER).find((k) =>
    theme.includes(k.toLowerCase()),
  );
  const multiplier = themeKey ? THEME_COMPLEXITY_MULTIPLIER[themeKey] : 1.2;
  const themeCost = baseCost * multiplier;
  const restrictions = Array.isArray(attrs['dietary_restrictions'])
    ? attrs['dietary_restrictions']
    : [];
  const restrictionsCost = restrictions.length * RESTRICTION_SURCHARGE;

  return {
    breakdown: {
      servingsCost: baseCost,
      themeMultiplier: multiplier,
      themeCost,
      restrictionsCost,
    },
    suggestedTotal: Math.round(themeCost + restrictionsCost),
  };
}

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateEstimate(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Pedido con ID ${orderId} no encontrado`);
    }
    return {
      orderId: order.id,
      ...estimatePrice(order.domain, (order.attributes ?? {}) as Attributes),
    };
  }

  async createQuote(dto: CreateQuoteDto) {
    const { orderId, estimatedPrice, details, breakdown } = dto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Pedido con ID ${orderId} no encontrado`);
    }
    if (order.status !== OrderStatus.CONFIRMED_BY_CLIENT) {
      throw new ConflictException(
        `El pedido está en estado ${order.status} y no admite una nueva cotización`,
      );
    }

    // Transacción: crear cotización + actualizar estado del pedido
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: {
          orderId,
          estimatedPrice,
          details,
          breakdown: breakdown as Prisma.InputJsonValue | undefined,
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.QUOTED },
      });
      return quote;
    });
  }

  async getQuoteByOrderId(orderId: string, user: AuthUser) {
    const quote = await this.prisma.quote.findUnique({
      where: { orderId },
      include: { order: { select: { clientId: true } } },
    });
    if (
      !quote ||
      (user.role === 'CLIENT' && quote.order.clientId !== user.userId)
    ) {
      throw new NotFoundException('Cotización no encontrada');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { order, ...rest } = quote;
    return rest;
  }
}
