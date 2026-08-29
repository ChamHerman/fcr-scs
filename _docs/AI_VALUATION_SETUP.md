# AI Valuation Module Setup Guide

This guide provides step-by-step instructions for team members to set up, install dependencies, train the model, and run the **AI Valuation Module** for the **Fair Compensation and Resettlement Smart Contract System (FCR-SCS)**.

---

## 📌 Overview

The AI Valuation service runs as a lightweight Python sidecar (`app.py` on port `5001`) alongside the Modular Monolith backend (`server.ts` on port `3030`). It uses a **Scikit-Learn Random Forest Regressor** to predict fair market property valuations and compute statutory compensation packages.

---

## 🛠️ 1. Prerequisites

Ensure Python 3 (Python 3.10, 3.11, 3.12, or 3.14) is installed on your machine:

```powershell
python --version
pip --version
```

*(If `python` is not recognized, ensure Python is added to your Windows Environment System PATH).*

---

## 📦 2. Install Python Dependencies (Manual Installation)

Run this single command in your terminal from the project root:

```powershell
pip install flask scikit-learn pandas numpy joblib
```

### Or install packages individually:
```powershell
pip install flask
pip install scikit-learn
pip install pandas
pip install numpy
pip install joblib
```

### ✅ Verify Installation:
Run the following check command:
```powershell
python -c "import flask, sklearn, pandas, numpy, joblib; print('✅ All AI dependencies installed successfully!')"
```

---

## 📊 3. Generate Datasets & Train the AI Model

Before starting the server for the first time, generate the dataset and train your local model:

### Step 3.1: Generate Synthetic Valuation Datasets
```powershell
python business_logic_layer/ai_prediction_service/generate_datasets.py
```
* **Output Created**:
  * `data_layer/ai_model_repository/datasets/fcr_scs_valuation_train_dataset.csv` (6,000 samples)
  * `data_layer/ai_model_repository/datasets/fcr_scs_valuation_test_dataset.csv` (1,500 samples)

### Step 3.2: Train & Evaluate the AI Model
```powershell
python business_logic_layer/ai_prediction_service/train_model.py
```
* **Output Created**:
  * `data_layer/ai_model_repository/models/fcr_scs_property_valuation_rf.joblib` (Trained Random Forest Model)
  * `data_layer/ai_model_repository/models/model_registry.json` (Active Model Version Registry)
* **Expected Accuracy**: ~**95.9%** ($R^2$ Score)

---

## 🚀 4. Running the Application

### Option A: Run Everything Concurrently (Recommended)
From the project root folder:
```powershell
npm run dev
```
This launches all 3 required services together:
1. **Frontend App**: `http://localhost:5173`
2. **Backend API Server**: `http://localhost:3030`
3. **Python AI Valuation Service**: `http://127.0.0.1:5001`

---

### Option B: Run AI Service Individually
If you want to run or debug only the Python AI service:
```powershell
npm run dev:ai
```
*(Or directly: `cd business_logic_layer/ai_prediction_service && python app.py`)*

---

## 🔍 5. Verification & Health Check

Open your web browser or test in terminal:

* **AI Health Check Endpoint**: [http://127.0.0.1:5001/health](http://127.0.0.1:5001/health)
* **Expected JSON Response**:
```json
{
  "status": "ok",
  "activeModel": "v1.0",
  "activeModelFile": "fcr_scs_property_valuation_rf.joblib"
}
```

---

## ❓ 6. Common Troubleshooting

### Q1: `ModuleNotFoundError: No module named 'flask'` (or `sklearn`)
* **Cause**: Packages were installed in a different Python version or virtual environment.
* **Fix**: Run `python -m pip install flask scikit-learn pandas numpy joblib` to install directly into the active Python runtime.

### Q2: Port 5001 is already in use (`Address already in use`)
* **Fix (Windows PowerShell)**:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5001).OwningProcess | Stop-Process -Force
```

### Q3: Frontend says "AI valuation service is unavailable"
* **Fix**: Ensure the Python service is running on `http://127.0.0.1:5001`. If started via `npm run dev`, the backend will also attempt to auto-spawn the Python service when requests arrive.
