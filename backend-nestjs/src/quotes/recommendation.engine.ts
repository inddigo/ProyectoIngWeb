import { BadRequestException } from '@nestjs/common';
import { CostsDto } from './dto/recommendation.dto';

export interface HistorySample {
  domain: string;
  attributes: Record<string, unknown>;
  totalCost: number;
  price: number;
  status: string;
}

const normalize = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export function costFingerprint(costs: CostsDto): string {
  return JSON.stringify([
    costs.items.map((i) => [
      i.name,
      i.packageCost,
      i.packageQuantity,
      i.quantityUsed,
      i.unit,
    ]),
    costs.laborCost,
    costs.fixedCosts,
    costs.profitMargin,
  ]);
}
export function comparisonKey(
  domain: string,
  attrs: Record<string, unknown>,
): string {
  if (domain === 'general')
    return `${normalize(attrs['service_type'])}|${normalize(attrs['materials'])}`;
  if (domain === 'tattoo') return normalize(attrs['style']);
  return `${normalize(attrs['theme'])}|${(Array.isArray(attrs['dietary_restrictions']) ? attrs['dietary_restrictions'] : []).map(normalize).sort().join(',')}`;
}

export function costSummary(costs: CostsDto) {
  const ingredientsCost = costs.items.reduce(
    (sum, item) =>
      sum + (item.packageCost / item.packageQuantity) * item.quantityUsed,
    0,
  );
  const totalCost = ingredientsCost + costs.laborCost + costs.fixedCosts;
  if (!Number.isFinite(totalCost) || totalCost < 0 || totalCost > 99999999)
    throw new BadRequestException('El costo total excede el límite permitido');
  const suggestedPrice = Math.ceil(
    Math.round(totalCost * (100 + costs.profitMargin)) / 100,
  );
  if (suggestedPrice > 99999999)
    throw new BadRequestException(
      'El precio calculado excede el límite permitido',
    );
  return {
    ingredientsCost,
    totalCost,
    profit: (totalCost * costs.profitMargin) / 100,
    suggestedPrice,
  };
}

/** Reglas versionadas: mediana robusta, mínimo tres aceptadas y ajuste acotado. */
export function recommend(input: {
  domain: string;
  attributes: Record<string, unknown>;
  costs: CostsDto;
  history: HistorySample[];
  useHistory: boolean;
  mode: 'baseline' | 'adaptive';
  referenceCount: number;
}) {
  const summary = costSummary(input.costs);
  if (summary.totalCost <= 0)
    throw new BadRequestException(
      'Ingresa tus costos antes de solicitar una recomendación',
    );
  const key = comparisonKey(input.domain, input.attributes);
  const comparable = key.replace(/[|,]/g, '')
    ? input.history.filter(
        (h) =>
          h.domain === input.domain &&
          comparisonKey(h.domain, h.attributes) === key &&
          h.totalCost > 0 &&
          Number.isFinite(h.price) &&
          ['ACCEPTED_BY_CLIENT', 'REJECTED_BY_CLIENT'].includes(h.status),
      )
    : [];
  const accepted = comparable
    .filter((h) => h.status === 'ACCEPTED_BY_CLIENT')
    .map((h) => (h.price / h.totalCost - 1) * 100)
    .filter((m) => Number.isFinite(m) && m >= 0 && m <= 500)
    .sort((a, b) => a - b);
  let margin = input.costs.profitMargin;
  const adapted =
    input.mode === 'adaptive' && input.useHistory && accepted.length >= 3;
  const reasons = [
    `Costo actual: $${Math.round(summary.totalCost)} CLP. Recargo base sobre costos: ${margin}%.`,
  ];
  if (adapted) {
    const mid = Math.floor(accepted.length / 2);
    const median =
      accepted.length % 2
        ? accepted[mid]
        : (accepted[mid - 1] + accepted[mid]) / 2;
    const weight = Math.min(0.5, accepted.length / 20);
    margin =
      Math.round(
        Math.max(
          0,
          Math.min(
            500,
            margin + Math.max(-15, Math.min(15, (median - margin) * weight)),
          ),
        ) * 100,
      ) / 100;
    reasons.push(
      `Se consideran ${accepted.length} trabajos aceptados comparables del profesional. Mediana histórica: ${median.toFixed(1)}%; peso: ${(weight * 100).toFixed(0)}%; ajuste máximo: 15 puntos.`,
    );
  } else
    reasons.push(
      input.mode === 'baseline'
        ? 'Modo base: usa solo los costos y el recargo ingresados.'
        : !input.useHistory
          ? 'El uso del historial está desactivado en tu perfil.'
          : 'Se requieren al menos 3 trabajos aceptados comparables; se conserva tu recargo.',
    );
  const suggestedTotal = Math.max(
    Math.ceil(summary.totalCost),
    Math.ceil(Math.round(summary.totalCost * (100 + margin)) / 100),
  );
  if (suggestedTotal > 99999999)
    throw new BadRequestException(
      'El precio recomendado excede el límite permitido',
    );
  const warnings = [
    'La aceptación no demuestra que el precio sea óptimo. Revisa esfuerzo, alcance e impuestos antes de cotizar.',
  ];
  if (!input.referenceCount)
    warnings.push(
      'No hay referencias web guardadas: confirma el diseño con el cliente. Esto no cambia el precio.',
    );
  return {
    version: 'cost-history-v1',
    mode: input.mode,
    adapted,
    suggestedTotal,
    baselineTotal: summary.suggestedPrice,
    totalCost: summary.totalCost,
    appliedMargin: margin,
    sampleCount: accepted.length,
    decisionCount: comparable.length,
    acceptanceRate: comparable.length
      ? comparable.filter((h) => h.status === 'ACCEPTED_BY_CLIENT').length /
        comparable.length
      : null,
    referenceCount: input.referenceCount,
    reasons,
    warnings,
  };
}
