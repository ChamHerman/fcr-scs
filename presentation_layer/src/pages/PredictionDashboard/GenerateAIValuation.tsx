import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, TrendingUp, RotateCcw, AlertTriangle, Link2, X, CheckCircle2, PencilLine, Send } from 'lucide-react';
import '../../style.css';
import './predictionDashboard.css';
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
    <div className="pd-page">
      <div className="pd-shell">
        <div className="pd-header">
          <div>
            <h1 className="pd-title">Generate AI Valuation</h1>
            <p className="pd-subtitle">
              Enter the property attributes and the AI model will estimate the market value and
              recommended compensation. Link an acquisition case to accept the price, adjust it
              manually, and send it into the standard valuation approval flow.
            </p>
          </div>
          <span className="pd-badge">Admin console</span>
        </div>

        <div className="pd-card pd-case-link-bar">
          <Link2 size={16} />
          <div>
            <div className="pd-breakdown-label">Acquisition case</div>
            {selectedCaseId ? (
              <div className="pd-subtitle">Report will be submitted under <code>{selectedCaseId}</code>.</div>
            ) : (
              <div className="pd-subtitle">Optional — required only to submit the valuation for approval.</div>
            )}
          </div>
          {selectedCaseId && (
            <span className="pd-case-chip">
              {selectedCaseId}
              <button type="button" aria-label="Clear case" onClick={() => { setSelectedCaseId(null); setSubmittedReportId(null); }}>
                <X size={13} />
              </button>
            </span>
          )}
          <button className="pd-btn-secondary" style={{ marginLeft: 'auto', padding: '8px 14px' }} onClick={() => setCaseModalOpen(true)}>
            {selectedCaseId ? 'Change Case' : 'Select Case'}
          </button>
        </div>

        <div className="pd-card" style={{ padding: 24 }}>
          <div className="pd-form-grid" style={{ marginTop: 0 }}>
            <div className="pd-grid-two">
              <div>
                <label className="pd-label" htmlFor="pd-state">State</label>
                <select id="pd-state" className="pd-select" style={{ marginTop: 6 }} value={form.state} onChange={(e) => updateField('state', e.target.value)}>
                  <option value="">Select state</option>
                  {VALUATION_OPTIONS.states.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="pd-label" htmlFor="pd-category">Land Category</label>
                <select id="pd-category" className="pd-select" style={{ marginTop: 6 }} value={form.land_category} onChange={(e) => updateField('land_category', e.target.value)}>
                  <option value="">Select category</option>
                  {VALUATION_OPTIONS.landCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="pd-label" htmlFor="pd-location">Location Type</label>
                <select id="pd-location" className="pd-select" style={{ marginTop: 6 }} value={form.location_type} onChange={(e) => updateField('location_type', e.target.value)}>
                  <option value="">Select location type</option>
                  {VALUATION_OPTIONS.locationTypes.map((l) => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="pd-label" htmlFor="pd-tenure">Tenure Type</label>
                <select id="pd-tenure" className="pd-select" style={{ marginTop: 6 }} value={form.tenure_type} onChange={(e) => updateField('tenure_type', e.target.value)}>
                  <option value="">Select tenure</option>
                  {VALUATION_OPTIONS.tenureTypes.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="pd-label" htmlFor="pd-condition">Building Condition</label>
                <select id="pd-condition" className="pd-select" style={{ marginTop: 6 }} value={form.building_condition} onChange={(e) => updateField('building_condition', e.target.value)}>
                  <option value="">Select condition</option>
                  {VALUATION_OPTIONS.buildingConditions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="pd-label" htmlFor="pd-age">Building Age (years)</label>
                <input id="pd-age" className="pd-input" style={{ marginTop: 6 }} type="number" min={0} max={120} placeholder="e.g. 12" value={form.building_age_years} onChange={(e) => updateField('building_age_years', e.target.value)} />
              </div>
              <div>
                <label className="pd-label" htmlFor="pd-land-area">Land Area (sq ft)</label>
                <input id="pd-land-area" className="pd-input" style={{ marginTop: 6 }} type="number" min={1} placeholder="e.g. 2400" value={form.land_area_sqft} onChange={(e) => updateField('land_area_sqft', e.target.value)} />
              </div>
              <div>
                <label className="pd-label" htmlFor="pd-built-up">Built-up Area (sq ft)</label>
                <input id="pd-built-up" className="pd-input" style={{ marginTop: 6 }} type="number" min={0} placeholder="e.g. 1800 (0 for vacant land)" value={form.built_up_area_sqft} onChange={(e) => updateField('built_up_area_sqft', e.target.value)} />
              </div>
            </div>

            <div className="pd-cta-row">
              <button className="pd-btn-secondary" onClick={handleReset} disabled={loading}>
                <RotateCcw size={15} /> Reset
              </button>
              <button className="pd-btn-primary" onClick={handleSubmit} disabled={loading}>
                <BrainCircuit size={16} /> {loading ? 'Evaluating…' : 'Generate Valuation'}
              </button>
            </div>
          </div>
        </div>

        {submitError && (
          <div className="pd-error-banner" style={{ marginTop: 16 }}>
            <AlertTriangle size={18} />
            <div>
              <div className="pd-breakdown-label">Valuation could not be generated</div>
              <div className="pd-breakdown-sub">{submitError}</div>
            </div>
          </div>
        )}

        {result && (
          <div className="pd-card pd-result-panel">
            <div className="pd-header">
              <div>
                <h2 className="pd-title" style={{ fontSize: 18 }}>Valuation Result</h2>
                <p className="pd-subtitle">AI estimate based on the current trained model.</p>
              </div>
              <span className="pd-badge">Model {result.modelVersion ?? 'n/a'}</span>
            </div>

            <div className="pd-result-headline">
              <TrendingUp size={20} />
              Recommended Compensation
              <span className="pd-result-amount">{formatRM(result.recommendedCompensationMyr)}</span>
            </div>

            <div className="pd-breakdown">
              <div className="pd-breakdown-row">
                <div>
                  <div className="pd-breakdown-label">Market Value Estimate</div>
                  <div className="pd-breakdown-sub">
                    Likely range {formatRM(result.estimateRangeLowMyr)} – {formatRM(result.estimateRangeHighMyr)}
                  </div>
                </div>
                <div className="pd-breakdown-value">{formatRM(result.marketValueMyr)}</div>
              </div>
              <div className="pd-breakdown-row">
                <div>
                  <div className="pd-breakdown-label">Statutory Solatium</div>
                  <div className="pd-breakdown-sub">15% disturbance allowance under LAA 1960</div>
                </div>
                <div className="pd-breakdown-value">{formatRM(result.statutoryDisturbanceMyr)}</div>
              </div>
              <div className="pd-breakdown-row">
                <div>
                  <div className="pd-breakdown-label">Relocation Allowance</div>
                  <div className="pd-breakdown-sub">Fixed allowance{result.relocationAllowanceMyr >= 8000 ? ' (built-up structure present)' : ' (vacant land)'}</div>
                </div>
                <div className="pd-breakdown-value">{formatRM(result.relocationAllowanceMyr)}</div>
              </div>
            </div>

            {submittedReportId ? (
              <div className="pd-verdict-banner pd-verdict-better" style={{ marginTop: 16 }}>
                <CheckCircle2 size={18} />
                <span>
                  Valuation report <code>{submittedReportId}</code> submitted for case {selectedCaseId} and is
                  pending approval in the Valuation module.
                </span>
                <button
                  className="pd-btn-secondary"
                  style={{ marginLeft: 'auto', padding: '8px 14px' }}
                  onClick={() => navigate('/admin/case/valuation/review', { state: { reportId: submittedReportId } })}
                >
                  Open in Valuation Module
                </button>
              </div>
            ) : (
              <>
                <p className="pd-disclaimer">
                  This is an AI-generated estimate for reference only. Final compensation is subject to
                  verification by a licensed valuer and approval by the relevant authority.
                </p>

                <div className="pd-action-block">
                  {!selectedCaseId ? (
                    <div className="pd-subtitle">
                      Link an acquisition case above to <strong>accept</strong> this valuation or{' '}
                      <strong>set the price manually</strong> and submit it into the standard approval flow.
                    </div>
                  ) : overrideMode ? (
                    <>
                      <div className="pd-label" style={{ marginBottom: 10 }}>Manual price adjustment</div>
                      <div className="pd-grid-two">
                        <div>
                          <label className="pd-label" htmlFor="pd-override-market">Market Value (RM)</label>
                          <input id="pd-override-market" className="pd-input" style={{ marginTop: 6 }} type="number" min={1} value={overrideMarketValue} onChange={(e) => setOverrideMarketValue(e.target.value)} />
                        </div>
                        <div>
                          <label className="pd-label" htmlFor="pd-override-comp">Recommended Compensation (RM)</label>
                          <input id="pd-override-comp" className="pd-input" style={{ marginTop: 6 }} type="number" min={1} value={overrideCompensation} onChange={(e) => setOverrideCompensation(e.target.value)} />
                        </div>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <label className="pd-label" htmlFor="pd-override-remarks">Remarks</label>
                        <textarea id="pd-override-remarks" className="pd-textarea" style={{ marginTop: 6, minHeight: 70 }} value={overrideRemarks} onChange={(e) => setOverrideRemarks(e.target.value)} />
                      </div>
                      <div className="pd-cta-row">
                        <button className="pd-btn-secondary" onClick={() => setOverrideMode(false)} disabled={submitting}>Cancel</button>
                        <button className="pd-btn-primary" onClick={() => submitToValuationFlow(true)} disabled={submitting}>
                          <Send size={15} /> {submitting ? 'Submitting…' : 'Submit for Approval'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="pd-cta-row" style={{ justifyContent: 'flex-start' }}>
                      <button className="pd-btn-primary" onClick={() => submitToValuationFlow(false)} disabled={submitting}>
                        <CheckCircle2 size={16} /> {submitting ? 'Submitting…' : 'Accept AI Valuation'}
                      </button>
                      <button className="pd-btn-secondary" onClick={startOverride} disabled={submitting}>
                        <PencilLine size={15} /> Set Price Manually
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

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
