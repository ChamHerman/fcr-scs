import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  TrendingUp,
  RotateCcw,
  AlertTriangle,
  Link2,
  X,
  CheckCircle2,
  PencilLine,
  Send,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { useNotification } from '../../components/ui/NotificationSystem';
import { CaseSelectionModal } from '../LandAcquisition/CaseSelectionModal';
import { landAcquisitionApi } from '../../services/landAcquisitionApi';
import {
  VALUATION_OPTIONS,
  valuateProperty,
} from '../../services/predictionApi';
import type { ValuationBreakdown, ValuationInput } from '../../services/predictionApi';

const EMPTY_FORM: Record<keyof ValuationInput, string> = {
  state: '',
  land_category: '',
  location_type: '',
  tenure_type: '',
  building_condition: '',
  land_area_sqft: '',
  built_up_area_sqft: '',
  building_age_years: '',
};

const formatRM = (value: number) => `RM ${Math.round(value).toLocaleString('en-US')}`;

const toOptions = (values: string[], placeholder: string) => [
  { value: '', label: placeholder },
  ...values.map((v) => ({ value: v, label: v.replace(/_/g, ' ') })),
];

export const GenerateAIValuation: React.FC = () => {
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<keyof ValuationInput, string>>({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValuationBreakdown | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Case linkage + submission into the existing Valuation module flow
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideMarketValue, setOverrideMarketValue] = useState('');
  const [overrideCompensation, setOverrideCompensation] = useState('');
  const [overrideRemarks, setOverrideRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);

  const updateField = (field: keyof ValuationInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): string | null => {
    if (!form.state || !form.land_category || !form.location_type || !form.tenure_type || !form.building_condition) {
      return 'Please complete all dropdown selections.';
    }
    const landArea = Number(form.land_area_sqft);
    const builtUp = Number(form.built_up_area_sqft);
    const age = Number(form.building_age_years);
    if (!form.land_area_sqft || Number.isNaN(landArea) || landArea <= 0) {
      return 'Land area must be a number greater than 0.';
    }
    if (form.built_up_area_sqft === '' || Number.isNaN(builtUp) || builtUp < 0) {
      return 'Built-up area must be 0 or more.';
    }
    if (builtUp >= landArea) {
      return 'Built-up area must be smaller than the land area.';
    }
    if (landArea - builtUp < 100) {
      return 'Land area must exceed built-up area by at least 100 sq ft.';
    }
    if (form.building_age_years === '' || Number.isNaN(age) || age < 0 || age > 120) {
      return 'Building age must be between 0 and 120 years.';
    }
    return null;
  };

  const aiRemarks = (breakdown: ValuationBreakdown, adjusted: boolean) => {
    const base =
      `AI-assisted valuation (model ${breakdown.modelVersion ?? 'n/a'}). ` +
      `Predicted market value ${formatRM(breakdown.marketValueMyr)} ` +
      `(likely range ${formatRM(breakdown.estimateRangeLowMyr)} - ${formatRM(breakdown.estimateRangeHighMyr)}); ` +
      `statutory solatium 15% = ${formatRM(breakdown.statutoryDisturbanceMyr)}; ` +
      `relocation allowance = ${formatRM(breakdown.relocationAllowanceMyr)}.`;
    return adjusted ? `${base} Market value manually adjusted by the officer.` : `${base} Accepted by the officer without changes.`;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      notify({ type: 'error', title: 'Invalid input', message: error });
      return;
    }

    setLoading(true);
    setSubmitError(null);
    setOverrideMode(false);
    setSubmittedReportId(null);
    try {
      const breakdown = await valuateProperty({
        state: form.state,
        land_category: form.land_category,
        location_type: form.location_type,
        tenure_type: form.tenure_type,
        building_condition: form.building_condition,
        land_area_sqft: Number(form.land_area_sqft),
        built_up_area_sqft: Number(form.built_up_area_sqft),
        building_age_years: Number(form.building_age_years),
      });
      setResult(breakdown);
      notify({ type: 'success', title: 'Valuation generated' });
    } catch (e: unknown) {
      setSubmitError((e as Error).message);
      notify({ type: 'error', title: 'Valuation failed', message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ ...EMPTY_FORM });
    setResult(null);
    setSubmitError(null);
    setOverrideMode(false);
    setSubmittedReportId(null);
  };

  const startOverride = () => {
    if (!result) return;
    setOverrideMarketValue(String(result.marketValueMyr));
    setOverrideCompensation(String(result.recommendedCompensationMyr));
    setOverrideRemarks(aiRemarks(result, true));
    setOverrideMode(true);
  };

  const submitToValuationFlow = async (adjusted: boolean) => {
    if (!result || !selectedCaseId) return;

    const marketValue = adjusted ? Number(overrideMarketValue) : result.marketValueMyr;
    const compensation = adjusted ? Number(overrideCompensation) : result.recommendedCompensationMyr;
    const remarks = adjusted ? overrideRemarks : aiRemarks(result, false);

    if (adjusted) {
      if (!overrideMarketValue || Number.isNaN(marketValue) || marketValue <= 0) {
        notify({ type: 'error', title: 'Invalid market value', message: 'Market value must be greater than 0.' });
        return;
      }
      if (!overrideCompensation || Number.isNaN(compensation) || compensation <= 0) {
        notify({ type: 'error', title: 'Invalid compensation', message: 'Recommended compensation must be greater than 0.' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await landAcquisitionApi.createValuationReport({
        caseId: selectedCaseId,
        valuationMethod: 'AI Prediction',
        marketValue,
        recommendedCompensation: compensation,
        remarks,
      });
      const reportId: string | undefined = res?.report?.reportId ?? res?.reportId;
      setSubmittedReportId(reportId ?? null);
      setOverrideMode(false);
      notify({
        type: 'success',
        title: 'Valuation submitted',
        message: `Report sent for approval under case ${selectedCaseId}. Track it in the Valuation module.`,
      });
    } catch (e: unknown) {
      notify({ type: 'error', title: 'Submission failed', message: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">Generate AI Valuation</h1>
            <span className="px-2 py-1 rounded-lg bg-md-primary/15 text-md-primary font-bold text-xs whitespace-nowrap">
              Admin console
            </span>
          </div>
          <p className="text-md-on-surface-variant mt-1 max-w-3xl">
            Enter the property attributes and the AI model will estimate the market value and recommended
            compensation. Link an acquisition case to accept the price, adjust it manually, and send it into
            the standard valuation approval flow.
          </p>
        </div>
      </div>

      {/* Case linkage */}
      <Card interactive={false} className="flex flex-wrap items-center gap-3 !p-4">
        <Link2 size={18} className="text-md-primary shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-md-on-surface">Acquisition case</div>
          <div className="text-xs text-md-on-surface-variant mt-0.5">
            {selectedCaseId
              ? <>Report will be submitted under <code className="font-mono font-semibold text-md-primary">{selectedCaseId}</code>.</>
              : 'Optional — required only to submit the valuation for approval.'}
          </div>
        </div>
        {selectedCaseId && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-md-secondary-container text-md-on-secondary-container font-mono text-xs font-bold">
            {selectedCaseId}
            <button
              type="button"
              aria-label="Clear case"
              className="hover:opacity-70"
              onClick={() => { setSelectedCaseId(null); setSubmittedReportId(null); }}
            >
              <X size={13} />
            </button>
          </span>
        )}
        <Button variant="outlined" size="sm" className="ml-auto" onClick={() => setCaseModalOpen(true)}>
          {selectedCaseId ? 'Change Case' : 'Select Case'}
        </Button>
      </Card>

      {/* Attribute form */}
      <Card interactive={false}>
        <h2 className="text-lg font-semibold mb-1">Property Attributes</h2>
        <p className="text-sm text-md-on-surface-variant mb-5">
          The 8 valuation attributes used by the trained model.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="State" options={toOptions(VALUATION_OPTIONS.states, 'Select state')} value={form.state} onChange={(v) => updateField('state', v)} placeholder="Select state" />
          <Select label="Land Category" options={toOptions(VALUATION_OPTIONS.landCategories, 'Select category')} value={form.land_category} onChange={(v) => updateField('land_category', v)} placeholder="Select category" />
          <Select label="Location Type" options={toOptions(VALUATION_OPTIONS.locationTypes, 'Select location type')} value={form.location_type} onChange={(v) => updateField('location_type', v)} placeholder="Select location type" />
          <Select label="Tenure Type" options={toOptions(VALUATION_OPTIONS.tenureTypes, 'Select tenure')} value={form.tenure_type} onChange={(v) => updateField('tenure_type', v)} placeholder="Select tenure" />
          <Select label="Building Condition" options={toOptions(VALUATION_OPTIONS.buildingConditions, 'Select condition')} value={form.building_condition} onChange={(v) => updateField('building_condition', v)} placeholder="Select condition" />
          <Input label="Building Age (years)" type="number" min={0} max={120} placeholder="e.g. 12" value={form.building_age_years} onChange={(e) => updateField('building_age_years', e.target.value)} />
          <Input label="Land Area (sq ft)" type="number" min={1} placeholder="e.g. 2400" value={form.land_area_sqft} onChange={(e) => updateField('land_area_sqft', e.target.value)} />
          <Input label="Built-up Area (sq ft)" type="number" min={0} placeholder="e.g. 1800 (0 for vacant land)" value={form.built_up_area_sqft} onChange={(e) => updateField('built_up_area_sqft', e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outlined" onClick={handleReset} disabled={loading}>
            <RotateCcw size={15} /> Reset
          </Button>
          <Button variant="filled" onClick={handleSubmit} isLoading={loading}>
            <BrainCircuit size={16} /> Generate Valuation
          </Button>
        </div>
      </Card>

      {/* Service error */}
      {submitError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-md-error/10 border border-md-error/20 text-md-error">
          <AlertTriangle size={18} className="shrink-0" />
          <div>
            <div className="text-sm font-semibold">Valuation could not be generated</div>
            <div className="text-xs opacity-80 mt-0.5">{submitError}</div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <Card interactive={false} className="border-l-4 !border-l-md-primary">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Valuation Result</h2>
              <p className="text-sm text-md-on-surface-variant">AI estimate based on the current trained model.</p>
            </div>
            <span className="px-2 py-1 rounded-lg bg-md-primary/15 text-md-primary font-bold text-xs whitespace-nowrap">
              Model {result.modelVersion ?? 'n/a'}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap p-4 rounded-xl bg-md-primary/10 border border-md-primary/20">
            <TrendingUp size={20} className="text-md-primary" />
            <span className="font-semibold text-md-on-surface">Recommended Compensation</span>
            <span className="ml-auto text-2xl font-bold text-md-primary tracking-tight">
              {formatRM(result.recommendedCompensationMyr)}
            </span>
          </div>

          <div className="grid gap-3 mt-4">
            <div className="flex justify-between items-center gap-3 p-3.5 rounded-lg bg-md-surface-container-low">
              <div>
                <div className="text-sm font-semibold text-md-on-surface">Market Value Estimate</div>
                <div className="text-xs text-md-on-surface-variant mt-0.5">
                  Likely range {formatRM(result.estimateRangeLowMyr)} – {formatRM(result.estimateRangeHighMyr)}
                </div>
              </div>
              <div className="font-bold whitespace-nowrap">{formatRM(result.marketValueMyr)}</div>
            </div>
            <div className="flex justify-between items-center gap-3 p-3.5 rounded-lg bg-md-surface-container-low">
              <div>
                <div className="text-sm font-semibold text-md-on-surface">Statutory Solatium</div>
                <div className="text-xs text-md-on-surface-variant mt-0.5">15% disturbance allowance under LAA 1960</div>
              </div>
              <div className="font-bold whitespace-nowrap">{formatRM(result.statutoryDisturbanceMyr)}</div>
            </div>
            <div className="flex justify-between items-center gap-3 p-3.5 rounded-lg bg-md-surface-container-low">
              <div>
                <div className="text-sm font-semibold text-md-on-surface">Relocation Allowance</div>
                <div className="text-xs text-md-on-surface-variant mt-0.5">
                  Fixed allowance{result.relocationAllowanceMyr >= 8000 ? ' (built-up structure present)' : ' (vacant land)'}
                </div>
              </div>
              <div className="font-bold whitespace-nowrap">{formatRM(result.relocationAllowanceMyr)}</div>
            </div>
          </div>

          {submittedReportId ? (
            <div className="flex flex-wrap items-center gap-3 mt-5 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300">
              <CheckCircle2 size={18} className="shrink-0" />
              <span className="text-sm font-medium">
                Valuation report <code className="font-mono font-bold">{submittedReportId}</code> submitted for case{' '}
                {selectedCaseId} and is pending approval in the Valuation module.
              </span>
              <Button
                variant="outlined"
                size="sm"
                className="ml-auto"
                onClick={() => navigate('/admin/case/valuation/review', { state: { reportId: submittedReportId } })}
              >
                Open in Valuation Module
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs text-md-on-surface-variant mt-4">
                This is an AI-generated estimate for reference only. Final compensation is subject to verification
                by a licensed valuer and approval by the relevant authority.
              </p>

              <div className="mt-4 p-4 rounded-xl bg-md-surface-container-low">
                {!selectedCaseId ? (
                  <p className="text-sm text-md-on-surface-variant">
                    Link an acquisition case above to <strong className="text-md-on-surface">accept</strong> this
                    valuation or <strong className="text-md-on-surface">set the price manually</strong> and submit
                    it into the standard approval flow.
                  </p>
                ) : overrideMode ? (
                  <div className="space-y-4">
                    <div className="text-sm font-semibold text-md-on-surface">Manual price adjustment</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Market Value (RM)"
                        type="number"
                        min={1}
                        value={overrideMarketValue}
                        onChange={(e) => setOverrideMarketValue(e.target.value)}
                      />
                      <Input
                        label="Recommended Compensation (RM)"
                        type="number"
                        min={1}
                        value={overrideCompensation}
                        onChange={(e) => setOverrideCompensation(e.target.value)}
                      />
                    </div>
                    <Textarea
                      label="Remarks"
                      className="min-h-[80px]"
                      value={overrideRemarks}
                      onChange={(e) => setOverrideRemarks(e.target.value)}
                    />
                    <div className="flex justify-end gap-3">
                      <Button variant="text" onClick={() => setOverrideMode(false)} disabled={submitting}>Cancel</Button>
                      <Button variant="filled" onClick={() => submitToValuationFlow(true)} isLoading={submitting}>
                        <Send size={15} /> Submit for Approval
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Button variant="filled" onClick={() => submitToValuationFlow(false)} isLoading={submitting}>
                      <CheckCircle2 size={16} /> Accept AI Valuation
                    </Button>
                    <Button variant="tonal" onClick={startOverride} disabled={submitting}>
                      <PencilLine size={15} /> Set Price Manually
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      )}

      <CaseSelectionModal
        isOpen={caseModalOpen}
        onClose={() => setCaseModalOpen(false)}
        onSelectCase={(caseId) => {
          setSelectedCaseId(caseId);
          setSubmittedReportId(null);
          setCaseModalOpen(false);
        }}
        title="Link Case to AI Valuation"
        subtitle="Select the acquisition case this AI valuation should be submitted under. Only cases awaiting valuation are listed."
      />
    </div>
  );
};

export default GenerateAIValuation;
