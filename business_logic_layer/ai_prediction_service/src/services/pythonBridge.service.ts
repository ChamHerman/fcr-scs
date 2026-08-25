/**
 * HTTP bridge to the Python AI valuation sidecar (Flask, default port 5001).
 * The sidecar owns the trained model; this service just forwards requests.
 */

import { ModelInfo, RetrainComparison, ValuationBreakdown, ValuationInput } from "../interfaces/prediction.types";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:5001";

const TIMEOUT_MS = {
  predict: 20_000,
  info: 10_000,
  train: 300_000,
  mutate: 30_000,
  download: 15_000,
};

async function requestJson<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(AI_SERVICE_URL + path, { ...init, signal: controller.signal });
  } catch {
    throw new Error(
      `AI valuation service is unavailable at ${AI_SERVICE_URL}. ` +
      `Install its dependencies once with "pip install -r business_logic_layer/ai_prediction_service/requirements.txt" ` +
      `and start everything with "npm run dev".`
    );
  } finally {
    clearTimeout(timer);
  }

  let body: any;
  try {
    body = await res.json();
  } catch {
    throw new Error(`AI valuation service returned a non-JSON response (HTTP ${res.status})`);
  }
  if (!res.ok || body?.success === false) {
    throw new Error(body?.error || `AI valuation service request failed (HTTP ${res.status})`);
  }
  return body as T;
}

function postJson(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export async function valuate(input: ValuationInput): Promise<ValuationBreakdown> {
  const res = await requestJson<{ data: ValuationBreakdown }>("/predict", postJson(input), TIMEOUT_MS.predict);
  return res.data;
}

export async function getModelInfo(): Promise<ModelInfo> {
  const res = await requestJson<{ data: ModelInfo }>("/model/info", { method: "GET" }, TIMEOUT_MS.info);
  return res.data;
}

export async function retrainModel(csvBuffer: Buffer, filename: string, splitRatio = 0.2): Promise<RetrainComparison> {
  const form = new FormData();
  form.append("dataset", new Blob([new Uint8Array(csvBuffer)], { type: "text/csv" }), filename);
  form.append("splitRatio", String(splitRatio));
  const res = await requestJson<{ data: RetrainComparison }>("/train", { method: "POST", body: form }, TIMEOUT_MS.train);
  return res.data;
}

export async function activateModel(candidateId: string): Promise<ModelInfo> {
  const res = await requestJson<{ data: ModelInfo }>("/model/activate", postJson({ candidateId }), TIMEOUT_MS.mutate);
  return res.data;
}

export async function discardCandidate(candidateId: string): Promise<void> {
  await requestJson("/model/discard", postJson({ candidateId }), TIMEOUT_MS.mutate);
}

export async function downloadDatasetTemplate(): Promise<{ buffer: Buffer; filename: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS.download);
  let res: Response;
  try {
    res = await fetch(AI_SERVICE_URL + "/dataset/template", { signal: controller.signal });
  } catch {
    throw new Error(
      `AI valuation service is unavailable at ${AI_SERVICE_URL}. ` +
      `Install its dependencies once with "pip install -r business_logic_layer/ai_prediction_service/requirements.txt" ` +
      `and start everything with "npm run dev".`
    );
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`Failed to download dataset template (HTTP ${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), filename: "valuation_dataset_template.csv" };
}
