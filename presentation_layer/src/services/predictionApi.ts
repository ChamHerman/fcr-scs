import { BASE_URL, fetchJSON } from './api';

// --- Types (mirror the backend /api/prediction responses) ---

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
  trainedAt: string;
  metrics: ModelMetrics;
  datasetRows: number;
  features: string[];
  pendingCandidates?: number;
}

export interface RetrainComparison {
  candidateId: string;
  verdict: 'better' | 'worse' | 'equal';
  rows: number;
  evaluatedOn: { testRows: number };
  current: { version: string; metrics: ModelMetrics } | null;
  candidate: { candidateId: string; metrics: ModelMetrics };
}

// The 7 valuation attributes — must match the model feature schema (vocabulary
// aligned with the Valuation module constants: title land categories, m2 areas,
// 16 states, no building condition). Dropdown values come from src/constants.
export interface ValuationInput {
  state: string;
  land_category: string;
  location_type: string;
  tenure_type: string;
  land_area_m2: number;
  built_up_area_m2: number;
  building_age_years: number;
}

// Legacy payload shape still sent by the manual ValuationCreate form
// (pre-alignment keys). The backend normaliser folds these onto the m2 schema.
export interface LegacyValuationCall {
  state: string;
  land_category: string;
  location_type: string;
  tenure_type: string;
  building_condition?: string;
  land_area_sqft: number;
  built_up_area_sqft: number;
  building_age_years: number;
}

export type ValuationPayload = ValuationInput | LegacyValuationCall;

// --- Endpoints ---

export async function valuateProperty(input: ValuationPayload): Promise<ValuationBreakdown> {
  const res = await fetchJSON(`${BASE_URL}/api/prediction/valuate`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function getModelInfo(): Promise<ModelInfo> {
  const res = await fetchJSON(`${BASE_URL}/api/prediction/model`);
  return res.data;
}

export async function retrainModel(file: File): Promise<RetrainComparison> {
  const form = new FormData();
  form.append('dataset', file);
  const res = await fetchMultipart(`${BASE_URL}/api/prediction/retrain`, form);
  return res.data;
}

export async function activateModel(candidateId: string): Promise<ModelInfo> {
  const res = await fetchJSON(`${BASE_URL}/api/prediction/model/activate`, {
    method: 'POST',
    body: JSON.stringify({ candidateId }),
  });
  return res.data;
}

export async function discardCandidate(candidateId: string): Promise<void> {
  await fetchJSON(`${BASE_URL}/api/prediction/model/discard`, {
    method: 'POST',
    body: JSON.stringify({ candidateId }),
  });
}

export function datasetTemplateUrl(): string {
  return `${BASE_URL}/api/prediction/dataset-template`;
}

// Downloads the sample dataset as a file. Fetched via XHR (instead of a plain
// link) so backend/sidecar failures surface as catchable errors with a helpful
// message instead of the browser navigating to a raw JSON error page.
export async function downloadTemplateFile(): Promise<void> {
  let res: Response;
  try {
    res = await fetch(datasetTemplateUrl());
  } catch {
    throw new Error('Network Error: Cannot reach the backend. Is it running?');
  }
  if (!res.ok) {
    let message = `Download failed with status ${res.status}`;
    try {
      const data = await res.json();
      message = data?.error || message;
    } catch {
      // non-JSON error body — keep the status-based message
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'valuation_dataset_template.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// fetchJSON always sets a JSON Content-Type, which breaks the multipart
// boundary — uploads need their own wrapper with the same error handling.
async function fetchMultipart(url: string, form: FormData) {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', body: form });
  } catch {
    throw new Error(`Network Error: Cannot connect to ${url}. Is the backend service running?`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server Error (${res.status}): Unexpected non-JSON response from ${url}`);
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
  }
  return data;
}
