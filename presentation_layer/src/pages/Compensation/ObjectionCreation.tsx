import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Send, X, File, Upload, ArrowLeft, Loader2 } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { Button } from "../../components/ui/Button";
import { Select, type SelectOption } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { CopyButton } from "../../components/ui/CopyButton";
import { IconButton } from "../../components/ui/IconButton";
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

const OBJECTION_TYPE_OPTIONS: SelectOption[] = [
  { value: "Form N", label: "Form N – Formal Objection" },
  { value: "Additional Evidence", label: "Additional Supporting Evidence" },
];

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
      setRequestedAmount(Math.round(chosen.offerAmount * 1.15));
    }
    if (errors.offer) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n.offer;
        return n;
      });
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
      console.error("Objection creation failed:", err);
      alert(`Submission failed: ${err.message}`);
      setSubmitting(false);
    }
  };

  const offerOptions: SelectOption[] = [
    { value: "", label: "— Choose an offer letter —" },
    ...offers.map((o) => ({
      value: o.offerId,
      label: `${o.caseTitle} — ${o.ownerName} (Offered: RM ${o.offerAmount.toLocaleString("en-MY")})`,
    })),
  ];

  if (submitted) {
    return (
      <div className="flex min-h-screen" style={{ background: "var(--md-background)", color: "var(--md-on-surface)" }}>
        <div className="main blur-shape-bg w-full p-6">
          <div className="objection-create">
            <div className="form-card text-center py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <Lucide.CheckCircle size={36} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Objection Submitted Successfully</h2>
              <p className="text-sm text-md-on-surface-variant max-w-md mx-auto mb-6">
                Your objection (Form N) has been officially recorded and queued for review by the compensation committee.
              </p>

              {createdId && (
                <div className="inline-flex items-center gap-2 p-3 bg-md-surface-container-high rounded-xl mb-6 font-mono text-sm">
                  <span className="text-md-on-surface-variant">Objection ID:</span>
                  <strong>{createdId}</strong>
                  <CopyButton value={createdId} />
                </div>
              )}

              <div className="flex justify-center gap-3">
                {createdId && (
                  <Button
                    variant="tonal"
                    onClick={() => navigate(`/admin/compensation/objection/review/${createdId}`, { state: { objectionId: createdId } })}
                  >
                    View Submitted Objection
                  </Button>
                )}
                <Button
                  variant="filled"
                  onClick={() => navigate("/admin/compensation/objection")}
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--md-background)", color: "var(--md-on-surface)" }}>
      <div className="main blur-shape-bg w-full p-6">
        <div className="objection-create">
          <div className="topbar" style={{ marginBottom: "20px" }}>
            <div className="topbar-left">
              <h1 style={{ marginBottom: 0 }}>Submit Objection</h1>
              <div className="sub">
                Form N – Formal Objection under Land Acquisition Act 1960
              </div>
            </div>
            <div className="topbar-right flex items-center gap-3">
              <Button variant="outlined" size="sm" onClick={() => navigate("/admin/compensation/objection")}>
                <ArrowLeft size={16} /> Back
              </Button>
              <div className="avatar">AO</div>
            </div>
          </div>

          <div className="form-card" style={{ background: "var(--md-surface-container)", padding: "24px", borderRadius: "16px" }}>
            <div className="form-title text-lg font-bold">Form N – Objection Submission</div>
            <div className="form-subtitle text-sm text-md-on-surface-variant mb-6">
              Submit your formal objection or additional evidence for review against a compensation award.
            </div>

            <div className="flex flex-col gap-5">
              <div>
                {loadingOffers ? (
                  <div style={{ padding: "10px", color: "var(--md-on-surface-variant)", fontSize: "14px" }}>
                    <Loader2 size={16} className="inline animate-spin mr-2" /> Loading offer letters...
                  </div>
                ) : (
                  <Select
                    label="Select Compensation Offer / Case *"
                    value={selectedOfferId}
                    options={offerOptions}
                    onChange={handleOfferSelect}
                    placeholder="— Choose an offer letter —"
                  />
                )}
                {errors.offer && <div className="text-xs text-md-error pl-2 mt-1">{errors.offer}</div>}
              </div>

              <div>
                <Input
                  label="Requested Compensation Amount (RM) *"
                  id="requestedAmount"
                  type="number"
                  placeholder="e.g. 550000"
                  value={requestedAmount === "" ? "" : String(requestedAmount)}
                  onChange={(e) => {
                    setRequestedAmount(e.target.value === "" ? "" : Number(e.target.value));
                    if (errors.amount) {
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.amount;
                        return n;
                      });
                    }
                  }}
                />
                {errors.amount && <div className="text-xs text-md-error pl-2 mt-1">{errors.amount}</div>}
              </div>

              <div>
                <Select
                  label="Objection Type"
                  value={objectionType}
                  options={OBJECTION_TYPE_OPTIONS}
                  onChange={(val) => setObjectionType(val)}
                />
              </div>

              <div>
                <Textarea
                  label="Objection Details & Justification *"
                  id="objectionText"
                  rows={6}
                  placeholder="Please provide detailed reasons for your objection. Include specific references to your case, valuation, or compensation offered..."
                  value={objectionText}
                  onChange={(e) => {
                    setObjectionText(e.target.value);
                    if (errors.text) {
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.text;
                        return n;
                      });
                    }
                  }}
                />
                {errors.text && <div className="text-xs text-md-error pl-2 mt-1">{errors.text}</div>}
                <div className="text-xs text-md-on-surface-variant opacity-70 pl-2 mt-1">
                  Minimum 20 characters. Be specific about your concerns.
                </div>
              </div>

              <div className="file-upload-section">
                <div className="file-title flex items-center gap-2 font-semibold text-sm mb-3">
                  <File size={18} /> Supporting Documents
                </div>
                {files.map((f) => (
                  <div key={f.id} className="file-item flex items-center justify-between p-2.5 rounded-xl bg-md-surface-container-low mb-2">
                    <span className="file-name text-sm font-medium">{f.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="file-size text-xs text-md-on-surface-variant">{f.size}</span>
                      <IconButton
                        title="Remove file"
                        size="sm"
                        variant="danger"
                        onClick={() => removeFile(f.id)}
                      >
                        <X size={16} />
                      </IconButton>
                    </div>
                  </div>
                ))}
                <label
                  className="upload-btn inline-flex items-center gap-2 px-4 py-2 rounded-full border border-md-outline/30 text-sm font-medium text-md-on-surface cursor-pointer hover:bg-md-primary/5 transition-colors"
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
                <div className="text-xs text-md-on-surface-variant opacity-70 mt-2">
                  Supported: PDF, JPEG, PNG, DOC, DOCX. Max 10MB each.
                </div>
              </div>

              <div className="actions flex items-center justify-end gap-3 pt-4 border-t border-md-outline/10">
                <Button
                  variant="text"
                  onClick={() => navigate("/admin/compensation/objection")}
                >
                  Cancel
                </Button>
                <Button
                  variant="filled"
                  onClick={handleSubmit}
                  isLoading={submitting}
                >
                  <Send size={18} /> Submit Objection
                </Button>
              </div>
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
