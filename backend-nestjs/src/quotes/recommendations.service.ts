import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProfessionalProfileDto,
  RecommendationDto,
} from './dto/recommendation.dto';
import { recommend } from './recommendation.engine';

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });
    return profile
      ? {
          hourlyRate: Number(profile.hourlyRate),
          fixedCosts: Number(profile.fixedCosts),
          profitMargin: profile.profitMargin,
          useHistory: profile.useHistory,
        }
      : { hourlyRate: 0, fixedCosts: 0, profitMargin: 30, useHistory: false };
  }

  async saveProfile(userId: string, dto: ProfessionalProfileDto) {
    await this.prisma.professionalProfile.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
    return this.profile(userId);
  }

  async clearHistory(userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.professionalProfile.updateMany({
        where: { userId },
        data: { useHistory: false },
      });
      await tx.recommendation.deleteMany({ where: { professionalId: userId } });
      await tx.quote.updateMany({
        where: { professionalId: userId },
        data: { professionalId: null },
      });
    });
    return { cleared: true };
  }

  async calculate(orderId: string, userId: string, costs: RecommendationDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { _count: { select: { webReferences: true } } },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.status !== 'CONFIRMED_BY_CLIENT')
      throw new ConflictException('El pedido ya no admite una cotización');
    const profile = await this.profile(userId);
    const mode = costs.mode ?? 'adaptive';
    const rows =
      profile.useHistory && mode === 'adaptive'
        ? await this.prisma.quote.findMany({
            where: {
              professionalId: userId,
              createdAt: { gte: new Date(Date.now() - 180 * 86400000) },
              order: {
                domain: order.domain,
                status: { in: ['ACCEPTED_BY_CLIENT', 'REJECTED_BY_CLIENT'] },
              },
            },
            select: {
              estimatedPrice: true,
              breakdown: true,
              order: {
                select: { domain: true, attributes: true, status: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          })
        : [];
    const result = recommend({
      domain: order.domain,
      attributes: (order.attributes ?? {}) as Record<string, unknown>,
      costs,
      mode,
      useHistory: profile.useHistory,
      referenceCount: order._count.webReferences,
      history: rows.map((row) => ({
        domain: row.order.domain,
        attributes: (row.order.attributes ?? {}) as Record<string, unknown>,
        status: row.order.status,
        price: Number(row.estimatedPrice),
        totalCost: Number(
          (row.breakdown as Record<string, unknown> | null)?.['totalCost'] ?? 0,
        ),
      })),
    });
    const saved = await this.prisma.recommendation.create({
      data: {
        orderId,
        professionalId: userId,
        input: costs as unknown as Prisma.InputJsonValue,
        result: result as unknown as Prisma.InputJsonValue,
      },
    });
    return { id: saved.id, ...result };
  }
}
