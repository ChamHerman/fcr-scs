import { Request, Response } from "express";
import {
  getDashboardOverviewStats,
  generateCaseStatusData,
  generatePaymentData,
  generateBlockchainAuditData,
  ReportFilterParams,
} from "../services/report.service";
import { generatePdfBuffer } from "../services/pdf.service";

export const getOverviewStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getDashboardOverviewStats();
    res.json(stats);
  } catch (error: any) {
    console.error("[ERROR] [reporting_service] getOverviewStats failed:", error);
    res.status(500).json({ error: error.message || "Failed to fetch reporting overview stats" });
  }
};

export const getCaseStatusReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format, startDate, endDate, state, status, location, projectType } = req.query;
    const filters: ReportFilterParams = {
      startDate: startDate as string,
      endDate: endDate as string,
      state: state as string,
      status: status as string,
      location: location as string,
      projectType: projectType as string,
    };

    const data = await generateCaseStatusData(filters);

    if (format === "pdf") {
      const pdfBuffer = await generatePdfBuffer("Case Status & Lifecycle Report", data);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=FCR-Case-Status-Report-${Date.now()}.pdf`);
      res.send(pdfBuffer);
      return;
    }

    res.json(data);
  } catch (error: any) {
    console.error("[ERROR] [reporting_service] getCaseStatusReport failed:", error);
    res.status(500).json({ error: error.message || "Failed to generate case status report" });
  }
};

export const getPaymentReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format, startDate, endDate, status } = req.query;
    const filters: ReportFilterParams = {
      startDate: startDate as string,
      endDate: endDate as string,
      status: status as string,
    };

    const data = await generatePaymentData(filters);

    if (format === "pdf") {
      const pdfBuffer = await generatePdfBuffer("Payment & Disbursement Report", data);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=FCR-Payment-Report-${Date.now()}.pdf`);
      res.send(pdfBuffer);
      return;
    }

    res.json(data);
  } catch (error: any) {
    console.error("[ERROR] [reporting_service] getPaymentReport failed:", error);
    res.status(500).json({ error: error.message || "Failed to generate payment report" });
  }
};

export const getBlockchainAuditReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format, startDate, endDate, status } = req.query;
    const filters: ReportFilterParams = {
      startDate: startDate as string,
      endDate: endDate as string,
      status: status as string,
    };

    const data = await generateBlockchainAuditData(filters);

    if (format === "pdf") {
      const pdfBuffer = await generatePdfBuffer("Blockchain Audit & Notarization Report", data);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=FCR-Blockchain-Audit-Report-${Date.now()}.pdf`);
      res.send(pdfBuffer);
      return;
    }

    res.json(data);
  } catch (error: any) {
    console.error("[ERROR] [reporting_service] getBlockchainAuditReport failed:", error);
    res.status(500).json({ error: error.message || "Failed to generate blockchain audit report" });
  }
};
