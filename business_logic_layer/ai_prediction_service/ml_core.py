"""
Shared ML logic for the FCR-SCS AI Valuation service.

Used by train_model.py (baseline CLI) and app.py (Flask sidecar):
feature definitions, pipeline construction, evaluation, model persistence,
and the JSON registry that tracks the active model / retraining candidates.

Attribute vocabulary is aligned with the manual Valuation module
(presentation_layer/src/constants): 7 features, title land categories,
m2 areas, no building condition. A tolerant value normaliser accepts DB-enum
spellings and older aliases so callers that predate the alignment keep working.
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

CATEGORICAL_FEATURES = ['state', 'land_category', 'location_type', 'tenure_type']
NUMERIC_FEATURES = ['land_area_m2', 'built_up_area_m2', 'building_age_years']
FEATURE_COLUMNS = CATEGORICAL_FEATURES + NUMERIC_FEATURES
TARGET_COLUMN = 'market_value_myr'

# Canonical allowed values (mirrors the shared frontend constants).
VALID_VALUES = {
    'state': [
        'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak',
        'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
        'Wilayah Persekutuan Kuala Lumpur', 'Wilayah Persekutuan Labuan',
        'Wilayah Persekutuan Putrajaya',
    ],
    'land_category': ['Agriculture', 'Building', 'Industry'],
    'location_type': ['Urban', 'Suburban', 'Rural'],
    'tenure_type': ['Freehold', 'Leasehold', 'Malay Reserve'],
}

# Legacy / DB-enum spellings -> canonical values, so uploads and manual-form
# calls that pre-date the vocabulary alignment still work.
_VALUE_ALIASES = {
    'land_category': {
        'agriculture': 'Agriculture', 'agricultural': 'Agriculture',
        'building': 'Building', 'residential': 'Building', 'commercial': 'Building',
        'industry': 'Industry', 'industrial': 'Industry',
    },
    'tenure_type': {
        'freehold': 'Freehold',
        'leasehold': 'Leasehold', 'leasehold_99': 'Leasehold', 'leasehold99': 'Leasehold',
        'malay_reserve': 'Malay Reserve', 'malayreserve': 'Malay Reserve',
    },
    'location_type': {
        'urban': 'Urban', 'suburban': 'Suburban',
        'rural': 'Rural', 'rural_coastal': 'Rural', 'ruralcoastal': 'Rural',
    },
    'state': {
        'penang': 'Pulau Pinang', 'pulau pinang': 'Pulau Pinang',
        'kuala lumpur': 'Wilayah Persekutuan Kuala Lumpur',
        'w.p. kuala lumpur': 'Wilayah Persekutuan Kuala Lumpur',
        'wpkl': 'Wilayah Persekutuan Kuala Lumpur',
        'wilayah persekutuan kuala lumpur': 'Wilayah Persekutuan Kuala Lumpur',
        'putrajaya': 'Wilayah Persekutuan Putrajaya',
        'w.p. putrajaya': 'Wilayah Persekutuan Putrajaya',
        'labuan': 'Wilayah Persekutuan Labuan',
        'w.p. labuan': 'Wilayah Persekutuan Labuan',
    },
}

# Old numeric payload key names accepted as aliases for the m2 features.
_NUMERIC_ALIASES = {
    'land_area_m2': ['land_area_sqft'],
    'built_up_area_m2': ['built_up_area_sqft'],
}


def normalize_value(column: str, raw) -> str | None:
    """Returns the canonical value for a categorical column, or None if invalid."""
    if raw is None:
        return None
    value = str(raw).strip()
    lowered = value.lower()
    for canonical in VALID_VALUES[column]:
        if canonical.lower() == lowered:
            return canonical
    alias = _VALUE_ALIASES.get(column, {}).get(lowered)
    if alias is not None and alias in VALID_VALUES[column]:
        return alias
    return None


def numeric_payload_value(payload: dict, column: str):
    """Reads a numeric feature allowing its legacy alias keys (sqft names)."""
    for key in [column] + _NUMERIC_ALIASES.get(column, []):
        if key in payload and payload[key] is not None and str(payload[key]).strip() != '':
            return payload[key]
    return None


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

def derive_compensation(market_value_myr: float, built_up_area_value) -> dict:
    statutory_disturbance = int(round((market_value_myr * 0.15) / 100) * 100)
    relocation_allowance = 8000 if built_up_area_value and built_up_area_value > 0 else 2000
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


def current_training_dataset_path() -> str:
    """Path to the dataset the active model was trained on, if its source upload
    is still present; otherwise the canonical training CSV (baseline)."""
    registry = read_registry()
    source_file = registry['activeModel'].get('sourceFile') if registry['activeModel'] else None
    if source_file:
        upload = os.path.join(UPLOADS_DIR, source_file)
        if os.path.exists(upload):
            return upload
    return TRAIN_DATASET_PATH


def normalise_payload(payload: dict) -> tuple:
    """Validates and normalises a single prediction payload.

    Returns (cleaned_payload, errors). Categorical values are canonicalised;
    numeric aliases (e.g. legacy sqft keys) are folded onto the m2 key.
    """
    errors = []
    cleaned = {}
    for col in CATEGORICAL_FEATURES:
        canonical = normalize_value(col, payload.get(col))
        if canonical is None:
            errors.append(f"'{col}' must be one of: {', '.join(VALID_VALUES[col])}")
        else:
            cleaned[col] = canonical

    for col in NUMERIC_FEATURES:
        raw = numeric_payload_value(payload, col)
        if raw is None:
            errors.append(f"'{col}' is required")
            continue
        try:
            value = float(raw)
        except (TypeError, ValueError):
            errors.append(f"'{col}' must be a number")
            continue
        if value < 0:
            errors.append(f"'{col}' cannot be negative")
        elif col == 'land_area_m2' and value == 0:
            errors.append("'land_area_m2' must be greater than 0")
        else:
            cleaned[col] = value
    if not errors and cleaned.get('building_age_years', 0) > 120:
        errors.append("'building_age_years' must be 120 or below")
    return cleaned, errors


def validate_dataset_dataframe(df: pd.DataFrame) -> list:
    """Validates an uploaded retraining dataset; returns a list of error strings."""
    required = FEATURE_COLUMNS + [TARGET_COLUMN]
    missing = [c for c in required if c not in df.columns]
    if missing:
        return [f"Missing required columns: {', '.join(missing)}"]
    if len(df) < 2000:
        return [f"Dataset too small: {len(df)} rows found, at least 2,000 rows required to train the model properly"]
    for col in CATEGORICAL_FEATURES:
        df[col] = df[col].astype(str).str.strip()
        unmapped = [v for v in df[col].unique() if normalize_value(col, v) is None]
        if unmapped:
            return [f"Column '{col}' has unexpected values: {', '.join(unmapped[:5])}"]
        # Rewrite aliases onto canonical values in place for training.
        df[col] = df[col].map(lambda v: normalize_value(col, v))
    for col in NUMERIC_FEATURES + [TARGET_COLUMN]:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        if df[col].isna().any():
            return [f"Column '{col}' contains non-numeric values"]
    return []
