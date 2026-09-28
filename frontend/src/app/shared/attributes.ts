import { Attributes, AttributeValue } from '../core/models/order.model';

const LABELS: Record<string, string> = {
  servings: 'Porciones',
  theme: 'Temática',
  dietary_restrictions: 'Restricciones',
  flavors: 'Sabores',
  size: 'Tamaño',
  style: 'Estilo',
  body_part: 'Zona del cuerpo',
};

export function attributeLabel(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, ' ');
}

export function formatAttribute(value: AttributeValue | undefined): string {
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '—';
  }
  return value === undefined || value === null || value === '' ? '—' : String(value);
}

/** Entradas de atributos sin el puntaje de confianza. */
export function attributeEntries(
  attrs: Attributes | null | undefined,
): [string, AttributeValue][] {
  return Object.entries(attrs ?? {}).filter(([k]) => k !== 'confidence_score');
}

/**
 * Convierte el texto editado por el cliente de vuelta al tipo original
 * (lista separada por comas o número) para guardarlo en JSON.
 */
export function parseAttribute(
  original: AttributeValue | undefined,
  edited: string,
): AttributeValue {
  if (Array.isArray(original)) {
    return edited
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (typeof original === 'number') {
    const n = Number(edited);
    return Number.isFinite(n) && edited.trim() !== '' ? n : original;
  }
  return edited.trim();
}
