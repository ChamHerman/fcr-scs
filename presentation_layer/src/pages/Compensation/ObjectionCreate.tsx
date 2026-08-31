import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Send, X, File, ArrowLeft, Loader2 } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Select, type SelectOption } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { Textarea } from "../../components/ui/Textarea";
import { CopyButton } from "../../components/ui/CopyButton";
import { IconButton } from "../../components/ui/IconButton";
import { FileUpload } from "../../components/ui/FileUpload";
import { useRole } from "../../hooks/useRole";
import { useNotification } from "../../components/ui/NotificationSystem";
import "../../index.css";
import "./objection.css";

type OfferOption = {
  offerId: string;
  caseId: string;
  caseTitle: string;
  ownerName: string;
  offerAmount: number;
  isAcceptedWithinGrace?: boolean;
};

type FileAttachment = {
  id: string;
  name: string;
  size: string;
  file: File;
};

import { OBJECTION_FORM_TYPE_OPTIONS as OBJECTION_TYPE_OPTIONS } from "../../constants";

export const ObjectionCreate: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userId, isMember } = useRole();
  const { notify } = useNotification();
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    async function loadOffers() {
      setLoadingOffers(true);
      try {
        const activeMemberIc = isMember ? (user?.identificationNumber || "").trim() : undefined;
        const res = await compensationApi.getAllOfferLetters({
          ownerNric: activeMemberIc || undefined,
          limit: 1000,
        });

        const now = Date.now();
        const rawOffers = res.offerLetters || [];

        // Filter out offers where acceptance grace period (24 hours) has expired
        const validOffers = rawOffers.filter((o: any) => {
          // 1. Check member responses if user is a member
          const memberResponses = o.memberResponses || [];
          let userMemberResp = null;
          if (activeMemberIc) {
            const cleanUserIc = activeMemberIc.replace(/[^a-zA-Z0-9]/g, "");
            userMemberResp = memberResponses.find((mr: any) => {
              const oIc = (mr.landOwner?.nric || "").trim();
              const oClean = oIc.replace(/[^a-zA-Z0-9]/g, "");
              return oIc === activeMemberIc || (cleanUserIc && oClean === cleanUserIc);
            });
          }

          let isAccepted = false;
          let acceptanceTime: Date | null = null;

          if (userMemberResp && userMemberResp.status === "ACCEPTED") {
            isAccepted = true;
            acceptanceTime = userMemberResp.respondedAt
              ? new Date(userMemberResp.respondedAt)
              : o.acceptedAt
              ? new Date(o.acceptedAt)
              : null;
          } else if (o.status === "ACCEPTED" || o.acceptedAt) {
            isAccepted = true;
            acceptanceTime = o.acceptedAt
              ? new Date(o.acceptedAt)
              : userMemberResp?.respondedAt
              ? new Date(userMemberResp.respondedAt)
              : null;
          }

          if (isAccepted && acceptanceTime) {
            const diffHours = (now - acceptanceTime.getTime()) / (1000 * 60 * 60);
            // If already accepted and past the 24-hour grace period, DO NOT allow selection
            if (diffHours > 24) {
              return false;
            }
          }

          // Check if there is an active pending objection already created
          const hasPendingObjection = (o.objections || []).some(
            (obj: any) => obj.status === "PENDING"
          );
          if (hasPendingObjection) {
            return false;
          }

          return true;
        });

        const list: OfferOption[] = validOffers.map((o: any) => {
          let isAcceptedWithinGrace = false;
          const memberResponses = o.memberResponses || [];
          let userMemberResp = null;
          if (activeMemberIc) {
            const cleanUserIc = activeMemberIc.replace(/[^a-zA-Z0-9]/g, "");
            userMemberResp = memberResponses.find((mr: any) => {
              const oIc = (mr.landOwner?.nric || "").trim();
              const oClean = oIc.replace(/[^a-zA-Z0-9]/g, "");
              return oIc === activeMemberIc || (cleanUserIc && oClean === cleanUserIc);
            });
          }

          if (userMemberResp && userMemberResp.status === "ACCEPTED") {
            isAcceptedWithinGrace = true;
          } else if (o.status === "ACCEPTED" || o.acceptedAt) {
            isAcceptedWithinGrace = true;
          }

          return {
            offerId: o.offerId,
            caseId: o.caseId,
            caseTitle: o.acquisitionCase?.caseTitle || "Unknown Case",
            ownerName: o.landOwnership?.landOwner?.name || "Unknown Owner",
            offerAmount: Number(o.offerAmount || 0),
            isAcceptedWithinGrace,
          };
        });

        setOffers(list);

        if (paramOfferId) {
          const match = list.find((item) => item.offerId === paramOfferId);
          if (match) {
            setSelectedOfferId(match.offerId);
            setRequestedAmount(Math.round(match.offerAmount * 1.15));
          } else {
            // Check if paramOfferId was excluded due to expired grace period
            const rawMatch = rawOffers.find((item: any) => item.offerId === paramOfferId);
            if (rawMatch) {
              notify({
                type: "general",
                title: "Grace Period Expired",
                message: "The 24-hour grace period for this accepted offer letter has expired. Objections cannot be submitted.",
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch offer letters:", err);
      } finally {
        setLoadingOffers(false);
      }
    }

    loadOffers();
  }, [paramOfferId, isMember, user?.identificationNumber]);

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

  const handleFileListUpload = (fileList: FileList) => {
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > 10 * 1024 * 1024) {
        notify({
          type: "error",
          title: "File Too Large",
          message: `${file.name} exceeds 10MB limit.`,
        });
        continue;
      }
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
      setFiles((prev) => [
        ...prev,
        {
          id: Date.now().toString() + i + Math.random().toString(36).substring(2, 5),
          name: file.name,
          size: `${sizeInMB} MB`,
          file: file,
        },
      ]);
    }
  };

  const handleSingleFileUpload = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      notify({
        type: "error",
        title: "File Too Large",
        message: `${file.name} exceeds 10MB limit.`,
      });
      return;
    }
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    setFiles((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        name: file.name,
        size: `${sizeInMB} MB`,
        file: file,
      },
    ]);
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

  const handlePreSubmit = () => {
    if (!validate()) return;
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    const selectedOffer = offers.find((o) => o.offerId === selectedOfferId);
    if (!selectedOffer) {
      notify({
        type: 'error',
        title: 'Invalid Selection',
        message: 'Invalid offer selected.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await compensationApi.createObjection({
        offerId: selectedOffer.offerId,
        caseId: selectedOffer.caseId,
        objectionReason: objectionText,
        requestedAmount: Number(requestedAmount),
        createdById: userId,
      });

      const newObjectionId = res.objection?.objectionId;
      setCreatedId(newObjectionId || null);
      setSubmitting(false);
      setSubmitted(true);
    } catch (err: any) {
      console.error("Objection creation failed:", err);
      notify({
        type: 'error',
        title: 'Submission Failed',
        message: err.message,
      });
      setSubmitting(false);
    }
  };

  const offerOptions: SelectOption[] = [
    { value: "", label: "— Choose an offer letter —" },
    ...offers.map((o) => ({
      value: o.offerId,
      label: `${o.caseTitle} — ${o.ownerName} (Offered: RM ${o.offerAmount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${
        o.isAcceptedWithinGrace ? " · Accepted (within 24h grace window)" : ""
      })`,
    })),
  ];

  const selectedOffer = offers.find((o) => o.offerId === selectedOfferId);
  const offeredAmount = selectedOffer?.offerAmount || 0;
  const varianceAmount =
    typeof requestedAmount === "number" && offeredAmount > 0
      ? requestedAmount - offeredAmount
      : 0;
  const variancePct =
    typeof requestedAmount === "number" && offeredAmount > 0
      ? ((requestedAmount - offeredAmount) / offeredAmount) * 100
      : 0;

  if (submitted) {
    return (
      <div className="main blur-shape-bg">
        <div className="bg-md-surface-container p-8 md:p-12 rounded-2xl shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-5">
            <Lucide.CheckCircle size={36} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Objection Submitted Successfully</h2>
          <p className="text-sm text-md-on-surface-variant max-w-md mx-auto mb-6 leading-relaxed">
            Your formal Form N objection has been officially recorded in the system. The assigned Government Officer will evaluate your justification and proposed compensation revision.
          </p>

          {createdId && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-md-surface-container-high rounded-xl mb-8 font-mono text-sm border border-md-outline/10">
              <span className="text-md-on-surface-variant">Objection ID:</span>
              <strong className="text-md-primary">{createdId}</strong>
              <CopyButton value={createdId} />
            </div>
          )}

          <div className="flex justify-center gap-3 flex-wrap">
            {createdId && (
              <Button
                variant="tonal"
                onClick={() => navigate(`/admin/compensation/objection/review/${createdId}`, { state: { objectionId: createdId } })}
              >
                <Lucide.Eye size={16} /> View Objection
              </Button>
            )}
            <Button variant="filled" onClick={() => navigate("/admin/compensation/objection")}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main blur-shape-bg">
      <div className="w-full">
        {/* Topbar */}
        <div className="topbar flex justify-between items-center mb-6 flex-wrap gap-4">
          <div className="topbar-left">
            <h1 className="text-2xl font-bold mb-1">Create New Objection</h1>
            <div className="text-xs md:text-sm text-md-on-surface-variant">
              Land Acquisition Act 1960 — Section 37 Dispute Settlement
            </div>
          </div>
          <div className="topbar-right flex items-center gap-3">
            <Button variant="outlined" size="sm" onClick={() => navigate("/admin/compensation/objection")}>
              <ArrowLeft size={16} /> Back
            </Button>
            <span className="date-badge">
              <Lucide.Calendar size={16} className="inline mr-1" />
              {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <div
              className="avatar"
              title={user ? `${user.name} (${user.role.replace(/_/g, " ")})` : "User"}
            >
              {user?.name ? (
                <span className="text-xs font-bold uppercase">
                  {user.name
                    .split(/\s+/)
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join("")}
                </span>
              ) : (
                <Lucide.User size={16} />
              )}
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-md-surface-container p-6 md:p-8 rounded-2xl shadow-sm mb-6">
          <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-md-outline/10">
            <div className="w-9 h-9 rounded-xl bg-md-primary/10 text-md-primary flex items-center justify-center">
              <Lucide.AlertCircle size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Formal Objection Entry</h2>
              <p className="text-xs text-md-on-surface-variant">
                Disagreement with awarded compensation or measurement terms
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Offer Selector */}
            <div>
              {loadingOffers ? (
                <div className="p-4 bg-md-surface-container-low rounded-xl text-center text-sm text-md-on-surface-variant">
                  <Loader2 size={18} className="inline animate-spin mr-2" /> Loading active offer letters...
                </div>
              ) : (
                <Select
                  label="Select Compensation Offer / Case *"
                  value={selectedOfferId}
                  options={offerOptions}
                  error={errors.offer}
                  onChange={handleOfferSelect}
                  placeholder="— Choose an offer letter to object against —"
                />
              )}
            </div>

            {/* Selected Offer Details Preview Card */}
            {selectedOffer && (
              <div className="p-4 md:p-5 rounded-2xl bg-md-surface-container-low border border-md-outline/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-md-on-surface-variant font-medium">Acquisition Case</span>
                  <div className="text-sm font-bold mt-0.5">{selectedOffer.caseTitle}</div>
                  <span className="font-mono text-xs text-md-on-surface-variant">{selectedOffer.caseId}</span>
                </div>
                <div>
                  <span className="text-xs text-md-on-surface-variant font-medium">Registered Land Owner</span>
                  <div className="text-sm font-bold mt-0.5">{selectedOffer.ownerName}</div>
                </div>
                <div>
                  <span className="text-xs text-md-on-surface-variant font-medium">Form H Offered Award</span>
                  <div className="text-base font-bold text-md-primary mt-0.5">
                    RM {selectedOffer.offerAmount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}

            {/* Amount & Type Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <CurrencyInput
                  label="Proposed / Requested Amount (RM) *"
                  id="requestedAmount"
                  placeholder="0.00"
                  value={requestedAmount}
                  error={errors.amount}
                  onValueChange={(_formatted, num) => {
                    setRequestedAmount(num > 0 ? num : "");
                    if (errors.amount) {
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.amount;
                        return n;
                      });
                    }
                  }}
                />

                {offeredAmount > 0 && typeof requestedAmount === "number" && requestedAmount > 0 && (
                  <div className="mt-2 text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-md-primary/5 text-md-primary font-medium">
                    <span>Variance:</span>
                    <strong>
                      {varianceAmount >= 0 ? "+" : ""}RM {varianceAmount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({variancePct >= 0 ? "+" : ""}{variancePct.toFixed(1)}%)
                    </strong>
                  </div>
                )}
              </div>

              <div>
                <Select
                  label="Objection Form Classification"
                  value={objectionType}
                  options={OBJECTION_TYPE_OPTIONS}
                  onChange={(val) => setObjectionType(val)}
                />
              </div>
            </div>

            {/* Objection Statement Textarea */}
            <div>
              <Textarea
                label="Objection Statement & Legal Grounds *"
                id="objectionText"
                rows={6}
                placeholder="Provide comprehensive details justifying your objection. Include specific references to comparable market valuations, property improvements, loss of earnings, or surveyor discrepancy..."
                value={objectionText}
                error={errors.text}
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
              <div className="flex justify-between items-center text-xs text-md-on-surface-variant mt-1.5 px-3">
                <span>Minimum 20 characters required.</span>
                <span className={objectionText.length >= 20 ? "text-emerald-600 font-semibold" : "opacity-60"}>
                  {objectionText.length} characters
                </span>
              </div>
            </div>

            {/* Supporting Evidence File Upload */}
            <div className="p-5 rounded-2xl bg-md-surface-container-low border border-md-outline/10 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <File size={18} className="text-md-primary" /> Supporting Documents & Evidence
              </div>

              <FileUpload
                id="objectionEvidence"
                label="Attach Supporting Documents (Optional)"
                placeholder="Choose file to attach (PDF, JPG, PNG, DOC, DOCX)"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                multiple
                fileName={files.length === 1 ? files[0].name : undefined}
                onClear={files.length === 1 ? () => setFiles([]) : undefined}
                onChange={(file, e) => {
                  const fileList = e?.target.files;
                  if (fileList && fileList.length > 0) {
                    handleFileListUpload(fileList);
                  } else if (file) {
                    handleSingleFileUpload(file);
                  }
                }}
              />

              {files.length === 0 ? (
                <p className="text-xs text-md-on-surface-variant opacity-70">
                  No attachments uploaded. (Optional: Attach private valuer report, photographs, or official title deeds).
                </p>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="text-xs font-semibold text-md-on-surface-variant flex items-center justify-between">
                    <span>Attached Files ({files.length})</span>
                    {files.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFiles([])}
                        className="text-red-600 hover:underline text-[11px]"
                      >
                        Remove All
                      </button>
                    )}
                  </div>
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-md-surface-container text-xs border border-md-outline/10"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Lucide.FileText size={16} className="text-md-primary flex-shrink-0" />
                        <span className="font-medium truncate">{f.name}</span>
                        <span className="opacity-60 flex-shrink-0">({f.size})</span>
                      </div>
                      <IconButton
                        title="Remove file"
                        size="sm"
                        variant="danger"
                        onClick={() => removeFile(f.id)}
                      >
                        <X size={14} />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-[11px] text-md-on-surface-variant opacity-60">
                Supported formats: PDF, JPEG, PNG, DOC, DOCX. Max 10MB per file.
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-md-outline/10">
              <Button
                variant="text"
                onClick={() => navigate("/admin/compensation/objection")}
              >
                Cancel
              </Button>
              <Button
                variant="filled"
                onClick={handlePreSubmit}
                isLoading={submitting}
              >
                <Send size={16} /> Submit Objection (Form N)
              </Button>
            </div>
          </div>
        </div>

        {/* Modal to confirm submitting objection */}
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Confirm Objection Submission"
          subtitle="Please review the impact on your compensation offer status"
          footer={
            <>
              <Button variant="text" onClick={() => setShowConfirmModal(false)}>
                Go Back
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmSubmit}
                isLoading={submitting}
              >
                <Lucide.AlertTriangle size={16} /> Yes, Submit Objection & Reject Offer
              </Button>
            </>
          }
        >
          <div className="space-y-3 py-2 text-sm text-md-on-surface-variant">
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-900 dark:text-amber-200">
              <div className="font-bold flex items-center gap-2 mb-1 text-amber-700 dark:text-amber-300">
                <Lucide.AlertCircle size={18} /> Important Notice on Offer Status
              </div>
              <p className="text-xs leading-relaxed">
                Submitting a formal Form N objection indicates that you dispute the current compensation assessment.
              </p>
              <p className="text-xs font-semibold mt-2">
                Once submitted, the offer letter status will automatically become <strong>"Rejected"</strong>, and the acquisition case status will change to <strong>"OFFER_REJECTED"</strong> while the Valuation & Compensation department reviews your requested amount.
              </p>
            </div>
            <p className="text-xs text-md-on-surface-variant/80">
              If the Government Officer approves your objection, a revised compensation offer will be generated for your re-approval.
            </p>
          </div>
        </Modal>

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
          FCR-SCS · Objection Form (Form N) · For Displaced Community Members
        </div>
      </div>
    </div>
  );
};

export const CreateObjection = ObjectionCreate;
