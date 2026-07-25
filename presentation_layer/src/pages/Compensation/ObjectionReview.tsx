import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import "../../style.css";
import "./objection.css";


type ObjectionDetail = {
  id: string;
  caseId: string;
  caseTitle: string;
  submittedBy: string;
  submittedById: string;
  submittedDate: string;
  type: "Form N" | "Additional Evidence";
  status: "Submitted" | "Under Review" | "Approved" | "Rejected";
  statusClass: "submitted" | "review" | "approved" | "rejected";
  objectionText: string;
  attachments: { name: string; size: string }[];
  response?: string;
  responseDate?: string;
  respondedBy?: string;
};

const mockObjectionDetail: ObjectionDetail = {
  id: "OBJ-2026-001",
  caseId: "LAC-2026-07-0024",
  caseTitle: "Kampung Baru Land Acquisition",
  submittedBy: "Ahmad Bin Abdullah",
  submittedById: "CM-001",
  submittedDate: "22 Jul 2026",
  type: "Form N",
  status: "Under Review",
  statusClass: "review",
  objectionText:
    "I object to the compensation amount offered for my property at Kampung Baru. The valuation report does not accurately reflect the current market value of the land. Comparable properties in the vicinity have been sold at significantly higher prices. Additionally, the disturbance compensation does not account for the loss of livelihood from my small business operated from the premises. I request a review of the valuation and a revised compensation offer that reflects the true market value and business losses.",
  attachments: [
    { name: "property_valuation_report.pdf", size: "2.4 MB" },
    { name: "business_registration.pdf", size: "1.1 MB" },
    { name: "comparative_sales_data.xlsx", size: "3.2 MB" },
  ],
};

export const ObjectionReview: React.FC = () => {
  const { objectionId } = useParams<{ objectionId: string }>();
  const navigate = useNavigate();
  const [objection, setObjection] = useState<ObjectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState("");
  const [responseError, setResponseError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionPerformed, setActionPerformed] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setObjection(mockObjectionDetail);
      setLoading(false);
    }, 500);
  }, [objectionId]);

  const handleApprove = () => {
    if (!responseText.trim()) {
      setResponseError("Please provide a response before approving.");
      return;
    }
    setResponseError("");
    setSubmitting(true);
    setTimeout(() => {
      setObjection((prev) =>
        prev
          ? {
              ...prev,
              status: "Approved",
              statusClass: "approved",
              response: responseText,
              responseDate: "24 Jul 2026",
              respondedBy: "Administrator (AO)",
            }
          : null,
      );
      setActionPerformed(true);
      setSubmitting(false);
      alert("Objection approved. The community member will be notified.");
    }, 1200);
  };

  const handleReject = () => {
    if (!responseText.trim()) {
      setResponseError("Please provide a response before rejecting.");
      return;
    }
    setResponseError("");
    setSubmitting(true);
    setTimeout(() => {
      setObjection((prev) =>
        prev
          ? {
              ...prev,
              status: "Rejected",
              statusClass: "rejected",
              response: responseText,
              responseDate: "24 Jul 2026",
              respondedBy: "Administrator (AO)",
            }
          : null,
      );
      setActionPerformed(true);
      setSubmitting(false);
      alert("Objection rejected. The community member will be notified.");
    }, 1200);
  };

  if (loading) {
    return (
      <div
        className="flex min-h-screen"
        style={{
          background: "var(--md-background)",
          color: "var(--md-on-surface)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}
        >
          Loading objection...
        </div>
      </div>
    );
  }

  if (!objection) {
    return (
      <div
        className="flex min-h-screen"
        style={{
          background: "var(--md-background)",
          color: "var(--md-on-surface)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}
        >
          Objection not found.
        </div>
      </div>
    );
  }

  const isActionable =
    objection.status === "Submitted" || objection.status === "Under Review";
  const isResolved =
    objection.status === "Approved" || objection.status === "Rejected";

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--md-background)", color: "var(--md-on-surface)" }}
    >
      

      <main className="main blur-shape-bg">
        <div className="objection-review">
          <div className="header-card">
            <div className="left">
              <div className="objection-id">{objection.id}</div>
              <div className="title">{objection.caseTitle}</div>
              <div className="meta">
                <span><Lucide.FolderOpen size={16} className="inline mr-1" /> {objection.caseId}</span>
                <span><Lucide.User size={16} className="inline mr-1" /> {objection.submittedBy}</span>
                <span><Lucide.Calendar size={16} className="inline mr-1" /> {objection.submittedDate}</span>
                <span><Lucide.FileText size={16} className="inline mr-1" /> {objection.type}</span>
              </div>
            </div>
            <span className={`status-badge-lg ${objection.statusClass}`}>
              {objection.status === "Under Review" ? <Lucide.Hourglass size={16} className="inline mr-1" /> : ""}
              {objection.status}
            </span>
          </div>

          <div className="content-card">
            <div className="section-title"><Lucide.ClipboardList size={16} className="inline mr-1" /> Objection Details</div>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">Submitted By</span>
                <span className="value">{objection.submittedBy}</span>
              </div>
              <div className="detail-item">
                <span className="label">Submitted ID</span>
                <span className="value">{objection.submittedById}</span>
              </div>
              <div className="detail-item">
                <span className="label">Submission Date</span>
                <span className="value">{objection.submittedDate}</span>
              </div>
              <div className="detail-item">
                <span className="label">Type</span>
                <span className="value">{objection.type}</span>
              </div>
            </div>

            <div className="objection-text">
              <div className="label">Objection Statement</div>
              <div className="text">{objection.objectionText}</div>
            </div>

            {objection.attachments.length > 0 && (
              <>
                <div
                  className="section-title"
                  style={{ marginTop: "16px", marginBottom: "8px" }}
                >
                  <Lucide.Paperclip size={16} className="inline mr-1" /> Attachments
                </div>
                <div className="file-list">
                  {objection.attachments.map((a, i) => (
                    <div key={i} className="file-item">
                      <span className="file-icon"><Lucide.FileText size={14} /></span>
                      {a.name}{" "}
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--md-on-surface-variant)",
                          opacity: 0.6,
                          marginLeft: "8px",
                        }}
                      >
                        ({a.size})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {isResolved && objection.response && (
              <div className="response-section">
                <div className="section-title"><Lucide.Pin size={16} className="inline mr-1" /> Response</div>
                <div className="response-text">
                  <div className="label">
                    Response from {objection.respondedBy || "Administrator"}
                  </div>
                  <div className="text">{objection.response}</div>
                  {objection.responseDate && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--md-on-surface-variant)",
                        opacity: 0.6,
                        marginTop: "8px",
                      }}
                    >
                      Responded on {objection.responseDate}
                    </div>
                  )}
                </div>
              </div>
            )}

            {isActionable && (
              <div style={{ marginTop: "20px" }}>
                <div className="section-title"><Lucide.MessageSquare size={16} className="inline mr-1" /> Response</div>
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label
                    htmlFor="responseText"
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "var(--md-on-surface-variant)",
                      marginBottom: "4px",
                    }}
                  >
                    Enter your response <span className="required">*</span>
                  </label>
                  <textarea
                    id="responseText"
                    rows={4}
                    placeholder="Provide your decision and justification..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid rgba(121,116,126,0.25)",
                      background: "var(--md-surface-container-low)",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      color: "var(--md-on-surface)",
                      transition: "border 0.2s, box-shadow 0.2s",
                      outline: "none",
                      resize: "vertical",
                      minHeight: "80px",
                    }}
                  />
                  {responseError && (
                    <div
                      className="error-text"
                      style={{
                        fontSize: "12px",
                        color: "var(--md-error-text)",
                        marginTop: "4px",
                      }}
                    >
                      {responseError}
                    </div>
                  )}
                </div>

                <div className="action-bar">
                  <button
                    className="btn-approve"
                    onClick={handleApprove}
                    disabled={submitting}
                  >
                    <CheckCircle size={18} />{" "}
                    {submitting ? "Processing..." : "Approve"}
                  </button>
                  <button
                    className="btn-reject"
                    onClick={handleReject}
                    disabled={submitting}
                  >
                    <XCircle size={18} />{" "}
                    {submitting ? "Processing..." : "Reject"}
                  </button>
                </div>
              </div>
            )}

            {isResolved && !actionPerformed && (
              <div className="action-bar">
                <span className="btn-disabled" style={{ marginLeft: "auto" }}>
                  {objection.status === "Approved"
                    ? <><Lucide.CheckCircle size={16} className="inline mr-1" /> Approved</>
                    : <><Lucide.XCircle size={16} className="inline mr-1" /> Rejected</>}
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: "24px",
              fontSize: "13px",
              color: "var(--md-on-surface-variant)",
              opacity: 0.6,
              textAlign: "center",
              borderTop: "1px solid rgba(121,116,126,0.08)",
              paddingTop: "18px",
            }}
          >
            FCR-SCS · Objection Review · For Government Officers
          </div>
        </div>
      </main>
    </div>
  );
};
