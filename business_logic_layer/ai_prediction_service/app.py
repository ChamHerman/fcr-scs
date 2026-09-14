"""
FCR-SCS AI Valuation sidecar service (Flask).

Holds the trained valuation model in memory and serves prediction,
retraining-comparison, and model-activation endpoints. The unified Express
backend proxies /api/prediction/* to this service.

Usage: python app.py   (default port 5001, override with AI_SERVICE_PORT)
"""

import os
import threading
from datetime import datetime, timezone
from io import BytesIO

import pandas as pd
from flask import Flask, jsonify, request, send_file
from werkzeug.utils import secure_filename

import ml_core as core

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB upload cap


def _load_local_env():
    """Loads KEY=VALUE pairs into the process environment without overriding
    variables that are already set. Reads, in order of precedence:
      1. this folder's .env (sidecar-specific overrides, optional)
      2. the repository root .env (the shared monorepo configuration that
         server.ts and Vite also use)
    Dependency-free so the sidecar needs no extra packages."""
    sidecar_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.abspath(os.path.join(sidecar_dir, '..', '..'))
    for env_path in [os.path.join(sidecar_dir, '.env'), os.path.join(repo_root, '.env')]:
        if not os.path.exists(env_path):
            continue
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value


_load_local_env()

# Training and activation mutate shared files; serialize them.
model_lock = threading.Lock()

_state = {'model': None, 'version': None}


def _refresh_active_model():
    registry = core.read_registry()
    _state['model'] = core.load_active_model()
    _state['version'] = registry['activeModel']['version'] if registry['activeModel'] else None


def _error(message: str, status: int):
    return jsonify({'success': False, 'error': message}), status


@app.get('/health')
def health():
    return jsonify({'status': 'OK', 'service': 'fcr-scs-ai-valuation', 'modelLoaded': _state['model'] is not None})


@app.get('/model/info')
def model_info():
    registry = core.read_registry()
    if not registry['activeModel']:
        return _error('No active model found. Run train_model.py first.', 404)
    info = {**registry['activeModel'], 'pendingCandidates': len(registry['candidates'])}
    return jsonify({'success': True, 'data': info})


@app.get('/dataset/template')
def dataset_template():
    """Serves the dataset the current model was trained on, so officers can
    download it, tweak values, and re-upload to compare a retrained model."""
    if not os.path.exists(core.current_training_dataset_path()):
        return _error('No current training dataset is available yet. Train the baseline model first.', 404)
    return send_file(
        core.current_training_dataset_path(),
        mimetype='text/csv',
        as_attachment=True,
        download_name='fcr_scs_valuation_current_dataset.csv',
    )


@app.post('/predict')
def predict():
    if _state['model'] is None:
        return _error('No active model available. Train the model first.', 503)

    payload = request.get_json(silent=True) or {}
    cleaned, errors = core.normalise_payload(payload)
    if errors:
        return _error('; '.join(errors), 400)

    features = pd.DataFrame([cleaned])

    predictions, stds = core.predict_with_range(_state['model'], features)
    market_value = float(predictions[0])
    spread = float(stds[0]) * 1.96

    breakdown = core.derive_compensation(
        market_value,
        cleaned.get('land_category'),
        cleaned.get('acquisition_area_m2'),
    )
    breakdown['estimateRangeLowMyr'] = max(0, int(round((market_value - spread) / 100) * 100))
    breakdown['estimateRangeHighMyr'] = int(round((market_value + spread) / 100) * 100)
    breakdown['modelVersion'] = _state['version']

    return jsonify({'success': True, 'data': breakdown})


@app.post('/train')
def train():
    file = request.files.get('dataset')
    if file is None or not file.filename:
        return _error("Multipart field 'dataset' with a .csv file is required", 400)
    if not file.filename.lower().endswith('.csv'):
        return _error('Only .csv datasets are accepted', 400)

    try:
        df = pd.read_csv(file.stream)
    except Exception:
        return _error('Could not parse the uploaded file as CSV', 400)

    errors = core.validate_dataset_dataframe(df)
    if errors:
        return _error(' '.join(errors), 400)

    if not os.path.exists(core.TEST_DATASET_PATH):
        return _error('Evaluation dataset is missing - run generate_datasets.py first.', 500)

    # The candidate trains on the FULL uploaded dataset (no split). Both the
    # current model and the candidate are scored on the same fixed independent
    # evaluation set, so the old-vs-new comparison is fair and reproducible.
    df_test = pd.read_csv(core.TEST_DATASET_PATH)
    X_test = df_test[core.FEATURE_COLUMNS]
    y_test = df_test[core.TARGET_COLUMN]

    candidate_model = core.build_pipeline()
    candidate_model.fit(df[core.FEATURE_COLUMNS], df[core.TARGET_COLUMN])
    candidate_metrics = core.evaluate(candidate_model, X_test, y_test)

    registry = core.read_registry()
    current_metrics = None
    current_version = None
    with model_lock:
        active = registry['activeModel']
        if active:
            loaded = _state['model'] if _state['model'] is not None else core.load_active_model()
            if loaded is not None:
                current_metrics = core.evaluate(loaded, X_test, y_test)
                current_version = active['version']

        candidate_id = f"cand_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:-3]}"
        candidate_file = f"{candidate_id}.joblib"
        core.save_model(candidate_model, os.path.join(core.MODELS_DIR, candidate_file))

        os.makedirs(core.UPLOADS_DIR, exist_ok=True)
        source_name = f"{candidate_id}_{secure_filename(file.filename)}"
        file.stream.seek(0)
        file.save(os.path.join(core.UPLOADS_DIR, source_name))

        registry['candidates'].append({
            'candidateId': candidate_id,
            'file': candidate_file,
            'trainedAt': datetime.now(timezone.utc).isoformat(),
            'metrics': candidate_metrics,
            'datasetRows': int(len(df)),
            'sourceFile': source_name,
        })
        core.write_registry(registry)

    verdict = 'equal'
    if current_metrics is not None:
        delta = candidate_metrics['r2'] - current_metrics['r2']
        verdict = 'better' if delta > 0.001 else ('worse' if delta < -0.001 else 'equal')

    return jsonify({
        'success': True,
        'data': {
            'candidateId': candidate_id,
            'verdict': verdict,
            'rows': int(len(df)),
            'evaluatedOn': {'testRows': int(len(df_test))},
            'current': ({'version': current_version, 'metrics': current_metrics} if current_metrics else None),
            'candidate': {'candidateId': candidate_id, 'metrics': candidate_metrics},
        },
    })


@app.post('/model/activate')
def activate():
    payload = request.get_json(silent=True) or {}
    candidate_id = payload.get('candidateId')
    if not candidate_id:
        return _error("'candidateId' is required", 400)
    try:
        with model_lock:
            registry = core.activate_candidate(candidate_id)
    except KeyError:
        return _error(f'Candidate {candidate_id} not found', 404)
    _refresh_active_model()
    return jsonify({'success': True, 'data': registry['activeModel']})


@app.post('/model/discard')
def discard():
    payload = request.get_json(silent=True) or {}
    candidate_id = payload.get('candidateId')
    if not candidate_id:
        return _error("'candidateId' is required", 400)
    try:
        with model_lock:
            core.discard_candidate(candidate_id)
    except KeyError:
        return _error(f'Candidate {candidate_id} not found', 404)
    registry = core.read_registry()
    return jsonify({'success': True, 'data': {'discarded': candidate_id, 'pendingCandidates': len(registry['candidates'])}})


if __name__ == '__main__':
    _refresh_active_model()
    if _state['model'] is None:
        print("[WARN] No active model found - run train_model.py to create the baseline before predicting.")
    else:
        print(f"[INFO] Active valuation model loaded (version {_state['version']}).")
    port = int(os.environ.get('AI_SERVICE_PORT', 5001))
    app.run(host='127.0.0.1', port=port, debug=False)
