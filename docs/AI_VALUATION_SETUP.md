# AI Valuation Module Setup Guide

This guide covers the **environment-based setup** (a Python virtual environment + `.env`
files) for the **AI Valuation Module** of the **Fair Compensation and Resettlement
Smart Contract System (FCR-SCS)**. No global/`pip install` into your system Python is
needed — everything lives inside `business_logic_layer/ai_prediction_service/.venv`.

---

## 📌 Overview

The AI Valuation service runs as a lightweight Python sidecar (`app.py`, port `5001`)
alongside the unified Express backend (`server.ts`, port `3030`) and the React frontend
(`5173`). It uses a **Scikit-Learn Random Forest Regressor** to predict the market value
of the land portion being acquired and to derive the statutory compensation package
(15 % solatium + relocation allowance). See `AI_VALUATION_CALCULATION.md` (local file,
git-ignored) for the full formula.

---

## 🛠️ 1. Prerequisites

* Python 3.10 – 3.14 installed (`python --version`)
* Node.js + npm installed at the repo root (`npm install` already run)

---

## 🐍 2. Create the virtual environment

From the **project root**:

```powershell
npm run ai:venv
```

* Creates `business_logic_layer/ai_prediction_service/.venv`.
* Equivalently: `python -m venv business_logic_layer/ai_prediction_service/.venv`

---

## 📦 3. Install the Python dependencies *into that environment*

```powershell
npm run ai:install
```

`ai:install` resolves the interpreter the same way the service does — it uses
`.venv/Scripts/python.exe` when present and only falls back to the system Python if no
virtual environment exists — then runs `pip install -r requirements.txt`.

### Manual equivalent (if you prefer activating the venv)

```powershell
cd business_logic_layer\ai_prediction_service
.\.venv\Scripts\Activate.ps1          # Windows PowerShell
# source .venv/bin/activate           # macOS / Linux
pip install -r requirements.txt
```

Dependencies: `flask`, `scikit-learn`, `pandas`, `numpy`, `joblib`.

### ✅ Verify

```powershell
business_logic_layer\ai_prediction_service\.venv\Scripts\python.exe -c "import flask, sklearn, pandas, numpy, joblib; print('AI deps OK')"
```

---

## 🔐 4. Configure the environment (single root `.env`)

The whole monorepo uses **one environment file at the repository root** (the same file
the database, backend, blockchain and frontend read). A committed template exists:

```powershell
copy .env.example .env
```

The AI Valuation keys are section **5** of that file:

| Variable | Read by | Purpose | Default |
|---|---|---|---|
| `AI_SERVICE_URL` | Express backend (`server.ts`) | URL the backend dials to reach the sidecar | `http://127.0.0.1:5001` |
| `AI_SERVICE_PORT` | Python sidecar (`app.py`) | Port the Flask sidecar binds to | `5001` |

Other keys in the same file you will need: `DATABASE_URL` (PostgreSQL) and
`VITE_API_BASE_URL` (frontend).

> **Loading rules** — `server.ts` loads the root `.env` at startup; Vite reads the
> `VITE_*` keys from it (`envDir` points at the repo root); the sidecar falls back to
> the root `.env` when it starts (`app.py`), so one file configures everything. With
> the defaults above, **no editing is required at all** — only change a value if you
> move a service to another port or use a different database. If you ever need a
> sidecar-specific override, an optional `.env` inside
> `business_logic_layer/ai_prediction_service/` takes precedence over the root file.

---

## 📊 5. Generate the dataset and train the model

```powershell
npm run ai:dataset     # writes datasets/fcr_scs_valuation_{train,test}_dataset.csv
npm run ai:train       # writes models/fcr_scs_property_valuation_rf.joblib + model_registry.json
```

* Training rows: **6,000**; independent evaluation rows: **1,500**.
* Expected accuracy: **R² ≈ 0.97** (≈ 97 %), MAE ≈ RM 466k on the evaluation set.
* Both scripts run inside the venv (same resolver as `dev:ai`).
* Manual equivalent: `python generate_datasets.py` / `python train_model.py` from the
  service folder with the venv activated.

> The model files are produced artifacts — if `data_layer/ai_model_repository/models/`
> is empty, the AI pages will report "no active model" until you run `ai:train`.

---

## 🚀 6. Running the application

### Option A — everything at once (recommended)

```powershell
npm run dev
```

`concurrently` starts three processes:

| Panel | Service | URL |
|---|---|---|
| `[backend]` | Unified Express API | http://localhost:3030 |
| `[frontend]` | React app | http://localhost:5173 |
| `[ai]` | Python sidecar (**uses `.venv` automatically**) | http://127.0.0.1:5001 |

The `[ai]` panel logs which interpreter it picked:
`[dev:ai] Virtual environment: ...\.venv\Scripts\python.exe`.

### Option B — AI sidecar only

```powershell
npm run dev:ai
```

---

## 🔍 7. Verification & health check

| Check | Command / URL | Expected |
|---|---|---|
| Sidecar health | http://127.0.0.1:5001/health | `{"status":"OK","service":"fcr-scs-ai-valuation","modelLoaded":true}` |
| Model info via backend | http://localhost:3030/api/prediction/model | version `v1.0`, 7 features, R² ≈ 0.97 |
| UI — generate | http://localhost:5173/admin/prediction | form + result card |
| UI — retrain | http://localhost:5173/admin/prediction/retrain | model cards, upload zone, comparison pop-up |

> `/health` reports `modelLoaded: false` when the model artifact is missing even though
> the service is up — run `npm run ai:train` in that case.

---

## ❓ 8. Common troubleshooting

**Q1 — `ModuleNotFoundError: No module named 'flask'` (or `sklearn`/`pandas`)**
The sidecar is being started with an interpreter that has no dependencies. Re-run
`npm run ai:install` (installs into `.venv`), or recreate the environment:
`npm run ai:venv && npm run ai:install`. Confirm the venv exists at
`business_logic_layer/ai_prediction_service/.venv`.

**Q2 — Port 5001 already in use**

```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5001).OwningProcess | Stop-Process -Force
```

On Windows, stopping the npm/concurrently wrapper can leave the Python child alive, so
check the port before starting a second copy.

**Q3 — Frontend says "AI valuation service is unavailable"**
1. Check http://127.0.0.1:5001/health.
2. If it is down, the backend tries to **auto-start** the sidecar once per process using
   the same venv resolver (see `pythonBridge.service.ts`); the Retrain page also has a
   **Retry** button.
3. If auto-start fails, the usual cause is a missing venv/dependencies — see Q1.

**Q4 — "No active model found" / retrain page shows `—` for the metrics**
Run `npm run ai:train` (or activate a candidate from the Retrain page).

**Q5 — Retrain upload rejected**
Datasets must be `.csv` with the columns shown on the page
(`state, land_category, location_type, tenure_type, land_area_m2, acquisition_area_m2,
building_age_years, market_value_myr`), at least **2,000 rows**, and use the option
values from `presentation_layer/src/constants`. Use **Download Current Dataset** on the
Retrain page to start from a valid file.

---

## 📁 9. Where things live

| Path | Contents |
|---|---|
| `business_logic_layer/ai_prediction_service/app.py` | Flask sidecar (predict / train / activate / discard / dataset download) |
| `.../ml_core.py` | Features, pipeline, metrics, registry, compensation rules |
| `.../generate_datasets.py` | Synthetic dataset generator |
| `.../train_model.py` | Baseline trainer |
| `.../requirements.txt` | Python dependencies |
| `data_layer/ai_model_repository/datasets/` | Training/evaluation CSVs + `uploads/` (git-ignored copies of retrain uploads) |
| `data_layer/ai_model_repository/models/` | `*.joblib` model + `model_registry.json` |
| `business_logic_layer/ai_prediction_service/src/` | Express routes/controllers/bridge for `/api/prediction/*` |
| `scripts/dev-ai.mjs` | Venv-aware launcher used by all `ai:*` npm scripts |
