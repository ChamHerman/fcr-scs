import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrencyRM } from '../../utils/currency';

export interface ViewObjectionData {
  id: string;
  caseId?: string;
  caseTitle?: string;
  ownerName?: string;
  status?: string;
  originalOfferAmount?: number;
  requestedAmount?: number;
  revisedCompensation?: number;
  reason?: string;
  reviewRemarks?: string;
  documents?: any[];
}

export interface ViewObjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  objection: ViewObjectionData | null;
  showFullReviewLink?: boolean;
}

export const ViewObjectionModal: React.FC<ViewObjectionModalProps> = ({
  isOpen,
  onClose,
  objection,
  showFullReviewLink = true,
}) => {
  const navigate = useNavigate();

  if (!objection) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compensation Objection Details"
      subtitle={`Reference ID: ${objection.id || ''}`}
      maxWidth="!max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-500">
            Compensation Objection Review
          </span>
          <div className="flex items-center gap-2">
            <Button variant="text" size="md" onClick={onClose}>
              Close
            </Button>
            {showFullReviewLink && objection.id && (
              <button
                type="button"
                onClick={() => {
                  const id = objection.id;
                  onClose();
                  navigate(`/admin/compensation/objection/review/${id}`);
                }}
                className="px-3.5 py-2 bg-violet-700 hover:bg-violet-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Full Review Page</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1 text-xs">
        {/* Status & Case Grid */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Case Title</span>
            <span className="font-bold text-slate-900 text-xs mt-0.5 block">{objection.caseTitle || '—'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Case Reference</span>
            <span className="font-mono font-bold text-slate-700 text-xs mt-0.5 block">{objection.caseId || '—'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Land Owner</span>
            <span className="font-semibold text-slate-800 text-xs mt-0.5 block">{objection.ownerName || '—'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
            <span className="font-bold text-xs mt-0.5 inline-block text-violet-900">{objection.status || '—'}</span>
          </div>
        </div>

        {/* Financials Comparison */}
        <div className="bg-violet-50/70 p-4 rounded-2xl border border-violet-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider block">Original Award</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {objection.originalOfferAmount !== undefined ? formatCurrencyRM(objection.originalOfferAmount) : '—'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider block">Requested Amount</span>
            <span className="font-black text-violet-900 text-sm mt-0.5 block">
              {objection.requestedAmount !== undefined ? formatCurrencyRM(objection.requestedAmount) : '—'}
            </span>
          </div>
          {objection.revisedCompensation !== undefined && (
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Revised Compensation</span>
              <span className="font-black text-emerald-700 text-sm mt-0.5 block">
                {formatCurrencyRM(objection.revisedCompensation)}
              </span>
            </div>
          )}
        </div>

        {/* Grounds & Details */}
        <div className="space-y-1.5">
          <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
            Grounds for Objection
          </span>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 leading-relaxed text-slate-800 text-xs whitespace-pre-wrap">
            {objection.reason || 'No grounds specified.'}
          </div>
        </div>

        {/* Review Remarks if any */}
        {objection.reviewRemarks && (
          <div className="space-y-1.5">
            <span className="font-bold text-violet-900 block text-[11px] uppercase tracking-wider">
              Assessing Officer Review Remarks
            </span>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 leading-relaxed text-slate-800 text-xs">
              {objection.reviewRemarks}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
