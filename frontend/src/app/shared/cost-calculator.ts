/**
 * Calculadora de costos (basada en plantillas de costeo de recetas):
 * costo insumo = (costo presentación / cantidad presentación) * cantidad usada
 * precio sugerido = (insumos + mano de obra + costos fijos) * (1 + margen%)
 */
export interface CostItem {
  name: string;
  packageCost: number;
  packageQuantity: number;
  unit: string;
  quantityUsed: number;
}

export interface CostInputs {
  items: CostItem[];
  laborCost: number;
  fixedCosts: number;
  profitMargin: number;
}

export interface CostSummary {
  ingredientsCost: number;
  totalCost: number;
  profit: number;
  suggestedPrice: number;
}

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function itemCost(item: CostItem): number {
  const qty = num(item.packageQuantity);
  if (qty <= 0) return 0;
  return (num(item.packageCost) / qty) * num(item.quantityUsed);
}

export function summarizeCosts(inputs: CostInputs): CostSummary {
  const ingredientsCost = inputs.items.reduce((t, i) => t + itemCost(i), 0);
  const totalCost = ingredientsCost + num(inputs.laborCost) + num(inputs.fixedCosts);
  const profit = totalCost * (num(inputs.profitMargin) / 100);
  return {
    ingredientsCost,
    totalCost,
    profit,
    suggestedPrice: totalCost + profit,
  };
}

/** Insumos de partida según el rubro y el tamaño del pedido. */
export function defaultItems(domain: string, quantity: number): CostItem[] {
  if (domain === 'tattoo') {
    return [
      { name: 'Tintas', packageCost: 25000, packageQuantity: 100, unit: 'ml', quantityUsed: Math.max(5, quantity) },
      { name: 'Agujas / cartuchos', packageCost: 20000, packageQuantity: 20, unit: 'u', quantityUsed: 2 },
      { name: 'Material desechable', packageCost: 10000, packageQuantity: 10, unit: 'u', quantityUsed: 1 },
    ];
  }
  return [
    { name: 'Harina', packageCost: 1200, packageQuantity: 1000, unit: 'g', quantityUsed: quantity * 20 },
    { name: 'Azúcar', packageCost: 1500, packageQuantity: 1000, unit: 'g', quantityUsed: quantity * 15 },
    { name: 'Huevos', packageCost: 3000, packageQuantity: 30, unit: 'u', quantityUsed: Math.ceil(quantity / 2) },
  ];
}
