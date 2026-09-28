export type Domain = 'cake' | 'tattoo';

export type OrderStatus =
  | 'DRAFT'
  | 'STRUCTURED'
  | 'CONFIRMED_BY_CLIENT'
  | 'QUOTED'
  | 'ACCEPTED_BY_CLIENT'
  | 'REJECTED_BY_CLIENT';

export type AttributeValue = string | number | string[];
export type Attributes = Record<string, AttributeValue>;

/** Respuesta del motor NLP (contrato snake_case del servicio Python). */
export interface StructuredOrder {
  raw_text: string;
  domain: Domain;
  entities: Attributes & { confidence_score?: number };
  web_references: { title: string; image_url: string; source: string }[];
  fallback?: boolean;
}

export interface WebReference {
  title: string;
  imageUrl: string;
  source: string;
}

export interface Quote {
  id: string;
  estimatedPrice: string | number;
  details: string;
  createdAt: string;
}

export interface Order {
  id: string;
  domain: Domain;
  rawText: string;
  status: OrderStatus;
  attributes: Attributes | null;
  imageUrl?: string | null;
  confidenceScore?: number | null;
  createdAt: string;
  webReferences: WebReference[];
  quote?: Quote | null;
}

export interface CreateOrderPayload {
  rawText: string;
  domain: Domain;
  attributes: Attributes;
  confidenceScore?: number;
  imageUrl?: string;
  webReferences?: WebReference[];
}

export interface CreateQuotePayload {
  orderId: string;
  estimatedPrice: number;
  details: string;
  breakdown?: Record<string, unknown>;
}

export interface QuoteEstimate {
  orderId: string;
  suggestedTotal: number;
  breakdown: Record<string, number>;
}

export const DOMAIN_LABELS: Record<Domain, string> = {
  cake: 'Pastelería',
  tattoo: 'Tatuajes',
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Borrador',
  STRUCTURED: 'Estructurado',
  CONFIRMED_BY_CLIENT: 'Pendiente de cotización',
  QUOTED: 'Cotización recibida',
  ACCEPTED_BY_CLIENT: 'Aceptado',
  REJECTED_BY_CLIENT: 'Rechazado',
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  DRAFT: 'medium',
  STRUCTURED: 'medium',
  CONFIRMED_BY_CLIENT: 'warning',
  QUOTED: 'primary',
  ACCEPTED_BY_CLIENT: 'success',
  REJECTED_BY_CLIENT: 'danger',
};
