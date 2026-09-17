import React, { useState } from 'react';
import {
  BrainCircuit,
  TrendingUp,
  RotateCcw,
  AlertTriangle,
  Link2,
  X,
  CheckCircle2,
  Loader2,
  Lock,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useNotification } from '../../components/ui/NotificationSystem';
import { CaseSelectionModal } from '../LandAcquisition/CaseSelectionModal';
import { landAcquisitionApi } from '../../services/landAcquisitionApi';
import { valuateProperty } from '../../services/predictionApi';
import type { ValuationBreakdown, ValuationInput } from '../../services/predictionApi';
// Shared option lists from the Valuation module constants folder, so this page
// offers exactly the same values as the case/valuation forms.
import {
  MALAYSIA_STATE_OPTIONS,
  LAND_CATEGORY_OPTIONS,
  LOCATION_TYPE_OPTIONS,
  TENURE_TYPE_OPTIONS,
} from '../../constants';
import type { SelectOption } from '../../components/ui/Select';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

type FormShape = Record<keyof ValuationInput, string>;
type LockedShape = Partial<Record<keyof ValuationInput, boolean>>;

const EMPTY_FORM: FormShape = {
  state: '',
  land_category: '',
  location_type: '',
  tenure_type: '',
  land_area_m2: '',
  acquisition_area_m2: '',
  building_age_years: '',
};

const formatRM = (value: number) => `RM ${Math.round(value).toLocaleString('en-US')}`;

const optionList = (opts: SelectOption[]) => opts.filter((o) => o.value !== '');

// Map DB enums / parcel values onto the model vocabulary (same as constants).
const PARCEL_CATEGORY_LABEL: Record<string, string> = {
  AGRICULTURE: 'Agriculture',
  BUILDING: 'Building',
  INDUSTRY: 'Industry',
};
const TENURE_LABEL: Record<string, string> = {
  FREEHOLD: 'Freehold',
  LEASEHOLD: 'Leasehold',
  MALAY_RESERVE: 'Malay Reserve',
};
const AREA_TO_M2: Record<string, number> = {
  SQUARE_METER: 1,
  ACRE: 4046.8564224,
  HECTARE: 10000,
};

export const GenerateAIValuation: React.FC = () => {
  useDocumentTitle('AI Valuation');
  const { notify } = useNotification();
  const [form, setForm] = useState<FormShape>({ ...EMPTY_FORM });
  const [locked, setLocked] = useState<LockedShape>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValuationBreakdown | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Case linkage: selecting a case auto-fills and locks the attributes that the
  // case already knows; the rest stay editable for the officer to complete.
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [caseLoading, setCaseLoading] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [autoFillNote, setAutoFillNote] = useState<string | null>(null);

  const updateField = (field: keyof ValuationInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const roundM2 = (value: number) => Math.max(0, Math.round(value * 100) / 100);

  const applyCaseToForm = async (caseId: string) => {
    setCaseLoading(true);
    try {
      const res = await landAcquisitionApi.getCaseById(caseId);
      const c = res?.case ?? res;
      const parcel = c?.landParcel;
      const reports: any[] = Array.isArray(c?.valuationReports) ? c.valuationReports : [];
      const latest = [...reports].sort((a, b) =>
        new Date(b.valuationDate || b.updatedAt).getTime() - new Date(a.valuationDate || a.updatedAt).getTime()
      )[0];

      const next: FormShape = { ...EMPTY_FORM };
      const nextLocked: LockedShape = {};
      const filled: string[] = [];

      if (parcel?.state) {
        next.state = parcel.state;
        nextLocked.state = true;
        filled.push('State');
      }
      const categoryLabel = parcel?.category ? PARCEL_CATEGORY_LABEL[parcel.category] : undefined;
      if (categoryLabel) {
        next.land_category = categoryLabel;
        nextLocked.land_category = true;
        filled.push('Land category');
      }
      const tenureLabel = parcel?.tenureType ? TENURE_LABEL[parcel.tenureType] : undefined;
      if (tenureLabel) {
        next.tenure_type = tenureLabel;
        nextLocked.tenure_type = true;
        filled.push('Tenure');
      }
      if (parcel?.area != null) {
        next.land_area_m2 = String(roundM2(Number(parcel.area) * (AREA_TO_M2[parcel.areaUnit] ?? 1)));
        nextLocked.land_area_m2 = true;
        filled.push('Land area (m²)');
      }
      if (latest) {
        if (latest.locationType) {
          next.location_type = latest.locationType;
          nextLocked.location_type = true;
          filled.push('Location type');
        }
        if (latest.acquisitionArea != null && Number(latest.acquisitionArea) > 0) {
          next.acquisition_area_m2 = String(roundM2(Number(latest.acquisitionArea)));
          nextLocked.acquisition_area_m2 = true;
          filled.push('Acquisition area (m²)');
        }
        if (latest.buildingAge != null) {
          next.building_age_years = String(Number(latest.buildingAge));
          nextLocked.building_age_years = true;
          filled.push('Building age');
        }
      }

      setForm(next);
      setLocked(nextLocked);
      setAutoFillNote(
        filled.length > 0
          ? `Auto-filled from case ${caseId} (locked): ${filled.join(', ')}. Please fill in the remaining fields.`
          : `No property data found for case ${caseId} yet - please fill in all attributes.`
      );
    } catch (e: unknown) {
      notify({ type: 'error', title: 'Could not load case details', message: (e as Error).message });
    } finally {
      setCaseLoading(false);
    }
  };

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setCaseModalOpen(false);
    applyCaseToForm(caseId);
  };

  const handleClearCase = () => {
    setSelectedCaseId(null);
    setAutoFillNote(null);
    setLocked({});
    setForm({ ...EMPTY_FORM });
    setResult(null);
  };

  const validate = (): string | null => {
    if (!form.state || !form.land_category || !form.location_type || !form.tenure_type) {
      return 'Please complete all dropdown selections.';
    }
    const landArea = Number(form.land_area_m2);
    const acquisitionArea = Number(form.acquisition_area_m2);
    const age = Number(form.building_age_years);
    if (!form.land_area_m2 || Number.isNaN(landArea) || landArea <= 0) {
      return 'Land area must be a number greater than 0.';
    }
    if (!form.acquisition_area_m2 || Number.isNaN(acquisitionArea) || acquisitionArea <= 0) {
      return 'Acquisition area must be a number greater than 0.';
    }
    if (acquisitionArea >= landArea) {
      return 'Acquisition area must be smaller than the land area.';
    }
    if (form.building_age_years === '' || Number.isNaN(age) || age < 0 || age > 120) {
      return 'Building age must be between 0 and 120 years.';
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      notify({ type: 'error', title: 'Invalid input', message: error });
      return;
    }

    setLoading(true);
    setSubmitError(null);
    try {
      const breakdown = await valuateProperty({
        state: form.state,
        land_category: form.land_category,
        location_type: form.location_type,
        tenure_type: form.tenure_type,
        land_area_m2: Number(form.land_area_m2),
        acquisition_area_m2: Number(form.acquisition_area_m2),
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
    setForm(selectedCaseId ? { ...form } : { ...EMPTY_FORM });
    setResult(null);
    setSubmitError(null);
  };

  const lockedHint = (field: keyof ValuationInput) =>
    locked[field] ? (
      <span className="inline-flex items-center gap-1 text-[11px] text-md-on-surface-variant">
        <Lock size={11} /> from case
      </span>
    ) : null;

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
            Estimate statutory compensation with the live trained model.
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
              ? 'Known attributes were auto-filled from this case and locked. Fill in the remaining fields.'
              : 'Optional — select a case to auto-fill its known attributes, or fill in every attribute manually.'}
          </div>
        </div>
        {selectedCaseId && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-md-secondary-container text-md-on-secondary-container font-mono text-xs font-bold">
            {selectedCaseId}
            <button type="button" aria-label="Clear case" className="hover:opacity-70" onClick={handleClearCase}>
              <X size={13} />
            </button>
          </span>
        )}
        <Button variant="outlined" size="sm" className="ml-auto" onClick={() => setCaseModalOpen(true)} disabled={caseLoading}>
          {caseLoading ? <Loader2 size={15} className="animate-spin" /> : selectedCaseId ? 'Change Case' : 'Select Case'}
        </Button>
      </Card>

      {autoFillNote && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-md-primary/10 border border-md-primary/20 text-md-primary text-[13px]">
          <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
          <span>{autoFillNote}</span>
        </div>
      )}

      {/* Attribute form */}
      <Card interactive={false}>
        <h2 className="text-lg font-semibold mb-1">Property Attributes</h2>
        <p className="text-sm text-md-on-surface-variant mb-5">
          The 7 valuation attributes used by the trained model. Fields auto-filled from the case are locked;
          the rest are yours to complete.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Select label="State" options={optionList(MALAYSIA_STATE_OPTIONS)} value={form.state} onChange={(v) => updateField('state', v)} placeholder="Select state" disabled={!!locked.state} />
            {lockedHint('state')}
          </div>
          <div>
            <Select label="Land Category" options={optionList(LAND_CATEGORY_OPTIONS)} value={form.land_category} onChange={(v) => updateField('land_category', v)} placeholder="Select category" disabled={!!locked.land_category} />
            {lockedHint('land_category')}
          </div>
          <div>
            <Select label="Location Type" options={optionList(LOCATION_TYPE_OPTIONS)} value={form.location_type} onChange={(v) => updateField('location_type', v)} placeholder="Select location type" disabled={!!locked.location_type} />
            {lockedHint('location_type')}
          </div>
          <div>
            <Select label="Tenure Type" options={optionList(TENURE_TYPE_OPTIONS)} value={form.tenure_type} onChange={(v) => updateField('tenure_type', v)} placeholder="Select tenure" disabled={!!locked.tenure_type} />
            {lockedHint('tenure_type')}
          </div>
          <div>
            <Input label="Land Area (m²)" type="number" min={1} placeholder="e.g. 1200" value={form.land_area_m2} onChange={(e) => updateField('land_area_m2', e.target.value)} disabled={!!locked.land_area_m2} />
            {lockedHint('land_area_m2')}
          </div>
          <div>
            <Input label="Acquisition Area (m²)" type="number" min={1} placeholder="e.g. 800 (must be less than land area)" value={form.acquisition_area_m2} onChange={(e) => updateField('acquisition_area_m2', e.target.value)} disabled={!!locked.acquisition_area_m2} />
            {lockedHint('acquisition_area_m2')}
          </div>
          <div>
            <Input label="Building Age (years)" type="number" min={0} max={120} placeholder="e.g. 12" value={form.building_age_years} onChange={(e) => updateField('building_age_years', e.target.value)} disabled={!!locked.building_age_years} />
            {lockedHint('building_age_years')}
          </div>
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
              <p className="text-sm text-md-on-surface-variant">
                AI estimate based on the current trained model{selectedCaseId ? ` for case ${selectedCaseId}` : ''}.
              </p>
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
                  {result.relocationAllowanceMyr >= 8000 ? 'Structure present on the acquired land' : 'Vacant acquired land'}
                </div>
              </div>
              <div className="font-bold whitespace-nowrap">{formatRM(result.relocationAllowanceMyr)}</div>
            </div>
          </div>

          <p className="text-xs text-md-on-surface-variant mt-4">
            This is an AI-generated estimate for reference only. Final compensation is subject to verification
            by a licensed valuer and approval by the relevant authority.
          </p>
        </Card>
      )}

      <CaseSelectionModal
        isOpen={caseModalOpen}
        onClose={() => setCaseModalOpen(false)}
        onSelectCase={handleSelectCase}
        title="Link Case to AI Valuation"
        subtitle="Select the acquisition case - its registered land details will auto-fill and lock the matching attributes below."
      />
    </div>
  );
};

export default GenerateAIValuation;
