import { RecommendationsService } from './recommendations.service';

describe('Aislamiento de historial y trazabilidad', () => {
  const prisma = {
    professionalProfile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    order: { findUnique: jest.fn() },
    quote: { findMany: jest.fn(), updateMany: jest.fn() },
    recommendation: { create: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new RecommendationsService(prisma as any);
  const costs = {
    items: [],
    laborCost: 12000,
    fixedCosts: 0,
    profitMargin: 30,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      domain: 'general',
      attributes: { service_type: 'Diseño' },
      status: 'CONFIRMED_BY_CLIENT',
      _count: { webReferences: 0 },
    });
    prisma.professionalProfile.findUnique.mockResolvedValue({
      hourlyRate: 1000,
      fixedCosts: 0,
      profitMargin: 30,
      useHistory: true,
    });
    prisma.quote.findMany.mockResolvedValue([]);
    prisma.recommendation.create.mockResolvedValue({ id: 'r1' });
    prisma.$transaction.mockImplementation((fn) => fn(prisma));
  });
  it('consulta exclusivamente al profesional autenticado con ventana y límite', async () => {
    await service.calculate('o1', 'pro-1', costs);
    expect(prisma.quote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          professionalId: 'pro-1',
          order: {
            domain: 'general',
            status: { in: ['ACCEPTED_BY_CLIENT', 'REJECTED_BY_CLIENT'] },
          },
        }),
        take: 50,
      }),
    );
    expect(prisma.recommendation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'o1',
        professionalId: 'pro-1',
        result: expect.objectContaining({ version: 'cost-history-v1' }),
      }),
    });
  });
  it('no consulta historial sin autorización o en modo base', async () => {
    await service.calculate('o1', 'pro-1', { ...costs, mode: 'baseline' });
    prisma.professionalProfile.findUnique.mockResolvedValue(null);
    await service.calculate('o1', 'pro-1', costs);
    expect(prisma.quote.findMany).not.toHaveBeenCalled();
  });
  it('retira solo el historial del profesional y desactiva su uso', async () => {
    await service.clearHistory('pro-1');
    expect(prisma.quote.updateMany).toHaveBeenCalledWith({
      where: { professionalId: 'pro-1' },
      data: { professionalId: null },
    });
    expect(prisma.recommendation.deleteMany).toHaveBeenCalledWith({
      where: { professionalId: 'pro-1' },
    });
    expect(prisma.professionalProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: 'pro-1' },
      data: { useHistory: false },
    });
  });
  it('no recomienda pedidos con decisión final', async () => {
    prisma.order.findUnique.mockResolvedValue({ status: 'ACCEPTED_BY_CLIENT' });
    await expect(service.calculate('o1', 'pro-1', costs)).rejects.toMatchObject(
      { status: 409 },
    );
    expect(prisma.recommendation.create).not.toHaveBeenCalled();
  });
});
