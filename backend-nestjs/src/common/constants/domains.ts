/**
 * Rubros soportados por el motor NLP. Debe mantenerse sincronizado con
 * `SUPPORTED_DOMAINS` del servicio Python (service-python/app/api.py).
 */
export const SUPPORTED_DOMAINS = ['general', 'cake', 'tattoo'] as const;
export type Domain = (typeof SUPPORTED_DOMAINS)[number];

export function manualAttributes(domain: Domain): Record<string, unknown> {
  if (domain === 'general')
    return {
      service_type: '',
      quantity: 1,
      materials: '',
      deadline: '',
      delivery: '',
    };
  if (domain === 'tattoo') return { size: '', style: '', body_part: '' };
  return { servings: 1, theme: '', flavors: [], dietary_restrictions: [] };
}
