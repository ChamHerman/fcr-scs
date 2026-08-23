import React, { useState, useEffect, useCallback } from "react";
import * as Lucide from "lucide-react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { SearchInput } from "../../components/ui/SearchInput";
import { CopyButton } from "../../components/ui/CopyButton";
import "../../style.css";
import "./valuation_report.css";

interface CaseSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCase: (caseId: string) => void;
  allowedStatuses?: string[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
}

export const CaseSelectionModal: React.FC<CaseSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectCase,
  allowedStatuses = ["VALUER_ASSIGNED", "VALUATION_IN_PROGRESS", "VALUATION_REJECTED"],
  title = "Select Case for Valuation Report",
  subtitle = "Click directly on any case card below to select it for the report generator.",
  emptyMessage = "No cases available matching criteria.",
}) => {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const statusKey = allowedStatuses.join(",");

  const fetchCases = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const res = await landAcquisitionApi.getAllCases({ limit: 100 });
      const targetStatuses = statusKey ? statusKey.split(",") : [];
      const filtered = (res.cases || []).filter((c: any) =>
        targetStatuses.includes(c.status)
      );
      setCases(filtered);
    } catch (err) {
      console.error("Failed to fetch cases for selection:", err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, statusKey]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const filteredCases = cases.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.caseId?.toLowerCase().includes(q) ||
      c.caseTitle?.toLowerCase().includes(q) ||
      c.project?.projectName?.toLowerCase().includes(q)
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth="max-w-3xl"
      footer={
        <Button variant="text" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <SearchInput
          placeholder="Filter cases by title or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="max-h-[420px] overflow-y-auto pr-1 md-scroll-thin">
          {loading ? (
            <div className="text-center py-12 text-md-on-surface-variant">
              <Lucide.Loader2 size={28} className="inline animate-spin mb-2" />
              <div>Loading available cases...</div>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-12 text-md-on-surface-variant/70 text-sm">
              {emptyMessage}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredCases.map((c) => {
                const projectTitle = c.project?.projectName || "—";

                return (
                  <div
                    key={c.caseId}
                    onClick={() => onSelectCase(c.caseId)}
                    className="p-4 rounded-xl border border-md-outline/20 bg-md-surface-container hover:border-md-primary hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-md-primary bg-md-primary/10 px-2 py-0.5 rounded-md">
                          <Lucide.FileText size={12} />
                          {c.caseId}
                        </span>
                        <div onClick={(e) => e.stopPropagation()}>
                          <CopyButton value={c.caseId} />
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold text-md-on-surface line-clamp-2 mb-2">
                        {c.caseTitle}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-md-on-surface-variant pt-2 border-t border-md-outline/10">
                      <Lucide.Folder size={14} className="shrink-0 opacity-70" />
                      <span className="truncate">{projectTitle}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
