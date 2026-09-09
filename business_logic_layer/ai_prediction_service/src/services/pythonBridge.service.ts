/**
 * HTTP bridge to the Python AI valuation sidecar (Flask, default port 5001).
 * The sidecar owns the trained model; this service forwards requests to it.
 *
 * Self-healing: if the sidecar is not reachable (e.g. the backend was started
 * without the [ai] process of `npm run dev`), the first failing request spawns
 * `app.py` once, waits for its health endpoint, and retries.
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { ModelInfo, RetrainComparison, ValuationBreakdown, ValuationInput } from "../interfaces/prediction.types";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:5001";
// src/services -> ai_prediction_service root
const SIDECAR_DIR = path.resolve(__dirname, "..", "..");

function resolvePythonCommand(): string {
  const candidates = [
    // Inside ai_prediction_service (.venv / venv)
    path.join(SIDECAR_DIR, ".venv", "Scripts", "python.exe"),
    path.join(SIDECAR_DIR, "venv", "Scripts", "python.exe"),
    path.join(SIDECAR_DIR, ".venv", "bin", "python"),
    path.join(SIDECAR_DIR, "venv", "bin", "python"),
    // Repository root (.venv / venv)
    path.join(SIDECAR_DIR, "..", "..", ".venv", "Scripts", "python.exe"),
    path.join(SIDECAR_DIR, "..", "..", "venv", "Scripts", "python.exe"),
    path.join(SIDECAR_DIR, "..", "..", ".venv", "bin", "python"),
    path.join(SIDECAR_DIR, "..", "..", "venv", "bin", "python"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return process.platform === "win32" ? "python" : "python3";
}

const TIMEOUT_MS = {
  predict: 20_000,
  info: 10_000,
  train: 300_000,
  mutate: 30_000,
  download: 15_000,
};

const UNAVAILABLE_MSG =
  `AI valuation service is unavailable at ${AI_SERVICE_URL}. ` +
  `Install its dependencies once with "pip install -r business_logic_layer/ai_prediction_service/requirements.txt" ` +
  `and start everything with "npm run dev".`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let sidecarAutoStartAttempted = false;

async function isSidecarHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/health`, { signal: AbortSignal.timeout(1_500) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Returns 'healthy' when the sidecar already answers, 'restarted' when this
 * call spawned it and it became healthy, 'unavailable' when it could not be
 * brought up (spawn failure or flask missing).
 */
async function ensureSidecarRunning(): Promise<"healthy" | "restarted" | "unavailable"> {
  if (await isSidecarHealthy()) return "healthy";
  if (sidecarAutoStartAttempted) return "unavailable";
  sidecarAutoStartAttempted = true;

  console.log("[ai_prediction_service] Sidecar not reachable - auto-starting Python sidecar...");
  const command = resolvePythonCommand();
  const child = spawn(command, ["app.py"], { cwd: SIDECAR_DIR, stdio: "ignore" });
  child.on("error", (err) => {
    console.error("[ai_prediction_service] Could not auto-start sidecar:", err.message);
  });

  for (let attempt = 0; attempt < 20; attempt++) {
    await sleep(500);
    if (await isSidecarHealthy()) {
      console.log("[ai_prediction_service] Sidecar auto-started and healthy.");
      return "restarted";
    }
  }
  console.error("[ai_prediction_service] Sidecar did not become healthy after auto-start (is flask installed?).");
  return "unavailable";
}

async function timedFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Performs the request; if the sidecar is down, starts it and retries once.
 * A failure while the sidecar is healthy (e.g. a timeout) is rethrown as-is.
 */
async function fetchWithSelfHeal(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  let firstError: unknown;
  try {
    return await timedFetch(AI_SERVICE_URL + path, init, timeoutMs);
  } catch (err) {
    if (await isSidecarHealthy()) {
      throw err;
    }
    firstError = err;
  }

  const status = await ensureSidecarRunning();
  if (status !== "restarted") {
    throw new Error(UNAVAILABLE_MSG);
  }
  try {
    return await timedFetch(AI_SERVICE_URL + path, init, timeoutMs);
  } catch {
    console.error("[ai_prediction_service] Request failed even after sidecar restart.", firstError);
    throw new Error(UNAVAILABLE_MSG);
  }
}

async function requestJson<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const res = await fetchWithSelfHeal(path, init, timeoutMs);

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

export async function retrainModel(csvBuffer: Buffer, filename: string): Promise<RetrainComparison> {
  const form = new FormData();
  form.append("dataset", new Blob([new Uint8Array(csvBuffer)], { type: "text/csv" }), filename);
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
  const res = await fetchWithSelfHeal("/dataset/template", { method: "GET" }, TIMEOUT_MS.download);
  if (!res.ok) {
    throw new Error(`Failed to download dataset template (HTTP ${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), filename: "valuation_dataset_template.csv" };
}
