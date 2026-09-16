import React from "react";
import { Check, Edit, AlertTriangle, CheckCircle } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { formatCurrencyRM, parseCurrencyToNumber } from "../../../utils/currency";
import type { CompensationFormData, ProjectBudgetSummary } from "../types/compensation.types";

interface CompensationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onConfirm: () => void;
  isSaving: boolean;
  formData: CompensationFormData;
  calculatedTotal: number;
  projectBudgetSummary?: ProjectBudgetSummary;
  recommendedValuation: number;
  isLandDiffOver100k: boolean;
  landDiffFromRecommended: number;
  currentRemainingFund: number;
  remainingFundAfterReport: number;
  projectBudget: number;
}

export const CompensationPreviewModal: React.FC<CompensationPreviewModalProps> = ({
  isOpen,
  onClose,
  onEdit,
  onConfirm,
  isSaving,
  formData,
  calculatedTotal,
  projectBudgetSummary,
  recommendedValuation,
  isLandDiffOver100k,
  landDiffFromRecommended,
  currentRemainingFund,
  remainingFundAfterReport,
  projectBudget,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compensation Summary"
      subtitle="Review the calculated compensation breakdown before confirming"
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="text" onClick={onEdit}>
            <Edit size={16} /> Edit
          </Button>
          <Button variant="filled" onClick={onConfirm} isLoading={isSaving}>
            <Check size={16} /> Confirm & Save
          </Button>
        </>
      }
    >
      <div className="space-y-3.5 py-2">
        {/* Breakdown Items */}
        <div className="p-4 rounded-xl bg-md-surface-container-low border border-md-outline/15 space-y-2 text-sm">
          <div className="flex justify-between items-center text-md-on-surface-variant">
            <span>Land Value</span>
            <span className="font-semibold text-md-on-surface">
              {formData.landValue ? formatCurrencyRM(formData.landValue) : "RM 0.00"}
            </span>
          </div>
          <div className="flex justify-between items-center text-md-on-surface-variant">
            <span>Building / Structure Value</span>
            <span className="font-semibold text-md-on-surface">
              {formData.buildingValue ? formatCurrencyRM(formData.buildingValue) : "RM 0.00"}
            </span>
          </div>
          <div className="flex justify-between items-center text-md-on-surface-variant">
            <span>Crop / Plantation Value</span>
            <span className="font-semibold text-md-on-surface">
              {formData.cropValue ? formatCurrencyRM(formData.cropValue) : "RM 0.00"}
            </span>
          </div>
          {(parseCurrencyToNumber(formData.businessDisruption) > 0 ||
            parseCurrencyToNumber(formData.disturbanceCompensation) > 0 ||
            parseCurrencyToNumber(formData.relocationAllowance) > 0 ||
            parseCurrencyToNumber(formData.otherEligible) > 0) && (
            <div className="flex justify-between items-center text-md-on-surface-variant pt-1 border-t border-md-outline/10">
              <span>Other Allowances & Disturbance</span>
              <span className="font-semibold text-md-on-surface">
                {formatCurrencyRM(
                  parseCurrencyToNumber(formData.businessDisruption) +
                    parseCurrencyToNumber(formData.disturbanceCompensation) +
                    parseCurrencyToNumber(formData.relocationAllowance) +
                    parseCurrencyToNumber(formData.otherEligible)
                )}
              </span>
            </div>
          )}
        </div>

        {/* Total Calculated Compensation */}
        <div className="flex justify-between items-center p-4 rounded-xl bg-md-surface-container-low border border-green-500/30">
          <span className="text-sm font-semibold text-green-700 dark:text-green-400">Total Compensation Value</span>
          <span className="text-base font-bold text-green-700 dark:text-green-400">
            {formatCurrencyRM(calculatedTotal)}
          </span>
        </div>

        {/* Project Budget Reference */}
        {projectBudgetSummary && (
          <div className="p-3.5 rounded-xl bg-md-surface-container-low border border-md-outline/15 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-md-on-surface-variant">
              <span>Total Project Budget:</span>
              <span className="font-semibold text-md-on-surface">
                {formatCurrencyRM(projectBudget)}
              </span>
            </div>
            <div className="flex justify-between items-center text-md-on-surface-variant">
              <span>Current Remaining Fund:</span>
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                {formatCurrencyRM(currentRemainingFund)}
              </span>
            </div>
            <div className="flex justify-between items-center text-md-on-surface-variant pt-1 border-t border-md-outline/10">
              <span>Remaining Fund After This Report:</span>
              <span
                className={`font-bold ${
                  remainingFundAfterReport < 0
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {formatCurrencyRM(remainingFundAfterReport)}
              </span>
            </div>
          </div>
        )}

        {/* Approved Valuation Recommended Reference */}
        <div className="flex justify-between items-center p-4 rounded-xl bg-md-surface-container-low border border-md-primary/30">
          <span className="text-sm font-semibold text-md-primary">Approved Recommended Valuation</span>
          <span className="text-base font-bold text-md-primary">
            {recommendedValuation > 0 ? formatCurrencyRM(recommendedValuation) : "—"}
          </span>
        </div>

        {/* RM 100,000 Difference Warning Indicator */}
        {recommendedValuation > 0 && (
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
              isLandDiffOver100k
                ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                : "bg-green-500/10 border-green-500/30 text-green-900 dark:text-green-200"
            }`}
          >
            {isLandDiffOver100k ? (
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            ) : (
              <CheckCircle size={16} className="shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
            )}
            <div>
              <strong>
                {isLandDiffOver100k
                  ? `${formatCurrencyRM(landDiffFromRecommended)} Difference Detected (> RM 100,000 Threshold)`
                  : "Land Value within RM 100,000 threshold"}
              </strong>
              <p className="mt-0.5 opacity-80">
                {isLandDiffOver100k
                  ? "The proposed Land Value deviates by more than RM 100,000 from the Approved Recommended Valuation. Proceeding will route this report to Government Admin for review and approval. The offer letter will not be generated yet."
                  : "The proposed Land Value is aligned within RM 100,000 of the Approved Recommended Valuation."}
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
