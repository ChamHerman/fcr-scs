"""
Shared ML logic for the FCR-SCS AI Valuation service.

Used by train_model.py (baseline CLI) and app.py (Flask sidecar):
feature definitions, pipeline construction, evaluation, model persistence,
and the JSON registry that tracks the active model / retraining candidates.
"""

import json
import os
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
DATASETS_DIR = os.path.join(REPO_ROOT, 'data_layer', 'ai_model_repository', 'datasets')
MODELS_DIR = os.path.join(REPO_ROOT, 'data_layer', 'ai_model_repository', 'models')
UPLOADS_DIR = os.path.join(DATASETS_DIR, 'uploads')

ACTIVE_MODEL_FILE = 'fcr_scs_property_valuation_rf.joblib'
ACTIVE_MODEL_PATH = os.path.join(MODELS_DIR, ACTIVE_MODEL_FILE)
REGISTRY_PATH = os.path.join(MODELS_DIR, 'model_registry.json')

TRAIN_DATASET_PATH = os.path.join(DATASETS_DIR, 'fcr_scs_valuation_train_dataset.csv')
TEST_DATASET_PATH = os.path.join(DATASETS_DIR, 'fcr_scs_valuation_test_dataset.csv')

CATEGORICAL_FEATURES = ['state', 'land_category', 'location_type', 'tenure_type', 'building_condition']
NUMERIC_FEATURES = ['land_area_sqft', 'built_up_area_sqft', 'building_age_years']
FEATURE_COLUMNS = CATEGORICAL_FEATURES + NUMERIC_FEATURES
TARGET_COLUMN = 'market_value_myr'

# Allowed values mirror generate_datasets.py so uploads can be validated.
VALID_VALUES = {
    'state': ['Selangor', 'Penang', 'Johor', 'Melaka', 'Pahang', 'Perak', 'Terengganu', 'Sabah', 'Sarawak'],
    'land_category': ['Residential', 'Commercial', 'Agricultural', 'Industrial'],
    'location_type': ['Urban', 'Suburban', 'Rural_Coastal'],
    'tenure_type': ['Freehold', 'Leasehold_99', 'Malay_Reserve'],
    'building_condition': ['Excellent', 'Good', 'Fair', 'Poor'],
}


def build_pipeline():
    return Pipeline([
        ('preprocessor', ColumnTransformer([
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), CATEGORICAL_FEATURES),
            ('num', 'passthrough', NUMERIC_FEATURES),
        ])),
        ('regressor', RandomForestRegressor(n_estimators=100, max_depth=16, random_state=42, n_jobs=-1)),
    ])


def evaluate(model, X: pd.DataFrame, y: pd.Series) -> dict:
    pred = model.predict(X)
    return {
        'mae': round(float(mean_absolute_error(y, pred)), 2),
        'rmse': round(float(np.sqrt(mean_squared_error(y, pred))), 2),
        'r2': round(float(r2_score(y, pred)), 4),
    }


def save_model(model, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(model, path)


def load_model(path: str):
    return joblib.load(path)


def load_active_model():
    if not os.path.exists(ACTIVE_MODEL_PATH):
        return None
    return load_model(ACTIVE_MODEL_PATH)


# --- Compensation derivation (Land Acquisition Act 1960 style) ---

def derive_compensation(market_value_myr: float, built_up_area_sqft) -> dict:
    statutory_disturbance = int(round((market_value_myr * 0.15) / 100) * 100)
    relocation_allowance = 8000 if built_up_area_sqft and built_up_area_sqft > 0 else 2000
    recommended = int(round(market_value_myr)) + statutory_disturbance + relocation_allowance
    return {
        'marketValueMyr': int(round(market_value_myr)),
        'statutoryDisturbanceMyr': statutory_disturbance,
        'relocationAllowanceMyr': relocation_allowance,
        'recommendedCompensationMyr': recommended,
    }


def predict_with_range(pipeline, X: pd.DataFrame) -> tuple:
    """Returns (predictions, per-row std across trees) for an estimate range."""
    base_pred = pipeline.predict(X)
    regressor = pipeline.named_steps['regressor']
    transformed = pipeline[:-1].transform(X)
    tree_preds = np.stack([tree.predict(transformed) for tree in regressor.estimators_])
    return base_pred, tree_preds.std(axis=0)


# --- Model registry (JSON manifest co-located with artifacts) ---

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_registry() -> dict:
    if not os.path.exists(REGISTRY_PATH):
        return {'activeModel': None, 'candidates': [], 'history': []}
    with open(REGISTRY_PATH, 'r', encoding='utf-8') as f:
        registry = json.load(f)
    registry.setdefault('activeModel', None)
    registry.setdefault('candidates', [])
    registry.setdefault('history', [])
    return registry


def write_registry(registry: dict) -> None:
    os.makedirs(MODELS_DIR, exist_ok=True)
    with open(REGISTRY_PATH, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)


def make_active_entry(version: str, metrics: dict, dataset_rows: int) -> dict:
    return {
        'version': version,
        'file': ACTIVE_MODEL_FILE,
        'trainedAt': _now_iso(),
        'metrics': metrics,
        'datasetRows': dataset_rows,
        'features': FEATURE_COLUMNS,
    }


def activate_candidate(candidate_id: str) -> dict:
    """Promotes a candidate to the active model, archiving the previous one."""
    registry = read_registry()
    candidate = next((c for c in registry['candidates'] if c['candidateId'] == candidate_id), None)
    if candidate is None:
        raise KeyError(f'Candidate {candidate_id} not found')

    if registry['activeModel'] is not None:
        registry['history'].append({**registry['activeModel'], 'replacedAt': _now_iso()})
        prev_path = os.path.join(MODELS_DIR, registry['activeModel']['file'])
        if os.path.exists(prev_path):
            os.remove(prev_path)

    os.replace(os.path.join(MODELS_DIR, candidate['file']), ACTIVE_MODEL_PATH)
    registry['activeModel'] = {
        'version': _next_version(registry),
        'file': ACTIVE_MODEL_FILE,
        'trainedAt': candidate['trainedAt'],
        'metrics': candidate['metrics'],
        'datasetRows': candidate['datasetRows'],
        'features': FEATURE_COLUMNS,
    }
    registry['candidates'] = [c for c in registry['candidates'] if c['candidateId'] != candidate_id]
    write_registry(registry)
    return registry


def discard_candidate(candidate_id: str) -> dict:
    registry = read_registry()
    candidate = next((c for c in registry['candidates'] if c['candidateId'] == candidate_id), None)
    if candidate is None:
        raise KeyError(f'Candidate {candidate_id} not found')
    candidate_path = os.path.join(MODELS_DIR, candidate['file'])
    if os.path.exists(candidate_path):
        os.remove(candidate_path)
    registry['candidates'] = [c for c in registry['candidates'] if c['candidateId'] != candidate_id]
    write_registry(registry)
    return registry


def _next_version(registry: dict) -> str:
    current = registry.get('activeModel') or {}
    version = current.get('version', 'v0')
    try:
        minor = int(version.split('.')[1]) + 1
    except (IndexError, ValueError):
        minor = 1
    return f'v1.{minor}'


def validate_feature_payload(payload: dict) -> list:
    """Validates a single prediction payload; returns a list of error strings."""
    errors = []
    for col in CATEGORICAL_FEATURES:
        value = payload.get(col)
        if value is None or str(value).strip() == '':
            errors.append(f"'{col}' is required")
        elif value not in VALID_VALUES[col]:
            errors.append(f"'{col}' must be one of: {', '.join(VALID_VALUES[col])}")
    for col in NUMERIC_FEATURES:
        try:
            value = float(payload.get(col))
        except (TypeError, ValueError):
            errors.append(f"'{col}' must be a number")
            continue
        if value < 0:
            errors.append(f"'{col}' cannot be negative")
        elif col == 'land_area_sqft' and value == 0:
            errors.append("'land_area_sqft' must be greater than 0")
    if not errors and float(payload.get('building_age_years', 0)) > 120:
        errors.append("'building_age_years' must be 120 or below")

    # Built-up structures cannot exceed the plot; require a visible margin.
    try:
        land_area_value = float(payload.get('land_area_sqft'))
        built_up_value = float(payload.get('built_up_area_sqft'))
        if built_up_value >= land_area_value:
            errors.append("'built_up_area_sqft' must be smaller than 'land_area_sqft'")
        elif land_area_value - built_up_value < 100:
            errors.append("'land_area_sqft' must exceed 'built_up_area_sqft' by at least 100 sqft")
    except (TypeError, ValueError):
        pass  # already reported by the numeric checks above
    return errors


def validate_dataset_dataframe(df: pd.DataFrame) -> list:
    """Validates an uploaded retraining dataset; returns a list of error strings."""
    required = FEATURE_COLUMNS + [TARGET_COLUMN]
    missing = [c for c in required if c not in df.columns]
    if missing:
        return [f"Missing required columns: {', '.join(missing)}"]
    if len(df) < 2000:
        return [f"Dataset too small: {len(df)} rows found, at least 2,000 rows required to train the model properly"]
    for col, allowed in VALID_VALUES.items():
        unknown = sorted(set(df[col].dropna().astype(str).unique()) - set(allowed))
        if unknown:
            return [f"Column '{col}' has unexpected values: {', '.join(unknown[:5])}"]
    for col in NUMERIC_FEATURES + [TARGET_COLUMN]:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        if df[col].isna().any():
            return [f"Column '{col}' contains non-numeric values"]
    return []
