import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Database, Cpu, Download, UploadCloud, CheckCircle2, XCircle, MinusCircle, TrendingUp, AlertTriangle, X } from 'lucide-react';
import '../../style.css';
import './predictionDashboard.css';
import { useNotification } from '../../components/ui/NotificationSystem';
import {
  activateModel,
  discardCandidate,
  downloadTemplateFile,
  getModelInfo,
  retrainModel,
} from '../../services/predictionApi';
import type { ModelInfo, RetrainComparison } from '../../services/predictionApi';

const formatRM = (value: number) => `RM ${Math.round(value).toLocaleString('en-US')}`;
const formatAccuracy = (r2: number) => `${(r2 * 100).toFixed(2)}%`;
const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const REQUIRED_COLUMNS = [
  'state',
  'land_category',
  'location_type',
  'tenure_type',
  'land_area_sqft',
  'built_up_area_sqft',
  'building_age_years',
  'building_condition',
  'market_value_myr',
];

export const RetrainAIModel: React.FC = () => {
  const { notify } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [dataset, setDataset] = useState<File | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [rowWarning, setRowWarning] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.2);
  const [training, setTraining] = useState(false);
  const [comparison, setComparison] = useState<RetrainComparison | null>(null);
  const [acting, setActing] = useState(false);

  const loadModelInfo = useCallback(async () => {
    try {
      setModelInfo(await getModelInfo());
      setServiceError(null);
    } catch (e: unknown) {
      setServiceError((e as Error).message);
      notify({ type: 'error', title: 'Could not load model info', message: (e as Error).message });
    }
  }, [notify]);

  useEffect(() => {
    loadModelInfo();
  }, [loadModelInfo]);

  const clearDataset = () => {
    setDataset(null);
    setRowCount(null);
    setRowWarning(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Counts data rows locally so the officer gets immediate feedback on the
  // selected file before spending time on an upload that would be rejected.
  const inspectDataset = (file: File) => {
    setRowCount(null);
    setRowWarning(false);
    file.text().then((text) => {
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
      const rows = Math.max(0, lines - 1);
      setRowCount(rows);
      setRowWarning(rows < 2000);
    }).catch(() => {
      // row count is informational only — the backend validates the real file
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && !file.name.toLowerCase().endsWith('.csv')) {
      notify({ type: 'error', title: 'Invalid file', message: 'Only .csv datasets are accepted.' });
      return;
    }
    setDataset(file);
    setComparison(null);
    if (file) {
      inspectDataset(file);
    } else {
      clearDataset();
    }
  };

  const handleTemplateDownload = async () => {
    try {
      await downloadTemplateFile();
    } catch (e: unknown) {
      notify({ type: 'error', title: 'Could not download template', message: (e as Error).message });
    }
  };

  const handleTrain = async () => {
    if (!dataset) return;
    setTraining(true);
    try {
      const result = await retrainModel(dataset, splitRatio);
      setComparison(result);
      notify({
        type: result.verdict === 'worse' ? 'error' : 'success',
        title: `Training complete — new model is ${result.verdict.toUpperCase()}`,
        message: `Evaluated on ${result.rows} rows from the uploaded dataset.`,
      });
    } catch (e: unknown) {
      notify({ type: 'error', title: 'Retraining failed', message: (e as Error).message });
    } finally {
      setTraining(false);
    }
  };

  const handleReplace = async () => {
    if (!comparison) return;
    if (!window.confirm('Replace the current production model with the newly trained model?')) return;
    setActing(true);
    try {
      const updated = await activateModel(comparison.candidateId);
      setModelInfo(updated);
      setComparison(null);
      clearDataset();
      notify({ type: 'success', title: `Model replaced — now running version ${updated.version}` });
    } catch (e: unknown) {
      notify({ type: 'error', title: 'Activation failed', message: (e as Error).message });
    } finally {
      setActing(false);
    }
  };

  const handleDiscard = async () => {
    if (!comparison) return;
    setActing(true);
    try {
      await discardCandidate(comparison.candidateId);
      setComparison(null);
      clearDataset();
      notify({ type: 'general', title: 'Candidate discarded — current model unchanged' });
    } catch (e: unknown) {
      notify({ type: 'error', title: 'Discard failed', message: (e as Error).message });
    } finally {
      setActing(false);
    }
  };

const VERDICT_META = {
  better: { icon: <CheckCircle2 size={18} />, className: 'pd-verdict-better', text: 'The new dataset model performs BETTER than the current model.' },
  worse: { icon: <XCircle size={18} />, className: 'pd-verdict-worse', text: 'The new dataset model performs WORSE than the current model.' },
  equal: { icon: <MinusCircle size={18} />, className: 'pd-verdict-equal', text: 'The new dataset model performs about the same as the current model.' },
} as const;

  return (
    <div className="pd-page">
      <div className="pd-shell">
        <div className="pd-header">
          <div>
            <h1 className="pd-title">Retrain Model</h1>
            <p className="pd-subtitle">Upload a new valuation dataset, compare it against the live model, and decide whether to replace it.</p>
          </div>
          <span className="pd-badge">Admin console</span>
        </div>

        {serviceError && (
          <div className="pd-error-banner">
            <AlertTriangle size={18} />
            <div>
              <div className="pd-breakdown-label">AI valuation service is offline</div>
              <div className="pd-breakdown-sub">{serviceError}</div>
            </div>
            <button className="pd-btn-secondary" style={{ marginLeft: 'auto', padding: '8px 14px' }} onClick={loadModelInfo}>
              Retry
            </button>
          </div>
        )}

        <div className="pd-grid-four">
          <div className="pd-metric-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563eb' }}>
              <Cpu size={16} />
              <span className="pd-metric-title">Model Version</span>
            </div>
            <div className="pd-metric-value" style={{ marginTop: 8 }}>{modelInfo?.version ?? '—'}</div>
          </div>
          <div className="pd-metric-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563eb' }}>
              <TrendingUp size={16} />
              <span className="pd-metric-title">Accuracy (R²)</span>
            </div>
            <div className="pd-metric-value" style={{ marginTop: 8 }}>{modelInfo ? formatAccuracy(modelInfo.metrics.r2) : '—'}</div>
          </div>
          <div className="pd-metric-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563eb' }}>
              <Activity size={16} />
              <span className="pd-metric-title">Mean Abs. Error</span>
            </div>
            <div className="pd-metric-value" style={{ marginTop: 8 }}>{modelInfo ? formatRM(modelInfo.metrics.mae) : '—'}</div>
          </div>
          <div className="pd-metric-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563eb' }}>
              <Database size={16} />
              <span className="pd-metric-title">Training Samples</span>
            </div>
            <div className="pd-metric-value" style={{ marginTop: 8 }}>{modelInfo ? modelInfo.datasetRows.toLocaleString('en-US') : '—'}</div>
          </div>
        </div>

        <div className="pd-compare-card" style={{ marginTop: 16 }}>
          <div className="pd-label" style={{ marginBottom: 12 }}>Upload new dataset (.csv)</div>

          <div className="pd-upload-grid">
            <div
              className={`pd-upload-zone ${dataset ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              aria-label={dataset ? 'Replace selected CSV file' : 'Choose CSV file'}
            >
              <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleFileChange} />
              {dataset ? (
                <>
                  <CheckCircle2 size={24} className="pd-upload-zone-icon" />
                  <div className="pd-upload-zone-title">{dataset.name}</div>
                  <div className="pd-upload-zone-sub">
                    {formatBytes(dataset.size)}
                    {rowCount !== null ? ` · ≈ ${rowCount.toLocaleString('en-US')} data rows` : ' · checking rows…'}
                  </div>
                  <div className="pd-upload-zone-hint">File ready — click to replace</div>
                  <button
                    type="button"
                    className="pd-zone-remove"
                    aria-label="Remove file"
                    onClick={(e) => { e.stopPropagation(); clearDataset(); }}
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <UploadCloud size={26} className="pd-upload-zone-icon" />
                  <div className="pd-upload-zone-title">Choose CSV file</div>
                  <div className="pd-upload-zone-sub">Click to browse your computer</div>
                </>
              )}
            </div>

            <div className="pd-req-panel">
              <div className="pd-label">Dataset requirements</div>
              <ul className="pd-req-list">
                <li>
                  <CheckCircle2 size={14} />
                  <span>
                    Columns: {REQUIRED_COLUMNS.map((c) => <code className="pd-code-chip" key={c}>{c}</code>)}
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={14} />
                  <span>At least <strong>2,000 data rows</strong> to train the model properly</span>
                </li>
                <li>
                  <CheckCircle2 size={14} />
                  <span>Split automatically — the new model trains on one part and both models are scored on the same validation holdout</span>
                </li>
              </ul>
              <button className="pd-btn-secondary" onClick={handleTemplateDownload}>
                <Download size={15} /> Download template (format sample only)
              </button>
              <div className="pd-subtitle" style={{ marginTop: 10 }}>
                Pick any CSV from your computer in the template format. The backend saves its own copy
                into <code>datasets/uploads/</code> automatically.
              </div>
            </div>
          </div>

          {dataset && rowWarning && (
            <div className="pd-row-warning">
              <AlertTriangle size={15} />
              This file has only ≈ {rowCount?.toLocaleString('en-US')} data rows — at least 2,000 are required. Please choose a larger dataset.
            </div>
          )}

          <div className="pd-cta-row" style={{ alignItems: 'center' }}>
            <label className="pd-label" htmlFor="pd-split" style={{ marginRight: 8 }}>
              Validation split
              <select id="pd-split" className="pd-select" style={{ marginLeft: 8, width: 150 }} value={splitRatio} onChange={(e) => setSplitRatio(Number(e.target.value))}>
                <option value={0.1}>10% holdout</option>
                <option value={0.2}>20% holdout</option>
                <option value={0.3}>30% holdout</option>
              </select>
            </label>
            <button className="pd-btn-primary" onClick={handleTrain} disabled={!dataset || training || rowWarning}>
              {training ? 'Training… this may take up to a minute' : 'Train with New Dataset'}
            </button>
          </div>
        </div>

        {comparison && (
          <>
            <div className={`pd-verdict-banner ${VERDICT_META[comparison.verdict].className}`}>
              {VERDICT_META[comparison.verdict].icon}
              <span>{VERDICT_META[comparison.verdict].text}</span>
            </div>

            <div className="pd-card" style={{ padding: 24, marginTop: 16 }}>
              <h2 className="pd-title" style={{ fontSize: 18 }}>Performance Comparison</h2>
              <p className="pd-subtitle" style={{ marginBottom: 12 }}>
                The new model was trained on {comparison.split.trainRows.toLocaleString('en-US')} rows; both models
                scored on the same {comparison.split.holdoutRows.toLocaleString('en-US')}-row validation holdout
                ({Math.round((comparison.split.holdoutRows / comparison.rows) * 100)}% of your upload).
              </p>
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Current Model{comparison.current ? ` (${comparison.current.version})` : ''}</th>
                    <th>New Dataset Model</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Mean Absolute Error (lower is better)</td>
                    <td>{comparison.current ? formatRM(comparison.current.metrics.mae) : '—'}</td>
                    <td>{formatRM(comparison.candidate.metrics.mae)}</td>
                  </tr>
                  <tr>
                    <td>Root Mean Squared Error (lower is better)</td>
                    <td>{comparison.current ? formatRM(comparison.current.metrics.rmse) : '—'}</td>
                    <td>{formatRM(comparison.candidate.metrics.rmse)}</td>
                  </tr>
                  <tr>
                    <td>Accuracy / R² (higher is better)</td>
                    <td>{comparison.current ? formatAccuracy(comparison.current.metrics.r2) : '—'}</td>
                    <td>{formatAccuracy(comparison.candidate.metrics.r2)}</td>
                  </tr>
                  <tr>
                    <td>Training rows</td>
                    <td>{modelInfo?.datasetRows.toLocaleString('en-US') ?? '—'}</td>
                    <td>{comparison.rows.toLocaleString('en-US')}</td>
                  </tr>
                </tbody>
              </table>

              <div className="pd-cta-row">
                <button className="pd-btn-secondary" onClick={handleDiscard} disabled={acting}>Discard New Dataset</button>
                <button className="pd-btn-primary" onClick={handleReplace} disabled={acting}>
                  {acting ? 'Working…' : comparison.current ? 'Replace Current Model' : 'Activate as Production Model'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RetrainAIModel;
