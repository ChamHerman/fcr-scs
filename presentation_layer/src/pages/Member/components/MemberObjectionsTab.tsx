import React from 'react';
import {
  Scale,
  Plus,
  Eye,
  Loader2,
  Calendar,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { formatCurrencyRM } from '../../../utils/currency';
import { BASE_URL } from '../../../services/api';

export interface MemberObjectionsTabProps {
  objections: any[];
  loading: boolean;
  canCreateObjection: boolean;
  objectionDisabledReason?: string;
  hasOfferLetter: boolean;
  selectedCaseId: string;
  activeOffer: any;
  onOpenCreateObjection: () => void;
  onOpenEditObjection: (obj: any) => void;
  onOpenDeleteObjection: (objId: string) => void;
  onOpenViewObjection: (obj: any) => void;
  isMember: boolean;
  isSysAdmin: boolean;
}

export const MemberObjectionsTab: React.FC<MemberObjectionsTabProps> = ({
  objections,
  loading,
  canCreateObjection,
  objectionDisabledReason,
  hasOfferLetter,
  selectedCaseId,
  activeOffer,
  onOpenCreateObjection,
  onOpenEditObjection,
  onOpenDeleteObjection,
  onOpenViewObjection,
  isMember,
  isSysAdmin,
}) => {
  return (
    <div className="space-y-4">
      {/* Action Header: ONLY Add Button (disabled with hover tooltip if conditions are not met) */}
      {(isMember || isSysAdmin) && (
        <div className="flex justify-end">
          <div
            title={objectionDisabledReason || 'Submit Compensation Objection'}
            className={!canCreateObjection ? 'cursor-not-allowed inline-block' : 'inline-block'}
          >
            <Button
              variant="filled"
              size="md"
              onClick={onOpenCreateObjection}
              disabled={!canCreateObjection}
              className="!rounded-xl font-bold text-xs shadow-sm bg-violet-700 hover:bg-violet-800 text-white shrink-0 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Objection</span>
            </Button>
          </div>
        </div>
      )}

      {/* Objections List Container */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">
            Loading your objection records from database...
          </p>
        </div>
      ) : objections.length === 0 ? (
        <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-3xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto border border-violet-100">
            <Scale className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">No Objections Filed</h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
              If you disagree with the compensation amount awarded in Form H, you can submit an objection
              for the assigned government officer to review and revise the compensation value accordingly.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-2">
            <div
              title={objectionDisabledReason || 'Submit Compensation Objection'}
              className={!canCreateObjection ? 'cursor-not-allowed inline-block' : 'inline-block'}
            >
              <Button
                variant="filled"
                size="md"
                onClick={onOpenCreateObjection}
                disabled={!canCreateObjection}
                className="!rounded-xl font-bold text-xs bg-violet-700 hover:bg-violet-800 text-white shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Submit Objection</span>
              </Button>
            </div>
            {hasOfferLetter && (
              <Link
                to={`/member/offer-letter?caseId=${selectedCaseId}&offerId=${activeOffer?.offerId || ''}`}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Current Form H</span>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {objections.map((obj) => {
            const isPending = obj.rawStatus === 'PENDING';
            const isApproved = obj.rawStatus === 'APPROVED';
            const isRejected = obj.rawStatus === 'REJECTED';

            return (
              <div
                key={obj.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-violet-300 p-5 shadow-sm transition space-y-4"
              >
                {/* Top Row: Pending Review on left, Edit | Withdraw on right */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : isRejected
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-amber-50 text-amber-900 border-amber-300'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isApproved
                            ? 'bg-emerald-500'
                            : isRejected
                            ? 'bg-rose-500'
                            : 'bg-amber-500 animate-pulse'
                        }`}
                      />
                      <span>{obj.status}</span>
                    </span>
                  </div>

                  {/* Edit | Withdraw action links */}
                  <div className="flex items-center gap-1.5 text-xs shrink-0">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenEditObjection(obj)}
                          className="font-bold text-violet-700 hover:text-violet-900 hover:underline px-1.5 py-0.5 cursor-pointer transition"
                        >
                          Edit
                        </button>
                        <span className="text-slate-300 font-normal">|</span>
                        <button
                          type="button"
                          onClick={() => onOpenDeleteObjection(obj.id)}
                          className="font-bold text-rose-600 hover:text-rose-800 hover:underline px-1.5 py-0.5 cursor-pointer transition"
                        >
                          Withdraw
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenViewObjection(obj)}
                        className="font-bold text-violet-700 hover:text-violet-900 hover:underline px-1.5 py-0.5 cursor-pointer transition"
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>

                {/* Financial Figures & Date Row: Original, Requested Amount, Submission Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/90 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Original
                    </span>
                    <span className="font-bold text-slate-700 text-sm mt-0.5 block">
                      {formatCurrencyRM(obj.originalOfferAmount)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider block">
                      Requested Amount
                    </span>
                    <span className="font-black text-violet-900 text-sm mt-0.5 block">
                      {formatCurrencyRM(obj.requestedAmount)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Submission Date
                    </span>
                    <span className="font-semibold text-slate-700 text-xs mt-1 block flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {obj.submissionDate}
                    </span>
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Reason
                  </span>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {obj.reason}
                  </div>
                </div>

                {/* Attached Document */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Attached Document
                  </span>
                  {obj.documents && obj.documents.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {obj.documents.map((doc: any, dIdx: number) => {
                        const docUrl = doc.filePath
                          ? `${BASE_URL}/${doc.filePath.replace(/^\//, '')}`
                          : null;
                        return (
                          <div
                            key={dIdx}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-violet-50 rounded-xl border border-slate-200 text-xs text-slate-700 transition"
                          >
                            <FileText className="w-4 h-4 text-violet-600 shrink-0" />
                            <span className="font-semibold truncate max-w-[200px]">
                              {doc.name || doc.fileName}
                            </span>
                            {doc.fileSize && (
                              <span className="text-[10px] text-slate-400">({doc.fileSize})</span>
                            )}
                            {docUrl && (
                              <button
                                type="button"
                                onClick={() => window.open(docUrl, '_blank', 'noopener,noreferrer')}
                                className="p-1 text-violet-700 hover:text-violet-900 rounded-lg hover:bg-violet-100 cursor-pointer transition ml-1"
                                title="View Document"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-300 shrink-0" />
                      <span>No attached documents.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
