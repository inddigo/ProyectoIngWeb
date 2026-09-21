import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { CreateQuoteDto } from './dto/create-quote.dto';

@Injectable()
export class QuotesService {
  private prisma = new PrismaClient();

  // Pricing constants (could be moved to DB or Config later)
  private readonly BASE_PRICE_PER_SERVING = 3000;
  private readonly THEME_COMPLEXITY_MULTIPLIER = {
    'General': 1.0,
    'Personalizada': 1.2,
    'Cumpleaños': 1.3,
    'Superhéroes': 1.5,
    'Boda': 2.0
  };
  private readonly RESTRICTION_SURCHARGE = 5000; // Flat fee per restriction

  async calculateEstimate(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const servings = order.servings || 10;
    const baseCost = servings * this.BASE_PRICE_PER_SERVING;
    
    // Find theme multiplier, fallback to 1.2 if unknown theme
    const themeKey = Object.keys(this.THEME_COMPLEXITY_MULTIPLIER).find(k => 
      order.theme?.toLowerCase().includes(k.toLowerCase())
    );
    const multiplier = themeKey ? this.THEME_COMPLEXITY_MULTIPLIER[themeKey] : 1.2;
    
    const themeCost = baseCost * multiplier;
    const restrictionCost = (order.dietaryRestrictions?.length || 0) * this.RESTRICTION_SURCHARGE;

    const totalEstimate = themeCost + restrictionCost;

    return {
      orderId: order.id,
      breakdown: {
        servingsCost: baseCost,
        themeMultiplier: multiplier,
        themeCost: themeCost,
        restrictionsCost: restrictionCost
      },
      suggestedTotal: Math.round(totalEstimate)
    };
  }

  async createQuote(createQuoteDto: CreateQuoteDto) {
    const { orderId, estimatedPrice, details } = createQuoteDto;

    // Check if order exists and is ready to be quoted
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Wrap in transaction: Create Quote + Update Order Status
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: {
          orderId,
          estimatedPrice,
          details
        }
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.QUOTED }
      });

      return quote;
    });
  }

  async getQuoteByOrderId(orderId: string) {
    const quote = await this.prisma.quote.findUnique({ where: { orderId } });
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }
}
