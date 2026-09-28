import { ConflictException } from '@nestjs/common';
import { estimatePrice, QuotesService } from './quotes.service';

describe('estimatePrice', () => {
  it('pastel: porciones x precio base x multiplicador de temática + restricciones', () => {
    const res = estimatePrice('cake', {
      servings: 20,
      theme: 'Boda',
      dietary_restrictions: ['Vegana'],
    });
    // 20 * 3000 * 2.0 + 1 * 5000
    expect(res.suggestedTotal).toBe(125000);
  });

  it('pastel: usa valores por defecto si faltan atributos', () => {
    // 10 porciones * 3000 * 1.2 (temática desconocida)
    expect(estimatePrice('cake', {}).suggestedTotal).toBe(36000);
  });

  it('tatuaje: tamaño en cm y recargo por color', () => {
    expect(
      estimatePrice('tattoo', { size: '15 cm', style: 'A color' })
        .suggestedTotal,
    ).toBe(112500);
  });
});

describe('QuotesService.createQuote', () => {
  const tx = { quote: { create: jest.fn() }, order: { update: jest.fn() } };
  const prisma = {
    order: { findUnique: jest.fn() },
    $transaction: jest.fn((fn) => fn(tx)),
  };
  const service = new QuotesService(prisma as any);
  const dto = {
    orderId: '8f14e45f-ceea-467a-9f6e-6a8b8c5e1a11',
    estimatedPrice: 50000,
    details: 'ok',
  };

  beforeEach(() => jest.clearAllMocks());

  it('crea la cotización y marca el pedido como QUOTED', async () => {
    prisma.order.findUnique.mockResolvedValue({
      status: 'CONFIRMED_BY_CLIENT',
    });
    tx.quote.create.mockResolvedValue({ id: 'q1' });
    await expect(service.createQuote(dto)).resolves.toEqual({ id: 'q1' });
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'QUOTED' } }),
    );
  });

  it('no permite cotizar dos veces el mismo pedido', async () => {
    prisma.order.findUnique.mockResolvedValue({ status: 'QUOTED' });
    await expect(service.createQuote(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
