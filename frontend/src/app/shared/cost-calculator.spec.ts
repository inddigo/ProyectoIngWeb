import { defaultItems, itemCost, summarizeCosts } from './cost-calculator';

describe('cost-calculator', () => {
  it('calcula el costo proporcional de un insumo', () => {
    // 1.200 por 1.000 g, se usan 500 g -> 600
    expect(
      itemCost({ name: 'Harina', packageCost: 1200, packageQuantity: 1000, unit: 'g', quantityUsed: 500 }),
    ).toBe(600);
  });

  it('no divide por cero si la presentación es 0', () => {
    expect(
      itemCost({ name: 'x', packageCost: 1000, packageQuantity: 0, unit: 'u', quantityUsed: 3 }),
    ).toBe(0);
  });

  it('aplica mano de obra, costos fijos y margen', () => {
    const summary = summarizeCosts({
      items: [{ name: 'a', packageCost: 1000, packageQuantity: 10, unit: 'u', quantityUsed: 10 }],
      laborCost: 5000,
      fixedCosts: 1000,
      profitMargin: 50,
    });
    expect(summary.ingredientsCost).toBe(1000);
    expect(summary.totalCost).toBe(7000);
    expect(summary.profit).toBe(3500);
    expect(summary.suggestedPrice).toBe(10500);
  });

  it('propone insumos distintos según el rubro', () => {
    expect(defaultItems('cake', 10)[0].name).toBe('Harina');
    expect(defaultItems('tattoo', 10)[0].name).toBe('Tintas');
  });
});
