import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Mail, Eye } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { CopyButton } from "../../../components/ui/CopyButton";
import { formatCurrencyRM } from "../../../utils/currency";
import type { SavedCompensationReport } from "../types/compensation.types";

interface CompensationSuccessStateProps {
  savedReport: SavedCompensationReport | null;
  recommendedValuation: number;
  landDiffFromRecommended: number;
  isLandDiffOver100k: boolean;
  onBackToDashboard: () => void;
}

export const CompensationSuccessState: React.FC<CompensationSuccessStateProps> = ({
  savedReport,
  recommendedValuation,
  landDiffFromRecommended,
  isLandDiffOver100k,
  onBackToDashboard,
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-md-surface-container rounded-xl p-7 border border-md-outline/15 shadow-sm space-y-6">
      <div className="success-banner">
        <span className="check-icon">
          <CheckCircle size={20} className="inline mr-1" />
        </span>
        <div>
          <strong>
            {savedReport?.requiresApproval
              ? "New Compensation Report Created and Sent for Approval!"
              : "New Compensation Report Created Successfully!"}
          </strong>
          <span style={{ marginLeft: "12px", fontWeight: 400 }}>
            Case status updated to <strong>{savedReport?.status}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-md-surface-container-low border border-green-500/30 text-center">
          <span className="text-xs text-green-700 dark:text-green-400 uppercase font-semibold">
            Total Compensation
          </span>
          <div className="text-xl font-bold text-green-700 dark:text-green-400 mt-1">
            {formatCurrencyRM(savedReport?.totalCompensation)}
          </div>
          <span className="text-xs text-md-on-surface-variant/70 font-mono mt-0.5 block">Approved Breakdown</span>
        </div>
        <div className="p-4 rounded-xl bg-md-surface-container-low border border-md-primary/30 text-center">
          <span className="text-xs text-md-primary uppercase font-semibold">Recommended Valuation</span>
          <div className="text-xl font-bold text-md-primary mt-1">
            {recommendedValuation > 0 ? formatCurrencyRM(recommendedValuation) : "—"}
          </div>
          <span className="text-xs text-md-on-surface-variant/70 mt-0.5 block">Benchmark</span>
        </div>
        <div className="p-4 rounded-xl bg-md-surface-container-low border border-md-outline/10 text-center">
          <span className="text-xs text-md-on-surface-variant uppercase font-semibold">Land Value Difference</span>
          <div className="text-xl font-bold text-md-on-surface mt-1">
            RM {landDiffFromRecommended.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-md-on-surface-variant/70 mt-0.5 block">
            {isLandDiffOver100k ? "Exceeds RM 100k (Requires Admin Review)" : "Within Threshold"}
          </span>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div style={{ fontSize: "14px", color: "var(--md-on-surface-variant)" }}>
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="text-sm">Assigned Report ID:</span>{" "}
            <span className="font-mono text-base font-bold text-md-primary">{savedReport?.reportId}</span>
            <CopyButton value={savedReport?.reportId || ""} />
          </div>

          {savedReport?.offerReferenceNo ? (
            <div className="mt-3 p-3 max-w-md mx-auto rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-800 dark:text-green-300 flex items-center justify-center gap-2">
              <Mail size={16} />
              <span>
                Offer Letter Auto-Generated: <strong>{savedReport.offerReferenceNo}</strong>
              </span>
              <CopyButton value={savedReport.offerReferenceNo} />
            </div>
          ) : savedReport?.requiresApproval ? (
            <div className="mt-3 p-3 max-w-lg mx-auto rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 text-center">
              Because the Land Value differs by more than RM 100,000 from the Recommended Valuation (or total exceeds RM 1,000,000), this report has been routed to <strong>Government Admin</strong> for review and approval. The Offer Letter will be issued once approved.
            </div>
          ) : null}

          <div className="text-xs text-md-on-surface-variant/70 mt-3 max-w-md mx-auto">
            This compensation report has been recorded with all 7 itemized components in the database with audit trails.
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          {savedReport?.offerId && (
            <Button
              variant="filled"
              onClick={() =>
                navigate("/admin/compensation/offer/review", { state: { offerId: savedReport.offerId } })
              }
            >
              <Mail size={16} /> View Offer Letter
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={() =>
              navigate("/admin/compensation/report/review", { state: { reportId: savedReport?.reportId } })
            }
          >
            <Eye size={16} /> View New Report
          </Button>
          <Button variant="outlined" onClick={onBackToDashboard}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
