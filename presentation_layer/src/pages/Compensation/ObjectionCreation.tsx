import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Send, X, File, Upload, ArrowLeft, Loader2 } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import "../../style.css";
import "./objection.css";

type OfferOption = {
  offerId: string;
  caseId: string;
  caseTitle: string;
  ownerName: string;
  offerAmount: number;
};

type FileAttachment = {
  id: string;
  name: string;
  size: string;
  file: File;
};

export const CreateObjection: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramOfferId = searchParams.get("offerId") || "";

  const [offers, setOffers] = useState<OfferOption[]>([]);
  const [loadingOffers, setLoadingOffers] = useState<boolean>(true);

  const [selectedOfferId, setSelectedOfferId] = useState<string>(paramOfferId);
  const [objectionType, setObjectionType] = useState("Form N");
  const [requestedAmount, setRequestedAmount] = useState<number | "">("");
  const [objectionText, setObjectionText] = useState("");
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    async function loadOffers() {
      setLoadingOffers(true);
      try {
        const res = await compensationApi.getAllOfferLetters();
        const list: OfferOption[] = (res.offerLetters || []).map((o: any) => ({
          offerId: o.offerId,
          caseId: o.caseId,
          caseTitle: o.acquisitionCase?.caseTitle || "Unknown Case",
          ownerName: o.landOwnership?.landOwner?.name || "Unknown Owner",
          offerAmount: Number(o.offerAmount || 0),
        }));
        setOffers(list);

        if (paramOfferId && list.some((item) => item.offerId === paramOfferId)) {
          const match = list.find((item) => item.offerId === paramOfferId);
          if (match) {
            setRequestedAmount(Math.round(match.offerAmount * 1.15));
          }
        }
      } catch (err) {
        console.error("Failed to fetch offer letters:", err);
      } finally {
        setLoadingOffers(false);
      }
    }
    loadOffers();
  }, [paramOfferId]);

  const handleOfferSelect = (offerId: string) => {
    setSelectedOfferId(offerId);
    const chosen = offers.find((o) => o.offerId === offerId);
    if (chosen) {
      // Suggest default requested amount (15% higher than offer amount)
      setRequestedAmount(Math.round(chosen.offerAmount * 1.15));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > 10 * 1024 * 1024) {
        alert("File size exceeds 10MB limit.");
        continue;
      }
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
      setFiles((prev) => [
        ...prev,
        {
          id: Date.now().toString() + i,
          name: file.name,
          size: `${sizeInMB} MB`,
          file: file,
        },
      ]);
    }
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!selectedOfferId) newErrors.offer = "Please select an offer letter / case.";
    if (!requestedAmount || Number(requestedAmount) <= 0)
      newErrors.amount = "Please enter a valid requested amount (> 0).";
    if (!objectionText.trim())
      newErrors.text = "Please enter your objection details.";
    if (objectionText.trim().length < 20)
      newErrors.text = "Please provide at least 20 characters of detail.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const selectedOffer = offers.find((o) => o.offerId === selectedOfferId);
    if (!selectedOffer) {
      alert("Invalid offer selected.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await compensationApi.createObjection({
        offerId: selectedOffer.offerId,
        caseId: selectedOffer.caseId,
        objectionReason: objectionText,
        requestedAmount: Number(requestedAmount),
      });

      const newObjectionId = res.objection?.objectionId;
      setCreatedId(newObjectionId || null);
      setSubmitting(false);
      setSubmitted(true);
    } catch (err: any) {
      console.error("Submission failed:", err);
      alert(`Submission failed: ${err.message || err}`);
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedOfferId("");
    setObjectionType("Form N");
    setRequestedAmount("");
    setObjectionText("");
    setFiles([]);
    setErrors({});
    setSubmitted(false);
    setCreatedId(null);
  };

  if (submitted) {
    return (
      <div>
        <div className="main blur-shape-bg">
          <div className="objection-create">
            <div className="topbar" style={{ marginBottom: "20px" }}>
              <div className="topbar-left">
                <h1 style={{ marginBottom: 0 }}>Submit Objection</h1>
                <div className="sub">Form N – Formal Objection</div>
              </div>
              <div className="topbar-right">
                <span className="date-badge"><Lucide.Calendar size={16} className="inline" /> {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                <div className="avatar">AO</div>
              </div>
            </div>
            <div className="form-card">
              <div className="success-banner">
                <span className="check-icon"><Lucide.CheckCircle size={16} className="inline" /></span>
                <div>
                  <strong>Objection submitted successfully!</strong>
                  <span style={{ marginLeft: "12px", fontWeight: 400 }}>
                    The objection record has been saved to the database.
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--md-on-surface-variant)",
                  }}
                >
                  Your objection (Form N) has been submitted for review.
                  <br />
                  You will be notified once a decision is made by the Government Officer.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                    marginTop: "16px",
                  }}
                >
                  {createdId && (
                    <button
                      className="btn-submit"
                      onClick={() => navigate(`/admin/compensation/objection/review/${createdId}`)}
                      style={{
                        padding: "10px 24px",
                        borderRadius: "var(--radius-full)",
                        border: "none",
                        background: "var(--md-primary)",
                        color: "white",
                        fontWeight: "600",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      View Submission
                    </button>
                  )}
                  <button
                    className="btn-cancel"
                    onClick={handleReset}
                    style={{
                      padding: "10px 24px",
                      borderRadius: "var(--radius-full)",
                      border: "1.5px solid rgba(121,116,126,0.25)",
                      background: "transparent",
                      fontWeight: "500",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      color: "var(--md-on-surface-variant)",
                      cursor: "pointer",
                    }}
                  >
                    Submit Another
                  </button>
                  <button
                    className="btn-submit"
                    onClick={() => navigate('/admin/compensation/objection')}
                    style={{
                      padding: "10px 24px",
                      borderRadius: "var(--radius-full)",
                      border: "none",
                      background: "rgba(121,116,126,0.2)",
                      color: "var(--md-on-surface)",
                      fontWeight: "600",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="main blur-shape-bg">
        <div className="objection-create">
          <div className="topbar" style={{ marginBottom: "20px" }}>
            <div className="topbar-left">
              <h1 style={{ marginBottom: 0 }}>Submit Objection</h1>
              <div className="sub">
                Form N – Formal Objection under Land Acquisition Act 1960
              </div>
            </div>
            <div className="topbar-right" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button className="btn-outline" onClick={() => navigate('/admin/compensation/objection')}>
                <ArrowLeft size={16} className="inline mr-1" /> Back
              </button>
              <div className="avatar">AO</div>
            </div>
          </div>

          <div className="form-card">
            <div className="form-title">Form N – Objection Submission</div>
            <div className="form-subtitle">
              Submit your formal objection or additional evidence for review against a compensation award.
            </div>

            <div className="case-selector">
              <label htmlFor="offerSelect">
                Select Compensation Offer / Case <span className="required">*</span>
              </label>
              {loadingOffers ? (
                <div style={{ padding: "10px", color: "var(--md-on-surface-variant)", fontSize: "14px" }}>
                  <Loader2 size={16} className="inline animate-spin mr-2" /> Loading offer letters...
                </div>
              ) : (
                <select
                  id="offerSelect"
                  value={selectedOfferId}
                  onChange={(e) => handleOfferSelect(e.target.value)}
                  className={errors.offer ? "error" : ""}
                >
                  <option value="">— Choose an offer letter —</option>
                  {offers.map((o) => (
                    <option key={o.offerId} value={o.offerId}>
                      {o.caseTitle} — {o.ownerName} (Offered: RM {o.offerAmount.toLocaleString("en-MY")})
                    </option>
                  ))}
                </select>
              )}
              {errors.offer && <div className="error-text">{errors.offer}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="requestedAmount">
                Requested Compensation Amount (RM) <span className="required">*</span>
              </label>
              <input
                id="requestedAmount"
                type="number"
                placeholder="e.g. 550000"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className={errors.amount ? "error" : ""}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "1.5px solid rgba(121,116,126,0.25)",
                  background: "var(--md-surface-container-low)",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  color: "var(--md-on-surface)",
                }}
              />
              {errors.amount && <div className="error-text">{errors.amount}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="objectionType">Objection Type</label>
              <select
                id="objectionType"
                value={objectionType}
                onChange={(e) => setObjectionType(e.target.value)}
              >
                <option value="Form N">Form N – Formal Objection</option>
                <option value="Additional Evidence">
                  Additional Supporting Evidence
                </option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="objectionText">
                Objection Details & Justification <span className="required">*</span>
              </label>
              <textarea
                id="objectionText"
                rows={6}
                placeholder="Please provide detailed reasons for your objection. Include specific references to your case, valuation, or compensation offered..."
                value={objectionText}
                onChange={(e) => setObjectionText(e.target.value)}
                className={errors.text ? "error" : ""}
              />
              {errors.text && <div className="error-text">{errors.text}</div>}
              <div className="helper-text">
                Minimum 20 characters. Be specific about your concerns.
              </div>
            </div>

            <div className="file-upload-section">
              <div className="file-title">
                <File size={18} /> Supporting Documents
              </div>
              {files.map((f) => (
                <div key={f.id} className="file-item">
                  <span className="file-name">{f.name}</span>
                  <span className="file-size">{f.size}</span>
                  <button
                    className="btn-remove"
                    onClick={() => removeFile(f.id)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <label
                className="upload-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  borderRadius: "var(--radius-full)",
                  border: "1.5px solid rgba(121,116,126,0.25)",
                  background: "transparent",
                  fontSize: "13px",
                  fontWeight: "500",
                  fontFamily: "inherit",
                  color: "var(--md-on-surface-variant)",
                  cursor: "pointer",
                }}
              >
                <Upload size={16} /> Upload Document
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </label>
              <div className="helper-text" style={{ marginTop: "8px" }}>
                Supported: PDF, JPEG, PNG, DOC, DOCX. Max 10MB each.
              </div>
            </div>

            <div className="actions">
              <button
                className="btn-cancel"
                onClick={() => navigate('/admin/compensation/objection')}
              >
                Cancel
              </button>
              <button
                className="btn-submit"
                onClick={handleSubmit}
                disabled={submitting}
              >
                <Send size={18} />{" "}
                {submitting ? "Submitting..." : "Submit Objection"}
              </button>
            </div>
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
            FCR-SCS · Objection Form · For Displaced Community Members
          </div>
        </div>
      </div>
    </div>
  );
};

