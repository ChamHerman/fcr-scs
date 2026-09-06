import React from 'react';
import {
  Check,
  Lock,
  ChevronDown,
  ChevronUp,
  Calendar,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { WorkflowStep } from '../hooks/useMemberWorkflow';

export interface MemberWorkflowTimelineProps {
  workflowSteps: WorkflowStep[];
  expandedStep: number | null;
  onToggleStep: (stepId: number) => void;
  hasOfferLetter: boolean;
  selectedCaseId: string;
  activeOffer: any;
  isOfferAccepted: boolean;
}

export const MemberWorkflowTimeline: React.FC<MemberWorkflowTimelineProps> = ({
  workflowSteps,
  expandedStep,
  onToggleStep,
  hasOfferLetter,
  selectedCaseId,
  activeOffer,
  isOfferAccepted,
}) => {
  return (
    <div className="space-y-3">
      {workflowSteps.map((step) => {
        const isCompleted = step.status === 'completed';
        const isCurrent = step.status === 'current';
        const isUpcoming = step.status === 'upcoming';
        // Lock upcoming steps from expanding
        const isLocked = isUpcoming;
        const isExpanded = expandedStep === step.id && !isLocked;

        return (
          <div
            key={step.id}
            className={`rounded-2xl transition-all border overflow-hidden ${
              isCurrent
                ? 'bg-violet-50/70 border-violet-400 shadow-md ring-2 ring-violet-200'
                : isCompleted
                ? 'bg-white border-slate-200 shadow-sm'
                : 'bg-white/60 border-slate-200 opacity-70'
            }`}
          >
            {/* Step Header */}
            <div
              onClick={() => {
                if (isLocked) return;
                onToggleStep(step.id);
              }}
              className={`p-4 flex items-start gap-3.5 select-none transition ${
                isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer active:bg-slate-50'
              }`}
            >
              {/* Circle Badge */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5 ${
                  isCompleted
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isCurrent
                    ? 'bg-violet-600 text-white shadow-sm ring-4 ring-violet-200 animate-pulse'
                    : 'bg-slate-200 text-slate-500 border border-slate-300'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : isLocked ? <Lock className="w-3 h-3" /> : step.id}
              </div>

              {/* Step Titles */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : isCurrent
                        ? 'bg-violet-200 text-violet-900 font-extrabold'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {step.badgeText}
                  </span>
                  {step.date && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {step.date}
                    </span>
                  )}
                </div>

                <h3
                  className={`text-xs sm:text-sm font-bold truncate ${
                    isCurrent ? 'text-violet-950' : 'text-slate-900'
                  }`}
                >
                  {step.title}
                </h3>
                <p className="text-[11px] text-slate-500 truncate">{step.subtitle}</p>
              </div>

              {/* Accordion Chevron or Lock Icon */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isLocked ? (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold bg-slate-100 px-2 py-0.5 rounded-lg">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Locked</span>
                  </span>
                ) : (
                  <div className="text-slate-400 p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                )}
              </div>
            </div>

            {/* Expanded Step Body */}
            {isExpanded && !isLocked && (
              <div className="px-4 pb-4 pt-1 text-xs text-slate-600 border-t border-slate-200/70 space-y-3">
                <p className="text-xs leading-relaxed pt-1">{step.description}</p>

                {step.details && step.details.length > 0 && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {step.details.map((d, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400 font-medium shrink-0">{d.label}:</span>
                        <span className="font-bold text-slate-800 truncate">{d.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Current Actionable Buttons */}
                {isCurrent && step.id === 3 && hasOfferLetter && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Link
                      to={`/member/offer-letter?caseId=${selectedCaseId}&offerId=${activeOffer?.offerId || ''}`}
                      className="flex-1 py-2.5 px-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Offer Letter Details</span>
                    </Link>
                    {isOfferAccepted && (
                      <Link
                        to={`/member/bank-details?caseId=${selectedCaseId}`}
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-center transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Manage Bank Details</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
