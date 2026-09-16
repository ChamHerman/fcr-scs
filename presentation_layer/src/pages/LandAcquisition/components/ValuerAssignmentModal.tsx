import React, { useState, useEffect } from "react";
import * as Lucide from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { landAcquisitionApi } from "../../../services/landAcquisitionApi";
import { useNotification } from "../../../components/ui/NotificationSystem";
import { useRole } from "../../../hooks/useRole";

interface ValuerAssignmentModalProps {
  isOpen: boolean;
  targetCase: any | null;
  onClose: () => void;
  onAssigned: () => void;
}

export const ValuerAssignmentModal: React.FC<ValuerAssignmentModalProps> = ({
  isOpen,
  targetCase,
  onClose,
  onAssigned,
}) => {
  const { user } = useRole();
  const { notify } = useNotification();
  const [valuers, setValuers] = useState<any[]>([]);
  const [loadingValuers, setLoadingValuers] = useState<boolean>(false);
  const [selectedValuerId, setSelectedValuerId] = useState<string>("");
  const [acceptancePeriod, setAcceptancePeriod] = useState<string>("7");
  const [assignmentRemarks, setAssignmentRemarks] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedValuerId("");
    setAcceptancePeriod("7");
    setAssignmentRemarks("");
    setAssignError(null);

    setLoadingValuers(true);
    landAcquisitionApi
      .getAvailableValuers()
      .then((res) => {
        const valuerList = res.valuers || [];
        setValuers(valuerList);
        if (valuerList.length > 0) {
          setSelectedValuerId(valuerList[0].userId);
        }
      })
      .catch((err: any) => {
        console.error("Failed to load valuers list:", err);
        setAssignError(err.message || "Failed to load land valuers list.");
      })
      .finally(() => {
        setLoadingValuers(false);
      });
  }, [isOpen]);

  const handleConfirmAssignment = async () => {
    if (!targetCase) return;
    if (!selectedValuerId) {
      setAssignError("Please select a land valuer.");
      return;
    }
    const days = parseInt(acceptancePeriod, 10);
    if (!days || days <= 0) {
      setAssignError("Please provide a valid acceptance period (greater than 0 days).");
      return;
    }

    setIsAssigning(true);
    setAssignError(null);

    try {
      await landAcquisitionApi.assignValuer({
        caseId: targetCase.caseId,
        valuerId: selectedValuerId,
        acceptancePeriodDays: days,
        remarks: assignmentRemarks || undefined,
        assignedById: user?.userId,
      });

      const selectedValuer = valuers.find((v) => v.userId === selectedValuerId);
      notify({
        type: "success",
        title: "Valuer Assigned Successfully",
        message: `Assigned ${selectedValuer?.name || "Land Valuer"} to Case ${targetCase.caseId}. Acceptance period is ${days} days.`,
      });

      onAssigned();
      onClose();
    } catch (err: any) {
      console.error("Error assigning valuer:", err);
      setAssignError(err.message || "Failed to assign land valuer. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Certified Land Valuer"
      maxWidth="max-w-xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outlined" onClick={onClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button
            variant="filled"
            onClick={handleConfirmAssignment}
            disabled={isAssigning || loadingValuers || !selectedValuerId}
          >
            {isAssigning ? (
              <>
                <Lucide.Loader2 size={16} className="inline animate-spin mr-2" />
                Assigning...
              </>
            ) : (
              <>
                <Lucide.UserCheck size={16} className="inline mr-2" />
                Confirm Assignment
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {assignError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl text-xs flex items-center gap-2">
            <Lucide.AlertCircle size={16} className="shrink-0" />
            <span>{assignError}</span>
          </div>
        )}

        {/* Case Summary Card */}
        {targetCase && (
          <div className="p-4 bg-md-surface rounded-xl border border-md-outline/10 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-md-on-surface-variant font-medium">Project:</span>
              <span className="font-semibold text-md-on-surface">
                {targetCase.project?.projectName || "—"} ({targetCase.project?.projectType || "—"})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-md-on-surface-variant font-medium">Land Title No:</span>
              <span className="font-mono font-medium text-md-on-surface">
                {targetCase.landParcel?.landTitleNo || "—"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-md-on-surface-variant font-medium">Location:</span>
              <span className="text-md-on-surface">
                {targetCase.landParcel?.mukim ? `${targetCase.landParcel.mukim}, ` : ""}
                {targetCase.landParcel?.state || "—"}
              </span>
            </div>
          </div>
        )}

        {/* Valuer Selection List */}
        <div>
          <label className="block text-xs font-semibold text-md-on-surface mb-2 uppercase tracking-wider">
            Select Certified Land Valuer *
          </label>
          {loadingValuers ? (
            <div className="p-6 text-center text-sm text-md-on-surface-variant">
              <Lucide.Loader2 size={20} className="inline animate-spin mr-2" /> Loading certified valuers...
            </div>
          ) : valuers.length === 0 ? (
            <div className="p-4 bg-md-surface rounded-xl border border-md-outline/10 text-center text-xs text-md-on-surface-variant">
              No active land valuers found in the database.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto md-scroll-thin pr-1">
              {valuers.map((v) => {
                const isSelected = selectedValuerId === v.userId;
                return (
                  <div
                    key={v.userId}
                    onClick={() => setSelectedValuerId(v.userId)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-md-primary/10 border-md-primary shadow-sm"
                        : "bg-md-surface border-md-outline/10 hover:border-md-outline/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? "bg-md-primary text-white"
                            : "bg-md-surface-container-high text-md-on-surface-variant"
                        }`}
                      >
                        {v.name
                          ? v.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()
                          : "LV"}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-md-on-surface flex items-center gap-2">
                          {v.name}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-medium">
                            Active Valuer
                          </span>
                        </div>
                        <div className="text-xs text-md-on-surface-variant font-mono">
                          {v.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center pr-1">
                      <input
                        type="radio"
                        name="valuerSelectRadio"
                        checked={isSelected}
                        onChange={() => setSelectedValuerId(v.userId)}
                        className="w-4 h-4 text-md-primary cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Assignment Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <Input
              label="Acceptance Period (Days) *"
              type="number"
              value={acceptancePeriod}
              onChange={(e) => setAcceptancePeriod(e.target.value)}
              placeholder="7"
            />
          </div>
          <div>
            <Input
              label="Remarks (Optional)"
              value={assignmentRemarks}
              onChange={(e) => setAssignmentRemarks(e.target.value)}
              placeholder="e.g., Assigned for site survey"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
