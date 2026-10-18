import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { SearchWebReferencesQuery } from './dto/list-orders.query';
import { ClientDecision } from './dto/order-decision.dto';

const ORDER_INCLUDE = { webReferences: true, quote: true } as const;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /** El cliente confirma el formulario estructurado por la IA. Se deduplican las referencias web por imageUrl. */
  create(clientId: string, dto: CreateOrderDto) {
    const seenUrls = new Set<string>();
    const uniqueRefs = (dto.webReferences ?? [])
      .filter((ref) => {
        const key = ref.imageUrl.trim().toLowerCase();
        if (seenUrls.has(key)) {
          return false;
        }
        seenUrls.add(key);
        return true;
      })
      .map((ref) => ({
        title: ref.title,
        imageUrl: ref.imageUrl,
        source: ref.source,
        sourceUrl: ref.sourceUrl,
        license: ref.license,
        creator: ref.creator,
        queryUsed: ref.queryUsed,
        retrievedAt: ref.retrievedAt ? new Date(ref.retrievedAt) : undefined,
      }));

    return this.prisma.order.create({
      data: {
        clientId,
        domain: dto.domain,
        rawText: dto.rawText,
        attributes: (dto.attributes ?? {}) as Prisma.InputJsonValue,
        imageUrl: dto.imageUrl,
        confidenceScore: dto.confidenceScore,
        status: OrderStatus.CONFIRMED_BY_CLIENT,
        webReferences: uniqueRefs.length ? { create: uniqueRefs } : undefined,
      },
      include: ORDER_INCLUDE,
    });
  }

  /** Consulta e indexación eficiente sobre las referencias web almacenadas en PostgreSQL. */
  searchWebReferences(query: SearchWebReferencesQuery) {
    const where: Prisma.WebReferenceWhereInput = {};
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { queryUsed: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.source) {
      where.source = { contains: query.source, mode: 'insensitive' };
    }
    if (query.domain) {
      where.order = { domain: query.domain };
    }

    return this.prisma.webReference.findMany({
      where,
      include: {
        order: {
          select: { id: true, domain: true, status: true, createdAt: true },
        },
      },
      orderBy: { retrievedAt: 'desc' },
      take: 25,
    });
  }

  findAll(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : {},
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findByClient(clientId: string) {
    return this.prisma.order.findMany({
      where: { clientId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(id: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException(`Pedido con ID ${id} no encontrado`);
    }
    if (user.role === 'CLIENT' && order.clientId !== user.userId) {
      throw new ForbiddenException('Este pedido no te pertenece');
    }
    return order;
  }

  /** Solo el dueño del pedido puede aceptar/rechazar, y solo si está cotizado. */
  async decide(id: string, clientId: string, decision: ClientDecision) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Pedido con ID ${id} no encontrado`);
    }
    if (order.clientId !== clientId) {
      throw new ForbiddenException('Este pedido no te pertenece');
    }
    if (order.status !== OrderStatus.QUOTED) {
      throw new ConflictException(
        `El pedido está en estado ${order.status}; solo se puede decidir sobre pedidos cotizados`,
      );
    }
    return this.prisma.order.update({
      where: { id },
      data: { status: decision },
      include: ORDER_INCLUDE,
    });
  }
}

