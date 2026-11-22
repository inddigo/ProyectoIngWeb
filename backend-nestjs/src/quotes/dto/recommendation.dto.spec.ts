import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateQuoteDto } from './create-quote.dto';
import { RecommendationDto } from './recommendation.dto';

describe('Validación del costeo', () => {
  const costs = {
    items: [
      {
        name: 'Madera',
        packageCost: 4000,
        packageQuantity: 1,
        quantityUsed: 2,
        unit: 'u',
      },
    ],
    laborCost: 6000,
    fixedCosts: 2000,
    profitMargin: 30,
  };
  const options = { whitelist: true, forbidNonWhitelisted: true };
  it('admite costos completos y rechaza entradas no finitas, negativas o unidades ajenas', async () => {
    expect(
      await validate(plainToInstance(RecommendationDto, costs), options),
    ).toHaveLength(0);
    for (const patch of [
      { laborCost: -1 },
      { fixedCosts: Infinity },
      { profitMargin: 501 },
      { items: [{ ...costs.items[0], packageQuantity: 0 }] },
      { items: [{ ...costs.items[0], unit: 'otro' }] },
      { professionalId: 'ajeno' },
    ]) {
      expect(
        (
          await validate(
            plainToInstance(RecommendationDto, { ...costs, ...patch }),
            options,
          )
        ).length,
      ).toBeGreaterThan(0);
    }
  });
  it('rechaza totales fabricados y objetos anidados desconocidos en la cotización', async () => {
    const dto = plainToInstance(CreateQuoteDto, {
      orderId: '8f14e45f-ceea-467a-9f6e-6a8b8c5e1a11',
      estimatedPrice: 10000,
      details: 'Trabajo',
      breakdown: { ...costs, totalCost: 1 },
    });
    expect((await validate(dto, options)).length).toBeGreaterThan(0);
  });
});
