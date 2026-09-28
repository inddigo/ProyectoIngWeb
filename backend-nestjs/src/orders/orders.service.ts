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
import { ClientDecision } from './dto/order-decision.dto';

const ORDER_INCLUDE = { webReferences: true, quote: true } as const;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /** El cliente confirma el formulario estructurado por la IA. */
  create(clientId: string, dto: CreateOrderDto) {
    return this.prisma.order.create({
      data: {
        clientId,
        domain: dto.domain,
        rawText: dto.rawText,
        attributes: (dto.attributes ?? {}) as Prisma.InputJsonValue,
        imageUrl: dto.imageUrl,
        confidenceScore: dto.confidenceScore,
        status: OrderStatus.CONFIRMED_BY_CLIENT,
        webReferences: dto.webReferences?.length
          ? { create: dto.webReferences }
          : undefined,
      },
      include: ORDER_INCLUDE,
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
