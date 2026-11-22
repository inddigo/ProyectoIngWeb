export interface ProfessionalProfile {
  hourlyRate: number;
  fixedCosts: number;
  profitMargin: number;
  useHistory: boolean;
}

export interface Recommendation {
  id: string;
  version: string;
  mode: 'baseline' | 'adaptive';
  adapted: boolean;
  suggestedTotal: number;
  baselineTotal: number;
  totalCost: number;
  appliedMargin: number;
  sampleCount: number;
  decisionCount: number;
  acceptanceRate: number | null;
  referenceCount: number;
  reasons: string[];
  warnings: string[];
}
