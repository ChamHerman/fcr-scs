/**
 * Shared types for the AI Valuation feature.
 * Shapes mirror the JSON returned by the Python sidecar (app.py).
 */

export interface ModelMetrics {
  mae: number;
  rmse: number;
  r2: number;
}

export interface ValuationBreakdown {
  marketValueMyr: number;
  statutoryDisturbanceMyr: number;
  relocationAllowanceMyr: number;
  recommendedCompensationMyr: number;
  estimateRangeLowMyr: number;
  estimateRangeHighMyr: number;
  modelVersion: string | null;
}

export interface ModelInfo {
  version: string;
  file: string;
  trainedAt: string;
  metrics: ModelMetrics;
  datasetRows: number;
  features: string[];
  pendingCandidates?: number;
}

export interface RetrainComparison {
  candidateId: string;
  verdict: "better" | "worse" | "equal";
  rows: number;
  split: { trainRows: number; holdoutRows: number };
  current: { version: string; metrics: ModelMetrics } | null;
  candidate: { candidateId: string; metrics: ModelMetrics };
}

export interface ValuationInput {
  state: string;
  land_category: string;
  location_type: string;
  tenure_type: string;
  building_condition: string;
  land_area_sqft: number;
  built_up_area_sqft: number;
  building_age_years: number;
}
