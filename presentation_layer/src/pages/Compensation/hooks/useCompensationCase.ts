import { useState, useEffect, useCallback } from "react";
import { landAcquisitionApi } from "../../../services/landAcquisitionApi";
import { CASE_STATUS_CLASS_MAP } from "../../../constants";
import { formatCurrencyWithDecimals } from "../../../utils/currency";
import type {
  CaseDataSummary,
  ValuationBenchmark,
  ProjectBudgetSummary,
  CompensationFormData,
} from "../types/compensation.types";

export function useCompensationCase(
  caseId: string | null,
  setFormData: React.Dispatch<React.SetStateAction<CompensationFormData>>
) {
  const [caseData, setCaseData] = useState<CaseDataSummary | null>(null);
  const [valuationReport, setValuationReport] = useState<ValuationBenchmark | null>(null);
  const [valuationReportId, setValuationReportId] = useState<string | null>(null);
  const [loadingCase, setLoadingCase] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadCaseDetails = useCallback(
    async (cId: string) => {
      setLoadingCase(true);
      setError(null);
      try {
        const res = await landAcquisitionApi.getCaseById(cId);
        const c = res?.case || res;
        if (c && (c.caseId || c.id)) {
          const cIdValue = c.caseId || c.id;
          const statusClass = CASE_STATUS_CLASS_MAP[c.status] || "status-valuation-approved";

          const budgetSummary: ProjectBudgetSummary | undefined =
            c.projectBudgetSummary ||
            (c.project
              ? {
                  projectId: c.project.projectId || "",
                  projectName: c.project.projectName || "—",
                  projectType: c.project.projectType || "—",
                  totalBudget: Number(c.project.budget || 0),
                  totalApprovedUnderProject: 0,
                  remainingFund: Number(c.project.budget || 0),
                }
              : undefined);

          setCaseData({
            id: cIdValue,
            title: c.caseTitle || "—",
            project: c.project?.projectName || "—",
            owner: c.landParcel?.ownerships?.[0]?.landOwner?.name || "—",
            ownerIc: c.landParcel?.ownerships?.[0]?.landOwner?.icNumber || "—",
            landTitleNumber: c.landParcel?.landTitleNo || "—",
            registrationDate: c.registrationDate
              ? new Date(c.registrationDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—",
            status: c.status,
            statusClass,
            projectBudgetSummary: budgetSummary,
          });

          const valReports = c.valuationReports || [];
          const approvedVal = valReports.find((r: any) => r.reportStatus === "APPROVED") || valReports[0];

          if (approvedVal) {
            const recComp = Number(approvedVal.recommendedCompensation || 0);
            const mktVal = Number(approvedVal.marketValue || 0);

            setValuationReportId(approvedVal.reportId);
            setValuationReport({
              reportId: approvedVal.reportId,
              valuationMethod: approvedVal.valuationMethod || "Sales Comparison Method",
              marketValue: mktVal,
              recommendedCompensation: recComp,
              landValue: recComp,
              buildingValue: 0,
              cropValue: 0,
            });

            setFormData({
              landValue: recComp > 0 ? formatCurrencyWithDecimals(recComp) : "",
              buildingValue: "",
              cropValue: "",
              businessDisruption: "",
              disturbanceCompensation: "",
              relocationAllowance: "",
              otherEligible: "",
              remarks: "",
            });
          } else {
            setValuationReportId(null);
            setValuationReport(null);
            setFormData({
              landValue: "",
              buildingValue: "",
              cropValue: "",
              businessDisruption: "",
              disturbanceCompensation: "",
              relocationAllowance: "",
              otherEligible: "",
              remarks: "",
            });
          }
        }
      } catch (err: any) {
        console.error("Failed to load case details for compensation:", err);
        setError(err.message || "Failed to fetch case and valuation information.");
      } finally {
        setLoadingCase(false);
      }
    },
    [setFormData]
  );

  useEffect(() => {
    if (caseId) {
      loadCaseDetails(caseId);
    }
  }, [caseId, loadCaseDetails]);

  return {
    caseData,
    valuationReport,
    valuationReportId,
    loadingCase,
    error,
    reload: () => caseId && loadCaseDetails(caseId),
  };
}
