import React from 'react';
import {
  MapPin,
  Clock,
  ChevronDown,
  Layers,
  FileCheck2,
  AlertCircle,
  ShieldCheck,
  Eye,
  Check,
  Zap,
  RotateCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { formatCurrencyRM } from '../../../utils/currency';
import { CASE_STATUS_LABEL_MAP } from '../../../constants/landAcquisition';

export interface MemberCaseSummaryCardProps {
  cases: any[];
  selectedCaseId: string;
  onCaseChange: (caseId: string) => void;
  onRefreshCase: (caseId: string) => void;
  loadingDetails: boolean;
  caseDetails: any;
  parcel: any;
  locationString: string;
  offerStatusBadge: string;
  activeOffer: any;
  activeValuation: any;
  currentStageNum: number;
  totalCompensation: number;
  metaParts: string[];
  hasOfferLetter: boolean;
  progressPercent: number;
  progressBadge: string;
  onOpenOfferModal: () => void;
  onOpenCreateObjection: () => void;
  isOfferAccepted: boolean;
  canCreateObjection: boolean;
  objectionDisabledReason?: string;
  workflowSteps?: any[];
}

export const MemberCaseSummaryCard: React.FC<MemberCaseSummaryCardProps> = ({
  cases,
  selectedCaseId,
  onCaseChange,
  onRefreshCase,
  loadingDetails,
  caseDetails,
  parcel,
  locationString,
  offerStatusBadge,
  activeOffer,
  activeValuation,
  currentStageNum,
  totalCompensation,
  metaParts,
  hasOfferLetter,
  progressPercent,
  progressBadge,
  onOpenOfferModal,
  onOpenCreateObjection,
  isOfferAccepted,
  canCreateObjection,
  objectionDisabledReason,
  workflowSteps,
}) => {
  return (
    <>
      {/* Multi-Case Switcher (if member owns multiple properties) */}
      {cases.length > 1 ? (
        <div className="bg-md-surface-container border border-md-outline/15 rounded-3xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-md-secondary-container text-md-primary flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-md-on-surface block">Switch Land Parcel Case</span>
              <p className="text-xs text-md-on-surface-variant mt-0.5">
                You have multiple registered acquisition cases. Switch below to view property details.
              </p>
            </div>
          </div>

          <div className="shrink-0 w-full lg:w-auto flex-1 lg:flex-initial lg:min-w-[420px]">
            <Select
              label="Acquisition Case"
              value={selectedCaseId}
              onChange={(val) => onCaseChange(val)}
              options={cases.map((c: any) => {
                const parcelLot = c.landParcel?.lotNo ? `Lot ${c.landParcel.lotNo}` : c.caseTitle || c.caseId;
                const mukim = c.landParcel?.mukim ? ` (${c.landParcel.mukim})` : '';
                const statusLabel = CASE_STATUS_LABEL_MAP[c.status] || c.status;
                return {
                  value: c.caseId,
                  label: `${c.caseId} • ${parcelLot}${mukim} [${statusLabel}]`,
                };
              })}
            />
          </div>
        </div>
      ) : null}

      {/* HERO CARD */}
      <div className="mt-5 bg-gradient-to-br from-md-surface-container via-md-surface-container/80 to-md-secondary-container/40 text-md-on-surface rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden border border-md-outline/15">
        {/* Subtle Ambient Light Glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-56 h-56 bg-purple-300/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-56 h-56 bg-violet-300/25 rounded-full blur-3xl pointer-events-none" />

        {/* Lot & Case Header */}
        <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-mono font-bold bg-md-primary/10 text-md-primary border border-md-primary/20 tracking-wider">
              {caseDetails?.caseId || selectedCaseId || '—'}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {parcel?.lotNo
                ? parcel.lotNo.toLowerCase().startsWith('lot')
                  ? parcel.lotNo
                  : `Lot ${parcel.lotNo}`
                : caseDetails?.caseTitle || 'Land Parcel'}
            </h1>
            {locationString && (
              <p className="text-slate-600 text-xs sm:text-sm flex items-center gap-1.5 mt-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <span>{locationString}</span>
              </p>
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300/80 shrink-0">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            {offerStatusBadge}
          </span>
        </div>

        {/* Total Compensation Box */}
        <div className="relative z-10 bg-white/85 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-purple-200/70 my-4 shadow-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-violet-900/70">
              {activeOffer
                ? 'Awarded Compensation (Form H)'
                : activeValuation
                ? 'Valuation Assessment'
                : 'Statutory Compensation'}
            </span>
            <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300/70">
              {activeOffer?.status === 'ACCEPTED'
                ? 'Offer Accepted'
                : activeValuation?.reportStatus === 'APPROVED'
                ? 'JPPH Approved'
                : currentStageNum === 1
                ? 'Case Registered'
                : 'Assessment Pending'}
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1.5 tracking-tight">
            {totalCompensation > 0 ? formatCurrencyRM(totalCompensation) : 'Awaiting Valuation'}
          </div>
          {metaParts.length > 0 && (
            <p className="text-xs text-slate-600 mt-1.5 font-medium">
              <span>{metaParts.join(' • ')}</span>
            </p>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="relative z-10 pt-1">
          {hasOfferLetter ? (
            <Link
              to={`/member/offer-letter?caseId=${selectedCaseId}&offerId=${activeOffer?.offerId || ''}`}
              className="w-full block"
            >
              <Button
                variant="filled"
                size="md"
                className="w-full !rounded-2xl !py-3 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Review Offer Letter (Form H)</span>
              </Button>
            </Link>
          ) : (
            <Button
              variant="filled"
              size="md"
              disabled
              className="w-full !rounded-2xl !py-3 font-bold text-xs flex items-center justify-center gap-2"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Offer Letter (Form H) Pending</span>
            </Button>
          )}
        </div>
      </div>

      {/* SEGMENTED / VERTICAL PROGRESS TRACKER */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
        {/* MOBILE VIEW: Vertical Line Stepper */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Layers className="w-4 h-4 text-violet-600" />
              Acquisition Progress
            </span>
            <span className="text-violet-700 bg-violet-50 border border-violet-200/80 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              {progressPercent}%
            </span>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mb-4">
            {progressBadge}
          </p>

          {/* Acquisition Progress Stages List (Mobile) */}
          <div className="relative pl-0.5 space-y-2.5">
            {((workflowSteps && workflowSteps.length > 0)
              ? workflowSteps.map((ws: any) => ({
                  id: ws.id,
                  title: ws.title,
                  subtitle: ws.subtitle,
                  badgeText: ws.badgeText,
                }))
              : [
                  { id: 1, title: 'Notice of Acquisition', subtitle: 'Notice & Registration', badgeText: '' },
                  { id: 2, title: 'Site Inspection & Valuation', subtitle: 'JPPH Assessment', badgeText: '' },
                  { id: 3, title: 'Offer Letter (Form H)', subtitle: 'Award Issuance', badgeText: '' },
                  { id: 4, title: 'Claimant Response & Decision', subtitle: 'Acceptance / Objection', badgeText: '' },
                  { id: 5, title: 'Compensation Settlement', subtitle: 'Electronic GIRO Transfer', badgeText: '' },
                  { id: 6, title: 'Handover & Formal Possession', subtitle: 'Vacant Possession', badgeText: '' },
                ]
            ).map((st: any) => {
              const isCompleted = currentStageNum > st.id;
              const isCurrent = currentStageNum === st.id;

              return (
                <div key={st.id} className="flex items-start gap-2.5 py-0.5">
                  {/* Numbering Element - 20px width and height */}
                  <div
                    className={`w-[20px] h-[20px] min-w-[20px] min-h-[20px] rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 self-center transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-100 shadow-xs'
                        : isCurrent
                        ? 'bg-violet-600 text-white ring-2 ring-violet-200 shadow-xs animate-pulse'
                        : 'bg-slate-100 text-slate-500 border border-slate-300'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3 h-3 stroke-[3]" />
                    ) : (
                      <span>{st.id}</span>
                    )}
                  </div>

                  {/* Step Info */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`text-xs font-bold leading-snug truncate ${
                          isCurrent
                            ? 'text-violet-900 font-extrabold'
                            : isCompleted
                            ? 'text-slate-800 font-semibold'
                            : 'text-slate-500 font-normal'
                        }`}
                      >
                        {st.title}
                      </span>
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : isCurrent
                            ? 'bg-violet-100 text-violet-800 border border-violet-200'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {st.badgeText || (isCompleted ? 'Completed' : isCurrent ? 'Active' : 'Pending')}
                      </span>
                    </div>
                    {st.subtitle && (
                      <p
                        className={`text-[11px] mt-0.5 truncate ${
                          isCurrent
                            ? 'text-violet-600 font-medium'
                            : isCompleted
                            ? 'text-slate-500'
                            : 'text-slate-400'
                        }`}
                      >
                        {st.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DESKTOP VIEW: 6 Step Segmented Bar */}
        <div className="hidden sm:block">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2.5">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-violet-600" />
              Acquisition Progress
            </span>
            <span className="text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              {progressBadge} ({progressPercent}%)
            </span>
          </div>

          {/* 6 Step Segmented Bar */}
          <div className="grid grid-cols-6 gap-1.5 mb-2">
            <div
              className={`h-2 rounded-full transition-all ${
                currentStageNum > 1
                  ? 'bg-emerald-500'
                  : currentStageNum === 1
                  ? 'bg-violet-600 animate-pulse'
                  : 'bg-slate-200'
              }`}
              title="1. Notice of Acquisition"
            />
            <div
              className={`h-2 rounded-full transition-all ${
                currentStageNum > 2
                  ? 'bg-emerald-500'
                  : currentStageNum === 2
                  ? 'bg-violet-600 animate-pulse'
                  : 'bg-slate-200'
              }`}
              title="2. Site Valuation"
            />
            <div
              className={`h-2 rounded-full transition-all ${
                currentStageNum > 3
                  ? 'bg-emerald-500'
                  : currentStageNum === 3
                  ? 'bg-violet-600 animate-pulse'
                  : 'bg-slate-200'
              }`}
              title="3. Offer Letter (Form H)"
            />
            <div
              className={`h-2 rounded-full transition-all ${
                currentStageNum > 4
                  ? 'bg-emerald-500'
                  : currentStageNum === 4
                  ? 'bg-violet-600 animate-pulse'
                  : 'bg-slate-200'
              }`}
              title="4. Claimant Decision"
            />
            <div
              className={`h-2 rounded-full transition-all ${
                currentStageNum > 5
                  ? 'bg-emerald-500'
                  : currentStageNum === 5
                  ? 'bg-violet-600 animate-pulse'
                  : 'bg-slate-200'
              }`}
              title="5. Payment Settlement"
            />
            <div
              className={`h-2 rounded-full transition-all ${
                currentStageNum >= 6 ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
              title="6. Handover & Relocation"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span className={`inline-flex items-center gap-1.5 ${currentStageNum >= 1 ? 'text-emerald-700 font-semibold' : ''}`}>
              <span>1. Notice & Registration</span>
              <Check size={12} className="text-emerald-600 shrink-0" />
            </span>
            <span className={`inline-flex items-center gap-1.5 ${currentStageNum === 3 ? 'text-violet-700 font-bold' : ''}`}>
              <span>3. Form H Offer</span>
              <Zap size={12} className="text-violet-600 shrink-0" />
            </span>
            <span className={`inline-flex items-center gap-1.5 ${currentStageNum >= 6 ? 'text-emerald-700 font-bold' : ''}`}>
              <span>6. Handover</span>
              <Clock size={12} className="text-slate-400 shrink-0" />
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
