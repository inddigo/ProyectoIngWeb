import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  const prisma = {
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new OrdersService(prisma as any);

  beforeEach(() => jest.resetAllMocks());

  it('crea el pedido como CONFIRMED_BY_CLIENT asociado al cliente', async () => {
    prisma.order.create.mockResolvedValue({ id: 'o1' });
    await service.create('client-1', {
      rawText: 'torta para 20',
      domain: 'cake',
      attributes: { servings: 20 },
      webReferences: [
        { title: 't', imageUrl: 'https://img.cl/a.jpg', source: 'web' },
      ],
    });
    const { data } = prisma.order.create.mock.calls[0][0];
    expect(data.clientId).toBe('client-1');
    expect(data.status).toBe('CONFIRMED_BY_CLIENT');
    expect(data.webReferences.create).toHaveLength(1);
  });

  describe('decide', () => {
    it('permite al dueño aceptar un pedido cotizado', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        clientId: 'c1',
        status: 'QUOTED',
      });
      prisma.order.update.mockResolvedValue({ status: 'ACCEPTED_BY_CLIENT' });
      await service.decide('o1', 'c1', 'ACCEPTED_BY_CLIENT');
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'ACCEPTED_BY_CLIENT' } }),
      );
    });

    it('rechaza si el pedido es de otro cliente', async () => {
      prisma.order.findUnique.mockResolvedValue({
        clientId: 'otro',
        status: 'QUOTED',
      });
      await expect(
        service.decide('o1', 'c1', 'ACCEPTED_BY_CLIENT'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rechaza si el pedido aún no está cotizado', async () => {
      prisma.order.findUnique.mockResolvedValue({
        clientId: 'c1',
        status: 'CONFIRMED_BY_CLIENT',
      });
      await expect(
        service.decide('o1', 'c1', 'REJECTED_BY_CLIENT'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('lanza 404 si no existe', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.decide('o1', 'c1', 'REJECTED_BY_CLIENT'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('un cliente no puede ver pedidos ajenos', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'o1', clientId: 'otro' });
    await expect(
      service.findOneForUser('o1', {
        userId: 'c1',
        email: 'c@c.cl',
        role: 'CLIENT',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
