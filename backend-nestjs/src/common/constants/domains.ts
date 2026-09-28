/**
 * Rubros soportados por el motor NLP. Debe mantenerse sincronizado con
 * `SUPPORTED_DOMAINS` del servicio Python (service-python/app/api.py).
 */
export const SUPPORTED_DOMAINS = ['cake', 'tattoo'] as const;
export type Domain = (typeof SUPPORTED_DOMAINS)[number];
