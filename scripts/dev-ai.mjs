#!/usr/bin/env node
/**
 * Launches the Python AI Valuation sidecar for `npm run dev`.
 *
 * Prefers the project's virtual environment (business_logic_layer/ai_prediction_service/.venv,
 * or a repo-root .venv) so the environment-based setup in
 * _docs/AI_VALUATION_SETUP.md is what actually runs, then falls back to the
 * system Python. Mirrors the resolver used by the Express backend's sidecar
 * auto-start (pythonBridge.service.ts) so both paths behave identically.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sidecarDir = path.join(repoRoot, 'business_logic_layer', 'ai_prediction_service');

const pythonCandidates = [
  path.join(sidecarDir, '.venv', 'Scripts', 'python.exe'),
  path.join(sidecarDir, 'venv', 'Scripts', 'python.exe'),
  path.join(sidecarDir, '.venv', 'bin', 'python'),
  path.join(sidecarDir, 'venv', 'bin', 'python'),
  path.join(repoRoot, '.venv', 'Scripts', 'python.exe'),
  path.join(repoRoot, 'venv', 'Scripts', 'python.exe'),
  path.join(repoRoot, '.venv', 'bin', 'python'),
  path.join(repoRoot, 'venv', 'bin', 'python'),
];

const python = pythonCandidates.find((candidate) => fs.existsSync(candidate))
  ?? (process.platform === 'win32' ? 'python' : 'python3');

const usingVenv = python !== 'python' && python !== 'python3';
console.log(`[dev:ai] ${usingVenv ? 'Virtual environment' : 'System Python'}: ${python}`);
if (!usingVenv) {
  console.log('[dev:ai] No .venv found. See _docs/AI_VALUATION_SETUP.md to create one (recommended).');
}

// Modes: --install | --dataset | --train | (default) run the Flask sidecar.
// Every mode uses the same resolved interpreter, so npm scripts stay in sync
// with the environment setup.
const mode = process.argv[2] ?? '';
const [script, args] =
  mode === '--install' ? [null, ['-m', 'pip', 'install', '-r', 'requirements.txt']]
  : mode === '--dataset' ? ['generate_datasets.py', []]
  : mode === '--train' ? ['train_model.py', []]
  : ['app.py', []];

const child = spawn(python, script ? [script, ...args] : args, { cwd: sidecarDir, stdio: 'inherit' });

child.on('error', (err) => {
  console.error(`[dev:ai] Failed to start the AI sidecar with "${python}": ${err.message}`);
  console.error('[dev:ai] Install dependencies into the environment first: pip install -r requirements.txt');
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
