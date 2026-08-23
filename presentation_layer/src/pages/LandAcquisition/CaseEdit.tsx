import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { CaseForm } from "../../components/CaseForm";
import type { CaseFormData, Owner, Document } from "../../components/CaseForm";
import { Button } from "../../components/ui/Button";

/**
 * CaseEdit – Handles both:
 *   1. Whole-case edit  (no ?section param)  → navigates through all 4 steps
 *   2. Section-only edit (?section=project/land/owners/documents) → locked to that step
 *
 * Update strategy mirrors CaseRegistration (create):
 *   - Section edits call the dedicated /project, /land, /owners endpoints
 *   - Whole-case edit calls each section endpoint sequentially (same as create flow)
 */
export const CaseEdit: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ caseId?: string }>();
  const [searchParams] = useSearchParams();

  // Resolve caseId from URL param or navigation state
  const caseId = params.caseId || location.state?.caseId;

  // Resolve target section (e.g. "project", "land", "owners", "documents")
  const sectionParam =
    searchParams.get("section") || location.state?.section || null;

  // Map section names → step indices
  const sectionToStep: Record<string, number> = {
    project: 0,
    land: 1,
    owners: 2,
    owner: 2,
    documents: 3,
    document: 3,
  };

  const initialStep =
    sectionParam && sectionToStep[sectionParam] !== undefined
      ? sectionToStep[sectionParam]
      : 0;

  // ── Component State ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialValues, setInitialValues] = useState<{
    formData: CaseFormData;
    owners: Owner[];
    documents: Document[];
  } | null>(null);

  // ── Load existing case data ──────────────────────────────────────────────
  useEffect(() => {
    if (!caseId) {
      setLoadError("No Case ID provided. Please navigate from the Case Details page.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchCase = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await landAcquisitionApi.getCaseById(caseId);
        if (cancelled) return;

        const c = res.case;
        if (!c) throw new Error("Case record was not found in the response.");

        const project = c.project || {};
        const land = c.landParcel || {};
        const ownerships: any[] = land.ownerships || [];
        const docs: any[] = c.caseDocuments || [];

        const formData: CaseFormData = {
          projectName: project.projectName || "",
          projectType: project.projectType || "",
          projectPurpose: project.purpose || "",
          projectBudget: project.budget != null ? String(project.budget) : "",
          fundingSource: project.fundingSource || "",
          landTitleNumber: land.landTitleNo || "",
          lotNumber: land.lotNo || "",
          mukim: land.mukim || "",
          district: land.district || "",
          state: land.state || "",
          landArea: land.area != null ? String(land.area) : "",
          landCategory: land.category || "",
          gpsLatitude: land.latitude != null ? String(land.latitude) : "",
          gpsLongitude: land.longitude != null ? String(land.longitude) : "",
        };

        const owners: Owner[] = ownerships.length > 0
          ? ownerships.map((o: any, idx: number) => ({
              id: o.landOwner?.ownerId || String(idx + 1),
              name: o.landOwner?.name || "",
              icNumber: o.landOwner?.nric || "",
              address: o.landOwner?.address || "",
              phone: o.landOwner?.contact || "",
              ownershipType: o.ownershipType || "Individual",
            }))
          : [{ id: "1", name: "", icNumber: "", address: "", phone: "", ownershipType: "" }];

        const documents: Document[] = docs.length > 0
          ? docs.map((d: any, idx: number) => ({
              id: d.documentId || String(idx + 1),
              type: d.documentType || "Supporting Document",
              file: null,
              fileName: d.fileName || "Uploaded Document",
            }))
          : [{ id: "1", type: "", file: null, fileName: "" }];

        setInitialValues({ formData, owners, documents });
      } catch (err: any) {
        if (!cancelled) {
          console.error("[CaseEdit] Failed to load case:", err);
          setLoadError(err.message || "Failed to load case details. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCase();
    return () => { cancelled = true; };
  }, [caseId]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const parseNum = (val: any): number | undefined => {
    if (val === undefined || val === null || val === "") return undefined;
    const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
    return isNaN(n) ? undefined : n;
  };

  // ── Submit Handler ────────────────────────────────────────────────────────
  /**
   * Mirrors CaseRegistration.handleSubmit but for updates:
   *   - Section edit  → call the single matching section endpoint
   *   - Whole-case    → call project + land + owners sequentially, then upload any new docs
   */
  const handleUpdateSubmit = async (data: {
    formData: CaseFormData;
    owners: Owner[];
    documents: Document[];
  }) => {
    if (!caseId) return;
    setIsSubmitting(true);

    // Build canonical payloads (matching what the backend service expects)
    const projectPayload = {
      projectName: data.formData.projectName,
      projectType: data.formData.projectType,
      purpose: data.formData.projectPurpose,
      budget: parseNum(data.formData.projectBudget),
      fundingSource: data.formData.fundingSource,
    };

    const landPayload = {
      landTitleNo: data.formData.landTitleNumber,
      lotNo: data.formData.lotNumber,
      mukim: data.formData.mukim,
      district: data.formData.district,
      state: data.formData.state,
      area: parseNum(data.formData.landArea),
      category: data.formData.landCategory,
      latitude: parseNum(data.formData.gpsLatitude),
      longitude: parseNum(data.formData.gpsLongitude),
    };

    const ownersPayload = data.owners.map((o) => ({
      name: o.name,
      nric: o.icNumber,
      address: o.address,
      contact: o.phone,
      ownershipType: o.ownershipType || "Individual",
    }));

    try {
      // ── Section-only edit ─────────────────────────────────────────────────
      if (sectionParam === "project") {
        await landAcquisitionApi.updateProjectInfo(caseId, projectPayload);
      } else if (sectionParam === "land") {
        await landAcquisitionApi.updateLandInfo(caseId, landPayload);
      } else if (sectionParam === "owners" || sectionParam === "owner") {
        await landAcquisitionApi.updateOwnerInfo(caseId, ownersPayload);
      } else if (sectionParam === "documents" || sectionParam === "document") {
        // Document section: only upload NEW files (those with a File object)
        const newDocs = data.documents.filter((d) => d.file && d.type);
        if (newDocs.length === 0) {
          alert("No new documents selected. Please choose a file to upload.");
          setIsSubmitting(false);
          return;
        }
        for (const doc of newDocs) {
          await landAcquisitionApi.uploadDocument(caseId, doc.file!, doc.type);
        }
      } else {
        // ── Whole-case edit: update each section sequentially ───────────────
        await landAcquisitionApi.updateProjectInfo(caseId, projectPayload);
        await landAcquisitionApi.updateLandInfo(caseId, landPayload);
        await landAcquisitionApi.updateOwnerInfo(caseId, ownersPayload);

        // Upload only new documents (ones with a File object attached)
        const newDocs = data.documents.filter((d) => d.file && d.type);
        for (const doc of newDocs) {
          try {
            await landAcquisitionApi.uploadDocument(caseId, doc.file!, doc.type);
          } catch (docErr: any) {
            console.warn("[CaseEdit] Document upload warning:", docErr.message);
          }
        }
      }

      // ── Navigate back to case details with a success highlight ────────────
      const updatedSection = sectionParam || "project";
      alert(`Case updated successfully!\nCase ID: ${caseId}`);
      navigate("/admin/case/details", {
        state: { caseId, updatedSection },
      });
    } catch (err: any) {
      console.error("[CaseEdit] Update failed:", err);
      alert(`Update Failed: ${err.message || "Could not update case. Please try again."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render: Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-md-background">
        <div className="text-center p-8 bg-md-surface-container rounded-2xl shadow-sm border border-md-outline/10">
          <div className="animate-spin w-8 h-8 border-4 border-md-primary border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-lg font-semibold text-md-on-surface mb-2">Loading Case Details…</div>
          <div className="text-sm text-md-on-surface-variant">Please wait while we fetch the record.</div>
        </div>
      </div>
    );
  }

  // ── Render: Load Error ────────────────────────────────────────────────────
  if (loadError || !initialValues) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-md-background">
        <div className="text-center p-8 bg-md-surface-container rounded-2xl shadow-sm border border-md-outline/10 max-w-md">
          <div className="text-lg font-semibold text-md-error mb-2">Error Loading Case</div>
          <div className="text-sm text-md-on-surface-variant mb-6">
            {loadError || "Case details could not be loaded."}
          </div>
          <Button
            onClick={() => navigate("/admin/case")}
            variant="filled"
          >
            Return to Case List
          </Button>
        </div>
      </div>
    );
  }

  // ── Render: Form ──────────────────────────────────────────────────────────
  return (
    <CaseForm
      mode="edit"
      initialStep={initialStep}
      targetSection={sectionParam || undefined}
      initialValues={initialValues}
      onSubmit={handleUpdateSubmit}
      isSubmitting={isSubmitting}
      onCancel={() =>
        navigate("/admin/case/details", { state: { caseId } })
      }
    />
  );
};
