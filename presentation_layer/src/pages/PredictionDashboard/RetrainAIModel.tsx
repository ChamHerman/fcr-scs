import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  Database,
  Cpu,
  Download,
  UploadCloud,
  CheckCircle2,
  XCircle,
  MinusCircle,
  TrendingUp,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
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

const VERDICT_META = {
  better: { icon: <CheckCircle2 size={18} />, classes: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300', text: 'The new dataset model performs BETTER than the current model.' },
  worse: { icon: <XCircle size={18} />, classes: 'bg-md-error/10 border-md-error/20 text-md-error', text: 'The new dataset model performs WORSE than the current model.' },
  equal: { icon: <MinusCircle size={18} />, classes: 'bg-md-surface-container-low border-md-outline/30 text-md-on-surface-variant', text: 'The new dataset model performs about the same as the current model.' },
} as const;

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => (
  <div className="bg-md-surface-container rounded-xl p-5 shadow-sm transition-all duration-300 ease-md-bouncy hover:shadow-md hover:scale-[1.01]">
    <div className="flex items-center gap-2 text-[13px] font-medium text-md-on-surface-variant tracking-wide">
      {icon}
      {label}
    </div>
    <div className="text-2xl font-bold mt-1.5 tracking-tight truncate">{value}</div>
  </div>
);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">Retrain Model</h1>
            <span className="px-2 py-1 rounded-lg bg-md-primary/15 text-md-primary font-bold text-xs whitespace-nowrap">
              Admin console
            </span>
          </div>
          <p className="text-md-on-surface-variant mt-1 max-w-3xl">
            Upload a new valuation dataset, compare it against the live model, and decide whether to replace it.
          </p>
        </div>
      </div>

      {/* Service offline banner */}
      {serviceError && (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-md-error/10 border border-md-error/20 text-md-error">
          <AlertTriangle size={18} className="shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold">AI valuation service is offline</div>
            <div className="text-xs opacity-80 mt-0.5 break-words">{serviceError}</div>
          </div>
          <Button variant="outlined" size="sm" className="ml-auto shrink-0" onClick={loadModelInfo}>
            Retry
          </Button>
        </div>
      )}

      {/* Current model metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<Cpu size={16} className="text-md-primary" />} label="Model Version" value={modelInfo?.version ?? '—'} />
        <StatCard icon={<TrendingUp size={16} className="text-md-primary" />} label="Accuracy (R²)" value={modelInfo ? formatAccuracy(modelInfo.metrics.r2) : '—'} />
        <StatCard icon={<Activity size={16} className="text-md-primary" />} label="Mean Abs. Error" value={modelInfo ? formatRM(modelInfo.metrics.mae) : '—'} />
        <StatCard icon={<Database size={16} className="text-md-primary" />} label="Training Samples" value={modelInfo ? modelInfo.datasetRows.toLocaleString('en-US') : '—'} />
      </div>

      {/* Upload dataset */}
      <Card interactive={false}>
        <h2 className="text-lg font-semibold mb-4">Upload new dataset (.csv)</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Dropzone */}
          <div
            role="button"
            aria-label={dataset ? 'Replace selected CSV file' : 'Choose CSV file'}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-xl p-6 text-center cursor-pointer border-2 border-dashed transition-colors duration-200 ${
              dataset
                ? 'border-green-500/60 bg-green-50 dark:bg-green-900/20 border-solid'
                : 'border-md-outline/40 bg-md-surface-container-low hover:border-md-primary'
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleFileChange} />
            {dataset ? (
              <>
                <CheckCircle2 size={24} className="mx-auto text-green-600 dark:text-green-400 mb-2" />
                <div className="font-semibold text-md-on-surface break-all">{dataset.name}</div>
                <div className="text-xs text-md-on-surface-variant mt-1">
                  {formatBytes(dataset.size)}
                  {rowCount !== null ? ` · ≈ ${rowCount.toLocaleString('en-US')} data rows` : ' · checking rows…'}
                </div>
                <div className="text-xs font-semibold text-md-primary mt-2">File ready — click to replace</div>
                <button
                  type="button"
                  aria-label="Remove file"
                  className="absolute top-2 right-2 w-6 h-6 grid place-items-center rounded-full bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700/60"
                  onClick={(e) => { e.stopPropagation(); clearDataset(); }}
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <UploadCloud size={26} className="mx-auto text-md-primary mb-2" />
                <div className="font-semibold text-md-on-surface">Choose CSV file</div>
                <div className="text-xs text-md-on-surface-variant mt-1">Click to browse your computer</div>
              </>
            )}
          </div>

          {/* Requirements */}
          <div className="rounded-xl bg-md-surface-container-low p-4">
            <div className="text-sm font-semibold text-md-on-surface">Dataset requirements</div>
            <ul className="list-none m-0 mt-3 mb-4 p-0 grid gap-2.5 text-[13px] text-md-on-surface">
              <li className="flex gap-2 items-start">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                <span>
                  Columns: {REQUIRED_COLUMNS.map((c) => (
                    <code key={c} className="inline-block bg-md-secondary-container text-md-on-secondary-container rounded-md px-1.5 py-0.5 mr-1 mb-1 text-[11px] font-mono">{c}</code>
                  ))}
                </span>
              </li>
              <li className="flex gap-2 items-start">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                <span>At least <strong>2,000 data rows</strong> to train the model properly</span>
              </li>
              <li className="flex gap-2 items-start">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                <span>Split automatically — the new model trains on one part and both models are scored on the same validation holdout</span>
              </li>
            </ul>
            <Button variant="outlined" size="sm" onClick={handleTemplateDownload}>
              <Download size={15} /> Download template (format sample only)
            </Button>
            <p className="text-xs text-md-on-surface-variant mt-3">
              Pick any CSV from your computer in the template format. The backend saves its own copy into{' '}
              <code className="font-mono">datasets/uploads/</code> automatically.
            </p>
          </div>
        </div>

        {dataset && rowWarning && (
          <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[13px] font-medium">
            <AlertTriangle size={15} className="shrink-0" />
            This file has only ≈ {rowCount?.toLocaleString('en-US')} data rows — at least 2,000 are required. Please choose a larger dataset.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-4 mt-6">
          <div className="w-44">
            <Select
              label="Validation split"
              value={String(splitRatio)}
              onChange={(v) => setSplitRatio(Number(v))}
              options={[
                { value: '0.1', label: '10% holdout' },
                { value: '0.2', label: '20% holdout' },
                { value: '0.3', label: '30% holdout' },
              ]}
            />
          </div>
          <Button variant="filled" onClick={handleTrain} disabled={!dataset || training || rowWarning} isLoading={training}>
            <UploadCloud size={16} /> Train with New Dataset
          </Button>
        </div>
      </Card>

      {/* Comparison */}
      {comparison && (
        <>
          <div className={`flex items-center gap-3 p-4 rounded-xl border font-semibold ${VERDICT_META[comparison.verdict].classes}`}>
            {VERDICT_META[comparison.verdict].icon}
            <span>{VERDICT_META[comparison.verdict].text}</span>
          </div>

          <Card interactive={false}>
            <h2 className="text-lg font-semibold">Performance Comparison</h2>
            <p className="text-sm text-md-on-surface-variant mt-1 mb-4">
              The new model was trained on {comparison.split.trainRows.toLocaleString('en-US')} rows; both models
              scored on the same {comparison.split.holdoutRows.toLocaleString('en-US')}-row validation holdout
              ({Math.round((comparison.split.holdoutRows / comparison.rows) * 100)}% of your upload).
            </p>
            <div className="overflow-x-auto md-scroll-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-md-on-surface-variant">
                    <th className="py-2.5 pr-4 font-semibold">Metric</th>
                    <th className="py-2.5 pr-4 font-semibold">Current Model{comparison.current ? ` (${comparison.current.version})` : ''}</th>
                    <th className="py-2.5 font-semibold">New Dataset Model</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Mean Absolute Error (lower is better)', render: formatRM, key: 'mae' as const },
                    { label: 'Root Mean Squared Error (lower is better)', render: formatRM, key: 'rmse' as const },
                    { label: 'Accuracy / R² (higher is better)', render: formatAccuracy, key: 'r2' as const },
                  ].map((row) => (
                    <tr key={row.key} className="border-t border-md-outline/20">
                      <td className="py-3 pr-4 text-md-on-surface">{row.label}</td>
                      <td className="py-3 pr-4">{comparison.current ? row.render(comparison.current.metrics[row.key]) : '—'}</td>
                      <td className="py-3 font-semibold">{row.render(comparison.candidate.metrics[row.key])}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-md-outline/20">
                    <td className="py-3 pr-4 text-md-on-surface">Training rows</td>
                    <td className="py-3 pr-4">{modelInfo?.datasetRows.toLocaleString('en-US') ?? '—'}</td>
                    <td className="py-3 font-semibold">{comparison.rows.toLocaleString('en-US')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="danger" onClick={handleDiscard} disabled={acting}>Discard New Dataset</Button>
              <Button variant="filled" onClick={handleReplace} disabled={acting} isLoading={acting && !!comparison.current}>
                {comparison.current ? 'Replace Current Model' : 'Activate as Production Model'}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default RetrainAIModel;
