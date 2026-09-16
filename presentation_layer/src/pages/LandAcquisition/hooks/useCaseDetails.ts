import { useState, useEffect, useCallback } from "react";
import { landAcquisitionApi } from "../../../services/landAcquisitionApi";
import type { CaseDetailsData } from "../types/land-acquisition.types";
import {
  CASE_STATUS_CLASS_MAP as statusClassMap,
  CASE_STATUS_LABEL_MAP as statusLabelMap,
} from "../../../constants";
import { formatCurrencyRM } from "../../../utils/currency";

export function useCaseDetails(caseId: string | null | undefined) {
  const [caseData, setCaseData] = useState<CaseDetailsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCase = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await landAcquisitionApi.getCaseById(id);
      const c = res.case;

      const formatted: CaseDetailsData = {
        id: c.caseId,
        title: c.caseTitle,
        status: statusLabelMap[c.status] || c.status,
        rawStatus: c.status,
        createdById: c.createdById,
        statusClass: statusClassMap[c.status] || "registered",
        registrationDate: c.registrationDate
          ? new Date(c.registrationDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
        projectName: c.project?.projectName || "—",
        projectType: c.project?.projectType || "—",
        projectPurpose: c.project?.purpose || "—",
        projectBudget:
          c.project?.budget != null
            ? formatCurrencyRM(c.project.budget)
            : "—",
        fundingSource:
          c.project?.fundingSource === "GOVERNMENT"
            ? "Government"
            : c.project?.fundingSource === "PRIVATE"
            ? "Private"
            : c.project?.fundingSource === "OTHERS"
            ? "Others"
            : c.project?.fundingSource || "—",
        landTitleNumber: c.landParcel?.landTitleNo || "—",
        lotNumber: c.landParcel?.lotNo || "—",
        tempat: c.landParcel?.tempat || "—",
        mukim: c.landParcel?.mukim || "—",
        district: c.landParcel?.district || "—",
        state: c.landParcel?.state || "—",
        landArea: c.landParcel?.area
          ? `${c.landParcel.area} ${
              c.landParcel.areaUnit === "SQUARE_METER"
                ? "m²"
                : c.landParcel.areaUnit === "HECTARE"
                ? "hectares"
                : c.landParcel.areaUnit === "ACRE"
                ? "acres"
                : c.landParcel.areaUnit || "m²"
            }`
          : "—",
        landCategory:
          c.landParcel?.category === "AGRICULTURE"
            ? "Agriculture"
            : c.landParcel?.category === "BUILDING"
            ? "Building"
            : c.landParcel?.category === "INDUSTRY"
            ? "Industry"
            : c.landParcel?.category || "—",
        tenureType:
          c.landParcel?.tenureType === "FREEHOLD"
            ? "Freehold"
            : c.landParcel?.tenureType === "LEASEHOLD"
            ? "Leasehold"
            : c.landParcel?.tenureType === "MALAY_RESERVE"
            ? "Malay Reserve"
            : c.landParcel?.tenureType || "—",
        owners: (c.landParcel?.ownerships || []).map((o: any, idx: number) => ({
          id: o.landOwner?.ownerId || idx.toString(),
          name: o.landOwner?.name || "—",
          icNumber: o.landOwner?.nric || "—",
          address: o.landOwner?.address || "—",
          phone: o.landOwner?.contact || "—",
          email: o.landOwner?.email || "—",
          share: o.share || "—",
          ownershipType:
            o.ownershipType === "JOINT_OWNERSHIP"
              ? "Joint Ownership"
              : o.ownershipType === "CORPORATE_ENTITY"
              ? "Corporate Entity"
              : o.ownershipType === "ESTATE_OF_DECEASED"
              ? "Estate of Deceased"
              : o.ownershipType === "TRUSTEE"
              ? "Trustee"
              : o.ownershipType === "INDIVIDUAL_CITIZEN"
              ? "Individual Citizen"
              : o.ownershipType || "Individual Citizen",
        })),
        documents: (c.caseDocuments || []).map((d: any) => ({
          id: d.documentId,
          type: d.documentType,
          fileName: d.fileName,
          filePath: d.filePath,
          fileSize: `${(d.fileSize / 1024 / 1024).toFixed(2)} MB`,
        })),
      };

      setCaseData(formatted);
    } catch (err: any) {
      console.error("Error fetching case details:", err);
      setError(err.message || "Failed to load case details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (caseId) {
      loadCase(caseId);
    } else {
      setLoading(false);
    }
  }, [caseId, loadCase]);

  return { caseData, setCaseData, loading, error, reload: () => caseId && loadCase(caseId) };
}
