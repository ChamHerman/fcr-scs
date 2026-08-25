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

import generate_datasets as generator
import ml_core as core

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB upload cap

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
    df = generator.generate_unified_valuation_dataset(n_samples=25, random_seed=7, case_prefix="TP")
    buffer = BytesIO()
    df.to_csv(buffer, index=False)
    buffer.seek(0)
    return send_file(buffer, mimetype='text/csv', as_attachment=True, download_name='valuation_dataset_template.csv')


@app.post('/predict')
def predict():
    if _state['model'] is None:
        return _error('No active model available. Train the model first.', 503)

    payload = request.get_json(silent=True) or {}
    errors = core.validate_feature_payload(payload)
    if errors:
        return _error('; '.join(errors), 400)

    features = pd.DataFrame([{
        col: payload[col] if col in core.CATEGORICAL_FEATURES else float(payload[col])
        for col in core.FEATURE_COLUMNS
    }])

    predictions, stds = core.predict_with_range(_state['model'], features)
    market_value = float(predictions[0])
    spread = float(stds[0]) * 1.96

    breakdown = core.derive_compensation(market_value, payload.get('built_up_area_sqft'))
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

    # Optional validation-split fraction (of the uploaded file) as a form field.
    try:
        split_ratio = float(request.form.get('splitRatio', 0.2))
    except (TypeError, ValueError):
        return _error("'splitRatio' must be a number between 0.1 and 0.5", 400)
    if not 0.1 <= split_ratio <= 0.5:
        return _error("'splitRatio' must be between 0.1 and 0.5", 400)

    total_rows = len(df)
    holdout_size = int(total_rows * split_ratio)
    train_size = total_rows - holdout_size
    if holdout_size < 20:
        return _error(
            f"Dataset too small for a {int(split_ratio * 100)}/{int((1 - split_ratio) * 100)} split: "
            f"the validation holdout would only have {holdout_size} rows (need at least 20 - "
            f"upload at least {int(20 / split_ratio) + 1} rows)",
            400,
        )
    if train_size < 80:
        return _error(
            f"Dataset too small: only {train_size} training rows after the split (need at least 80)",
            400,
        )

    # Deterministic split so both models are scored on the identical holdout.
    df_shuffled = df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    holdout = df_shuffled.iloc[:holdout_size]
    train_df = df_shuffled.iloc[holdout_size:]

    X_holdout = holdout[core.FEATURE_COLUMNS]
    y_holdout = holdout[core.TARGET_COLUMN]

    candidate_model = core.build_pipeline()
    candidate_model.fit(train_df[core.FEATURE_COLUMNS], train_df[core.TARGET_COLUMN])
    candidate_metrics = core.evaluate(candidate_model, X_holdout, y_holdout)

    registry = core.read_registry()
    current_metrics = None
    current_version = None
    with model_lock:
        active = registry['activeModel']
        if active and _state['model'] is not None:
            current_metrics = core.evaluate(_state['model'], X_holdout, y_holdout)
            current_version = active['version']
        elif active:
            loaded = core.load_active_model()
            if loaded is not None:
                current_metrics = core.evaluate(loaded, X_holdout, y_holdout)
                current_version = active['version']

        candidate_id = f"cand_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:-3]}"
        candidate_file = f"{candidate_id}.joblib"
        core.save_model(candidate_model, os.path.join(core.MODELS_DIR, candidate_file))

        os.makedirs(core.UPLOADS_DIR, exist_ok=True)
        upload_name = secure_filename(file.filename)
        file.stream.seek(0)
        file.save(os.path.join(core.UPLOADS_DIR, f"{candidate_id}_{upload_name}"))

        registry['candidates'].append({
            'candidateId': candidate_id,
            'file': candidate_file,
            'trainedAt': datetime.now(timezone.utc).isoformat(),
            'metrics': candidate_metrics,
            'datasetRows': int(len(df)),
            'sourceFile': upload_name,
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
            'rows': total_rows,
            'split': {'trainRows': train_size, 'holdoutRows': holdout_size},
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
