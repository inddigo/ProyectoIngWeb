import { BadRequestException } from '@nestjs/common';
import { costSummary, HistorySample, recommend } from './recommendation.engine';

describe('Recomendación explicable de encargos', () => {
  it('redondea pesos sin sumar uno por errores de coma flotante', () => {
    expect(
      costSummary({
        items: [],
        laborCost: 35000,
        fixedCosts: 0,
        profitMargin: 39,
      }).suggestedPrice,
    ).toBe(48650);
  });
  const costs = {
    items: [
      {
        name: 'Madera',
        packageCost: 4000,
        packageQuantity: 1,
        quantityUsed: 1,
        unit: 'u',
      },
    ],
    laborCost: 6000,
    fixedCosts: 2000,
    profitMargin: 30,
  };
  const attributes = { service_type: 'Carpintería', materials: 'Madera' };
  const sample = (price = 18000): HistorySample => ({
    domain: 'general',
    attributes,
    totalCost: 12000,
    price,
    status: 'ACCEPTED_BY_CLIENT',
  });
  const input = {
    domain: 'general',
    attributes,
    costs,
    history: Array.from({ length: 10 }, () => sample()),
    useHistory: true,
    mode: 'adaptive' as const,
    referenceCount: 4,
  };

  it('compara costos base con la mediana del historial comparable', () => {
    const result = recommend(input);
    expect(result.baselineTotal).toBe(15600);
    expect(result.suggestedTotal).toBe(16800);
    expect(result.appliedMargin).toBe(40);
    expect(result.adapted).toBe(true);
    expect(result.reasons.join(' ')).toContain('Mediana histórica: 50.0%');
  });
  it.each([0, 1, 2])('con %i aceptados conserva el precio base', (count) => {
    expect(
      recommend({ ...input, history: input.history.slice(0, count) })
        .suggestedTotal,
    ).toBe(15600);
  });
  it('respeta desactivación y modo base aunque exista historial suficiente', () => {
    expect(recommend({ ...input, useHistory: false }).adapted).toBe(false);
    expect(recommend({ ...input, mode: 'baseline' }).suggestedTotal).toBe(
      15600,
    );
  });
  it('no mezcla materiales, categorías ni rubros de otros trabajos', () => {
    const history = [
      sample(),
      { ...sample(), attributes: { ...attributes, materials: 'Metal' } },
      { ...sample(), attributes: { service_type: 'Diseño' } },
      { ...sample(), domain: 'cake' },
    ];
    expect(recommend({ ...input, history }).sampleCount).toBe(1);
  });
  it('los rechazos no bajan automáticamente el precio', () => {
    const result = recommend({
      ...input,
      history: [
        ...input.history,
        ...Array.from({ length: 10 }, () => ({
          ...sample(1),
          status: 'REJECTED_BY_CLIENT',
        })),
      ],
    });
    expect(result.suggestedTotal).toBe(16800);
    expect(result.acceptanceRate).toBe(0.5);
  });
  it('es robusto ante un precio extremo y acota el ajuste', () => {
    expect(
      recommend({ ...input, history: [...input.history, sample(999999)] })
        .appliedMargin,
    ).toBe(40);
    const result = recommend({
      ...input,
      history: Array.from({ length: 50 }, () => sample(60000)),
    });
    expect(result.appliedMargin).toBe(45);
  });
  it('no recomienda por debajo del costo actual aunque el historial sea barato', () => {
    const result = recommend({
      ...input,
      costs: { ...costs, profitMargin: 0 },
      history: Array.from({ length: 20 }, () => sample(1)),
    });
    expect(result.suggestedTotal).toBeGreaterThanOrEqual(result.totalCost);
  });
  it('la falta de referencias pide confirmar diseño, sin penalizar el precio', () => {
    const result = recommend({ ...input, referenceCount: 0 });
    expect(result.suggestedTotal).toBe(16800);
    expect(result.warnings.join(' ')).toContain('confirma el diseño');
  });
  it('rechaza costos cero y desbordamiento numérico', () => {
    expect(() =>
      recommend({
        ...input,
        costs: { items: [], laborCost: 0, fixedCosts: 0, profitMargin: 30 },
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      costSummary({
        ...costs,
        items: [{ ...costs.items[0], packageQuantity: 0.000001 }],
      }),
    ).toThrow(BadRequestException);
  });
});
