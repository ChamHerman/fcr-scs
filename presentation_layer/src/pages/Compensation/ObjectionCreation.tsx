import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, X, File, Upload } from "lucide-react";
import "../../style.css";
import "./objection.css";
import { Sidebar } from "../Shared";

type CaseOption = {
  id: string;
  title: string;
};

const mockCases: CaseOption[] = [
  { id: "LAC-2026-07-0024", title: "Kampung Baru Land Acquisition" },
  { id: "LAC-2026-07-0023", title: "Taman Mewah Phase 2" },
  { id: "LAC-2026-07-0021", title: "Desa Harmoni Relocation" },
];

type FileAttachment = {
  id: string;
  name: string;
  size: string;
  file: File;
};

export const CreateObjection: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCase, setSelectedCase] = useState("");
  const [objectionType, setObjectionType] = useState("Form N");
  const [objectionText, setObjectionText] = useState("");
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
    if (!selectedCase) newErrors.case = "Please select a case.";
    if (!objectionText.trim())
      newErrors.text = "Please enter your objection details.";
    if (objectionText.trim().length < 20)
      newErrors.text = "Please provide at least 20 characters.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      // In real app, API call here
      console.log("Objection submitted:", {
        selectedCase,
        objectionType,
        objectionText,
        files,
      });
    }, 1500);
  };

  const handleReset = () => {
    setSelectedCase("");
    setObjectionType("Form N");
    setObjectionText("");
    setFiles([]);
    setErrors({});
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div
        className="flex min-h-screen"
        style={{ background: "#f8f5fa", color: "#1c1b1f" }}
      >
        <Sidebar />
        <main className="main blur-shape-bg">
          <div className="objection-create">
            <div className="topbar" style={{ marginBottom: "20px" }}>
              <div className="topbar-left">
                <h1 style={{ marginBottom: 0 }}>Submit Objection</h1>
                <div className="sub">Form N – Formal Objection</div>
              </div>
              <div className="topbar-right">
                <span className="date-badge">📅 24 Jul 2026</span>
                <div className="avatar">AB</div>
              </div>
            </div>
            <div className="form-card">
              <div className="success-banner">
                <span className="check-icon">✅</span>
                <div>
                  <strong>Objection submitted successfully!</strong>
                  <span style={{ marginLeft: "12px", fontWeight: 400 }}>
                    The assigned Government Officer has been notified.
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
                  You will be notified once a decision is made.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                    marginTop: "16px",
                  }}
                >
                  <button
                    className="btn-cancel"
                    onClick={handleReset}
                    style={{
                      padding: "10px 28px",
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
                    onClick={() => navigate("/compensation/objection")}
                    style={{
                      padding: "10px 32px",
                      borderRadius: "var(--radius-full)",
                      border: "none",
                      background: "var(--md-primary)",
                      color: "white",
                      fontWeight: "600",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      cursor: "pointer",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "#f8f5fa", color: "#1c1b1f" }}
    >
      <Sidebar />

      <main className="main blur-shape-bg">
        <div className="objection-create">
          <div className="topbar" style={{ marginBottom: "20px" }}>
            <div className="topbar-left">
              <h1 style={{ marginBottom: 0 }}>Submit Objection</h1>
              <div className="sub">
                Form N – Formal Objection under Land Acquisition Act 1960
              </div>
            </div>
            <div className="topbar-right">
              <span className="date-badge">📅 24 Jul 2026</span>
              <div className="avatar">AB</div>
            </div>
          </div>

          <div className="form-card">
            <div className="form-title">Form N – Objection</div>
            <div className="form-subtitle">
              Submit your formal objection or additional evidence for review.
            </div>

            <div className="case-selector">
              <label htmlFor="caseSelect">
                Select Acquisition Case <span className="required">*</span>
              </label>
              <select
                id="caseSelect"
                value={selectedCase}
                onChange={(e) => setSelectedCase(e.target.value)}
                className={errors.case ? "error" : ""}
              >
                <option value="">— Choose a case —</option>
                {mockCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} – {c.title}
                  </option>
                ))}
              </select>
              {errors.case && <div className="error-text">{errors.case}</div>}
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
                Objection Details <span className="required">*</span>
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
                onClick={() => navigate("/compensation/objection")}
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
      </main>
    </div>
  );
};
