import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import * as Lucide from "lucide-react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
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

  if (!isOpen) return null;

  return createPortal(
    <div
      className="preview-modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
      }}
      onClick={onClose}
    >
      <div
        className="preview-modal"
        style={{
          position: "relative",
          maxWidth: "720px",
          width: "90%",
          maxHeight: "85vh",
          padding: "24px",
          borderRadius: "16px",
          background: "var(--md-surface-container, #ffffff)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "none",
          margin: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: "20px" }}>
          <div>
            <h2
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: 0,
              }}
            >
              <Lucide.FolderPlus size={22} color="var(--md-primary)" />
              {title}
            </h2>
            <div
              style={{
                fontSize: "13px",
                color: "var(--md-on-surface-variant)",
                marginTop: "4px",
              }}
            >
              {subtitle}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <Lucide.X size={22} />
          </button>
        </div>

        {/* Card Grid Container */}
        <div
          style={{
            maxHeight: "420px",
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 0",
                color: "var(--md-on-surface-variant)",
              }}
            >
              <Lucide.Loader2 size={28} className="inline animate-spin mb-2" />
              <div>Loading available cases...</div>
            </div>
          ) : cases.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 0",
                color: "var(--md-on-surface-variant)",
                opacity: 0.7,
              }}
            >
              {emptyMessage}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "14px",
              }}
            >
              {cases.map((c) => {
                const projectTitle = c.project?.projectName || "—";

                return (
                  <div
                    key={c.caseId}
                    onClick={() => onSelectCase(c.caseId)}
                    style={{
                      margin: "8px",
                      background: "var(--md-surface)",
                      border: "1px solid rgba(121,116,126,0.2)",
                      borderRadius: "12px",
                      padding: "16px",
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      position: "relative",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--md-primary)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 16px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(121,116,126,0.2)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 2px 6px rgba(0,0,0,0.04)";
                    }}
                  >
                    <div>
                      {/* Case ID Badge */}
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "var(--md-primary)",
                          background: "rgba(59,130,246,0.1)",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          marginBottom: "10px",
                        }}
                      >
                        <Lucide.FileText size={12} />
                        {c.caseId}
                      </div>

                      {/* Case Title */}
                      <h4
                        style={{
                          margin: "0 0 10px 0",
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "var(--md-on-surface)",
                          lineHeight: "1.3",
                        }}
                      >
                        {c.caseTitle}
                      </h4>
                    </div>

                    {/* Project Name */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        color: "var(--md-on-surface-variant)",
                        borderTop: "1px solid rgba(121,116,126,0.1)",
                        paddingTop: "10px",
                        marginTop: "8px",
                      }}
                    >
                      <Lucide.Folder
                        size={14}
                        style={{ flexShrink: 0, opacity: 0.7 }}
                      />
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {projectTitle}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div
          className="modal-actions"
          style={{ marginTop: "20px", justifyContent: "flex-end" }}
        >
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
