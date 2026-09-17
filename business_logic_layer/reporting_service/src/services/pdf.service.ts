import PDFDocument from "pdfkit";

export const generatePdfBuffer = async (reportTitle: string, reportData: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 35, size: "A4", bufferPages: true });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Color Palette based on FCR-SCS Official Design System
      const primaryColor = "#4A3780"; // Deep Royal Purple
      const accentGold = "#D4AF37"; // Statutory Malaysian Gold Accent
      const textColor = "#1D1B20";
      const secondaryTextColor = "#49454F";
      const tableHeaderBg = "#ECE6F0";
      const borderColor = "#D0C5D8";
      const rowBorderColor = "#E7E0EC";
      const alternatingRowBg = "#FBF8FD";
      const pageMargin = 35;
      const printableWidth = doc.page.width - pageMargin * 2; // 525.28 pt

      // Top Official Header Banner
      const bannerY = 32;
      const bannerHeight = 60;
      doc.rect(pageMargin, bannerY, printableWidth, bannerHeight).fill(primaryColor);
      // Gold Accent Ribbon at bottom of banner
      doc.rect(pageMargin, bannerY + bannerHeight - 3, printableWidth, 3).fill(accentGold);

      // Banner Typography
      doc.fillColor("#EADDFF").fontSize(7.5).font("Helvetica-Bold")
        .text("KERAJAAN MALAYSIA  •  DEPARTMENT OF LANDS AND MINES (JKPTG)", pageMargin + 14, bannerY + 10);

      doc.fillColor("#FFFFFF").fontSize(11.5).font("Helvetica-Bold")
        .text("FAIR COMPENSATION & RESETTLEMENT SMART CONTRACT SYSTEM", pageMargin + 14, bannerY + 22);

      const subsystemTitle = reportData.reportType === "Case Status Report"
        ? "Government Land Acquisition Reporting & Statutory Lifecycle Subsystem (Act 486)"
        : (reportData.reportType === "Payment Report"
          ? "Government Financial Disbursement & Compensation Subsystem (Act 486)"
          : "Government Administration Reporting & Statutory Audit Subsystem (Act 486)");

      doc.fillColor("#D0BCFF").fontSize(8).font("Helvetica")
        .text(subsystemTitle, pageMargin + 14, bannerY + 38);

      // Security Classification Pill on Banner Right
      const pillWidth = 100;
      const pillX = pageMargin + printableWidth - pillWidth - 12;
      doc.roundedRect(pillX, bannerY + 11, pillWidth, 20, 3).lineWidth(1).strokeColor(accentGold).fillAndStroke("#381E72", accentGold);
      doc.fillColor("#FFFFFF").fontSize(7.5).font("Helvetica-Bold")
        .text("OFFICIAL (SULIT)", pillX, bannerY + 16, { width: pillWidth, align: "center" });
      doc.fillColor("#EADDFF").fontSize(6.5).font("Helvetica")
        .text("AUDIT DISCLOSURE", pillX, bannerY + 36, { width: pillWidth, align: "center" });

      doc.y = bannerY + bannerHeight + 12;

      // Report Title & Meta Info
      doc.fillColor(textColor).fontSize(14).font("Helvetica-Bold").text(reportTitle, pageMargin, doc.y);
      doc.moveDown(0.25);

      const genDate = new Date(reportData.generatedAt || Date.now()).toLocaleString("en-GB", {
        timeZone: "Asia/Kuala_Lumpur",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const reportId = reportData.reportId || `RPT-${Date.now().toString().slice(-6)}`;
      const operatorText = reportData.operator || (reportData.reportType === "Case Status Report" ? "Government Officer (JKPTG)" : "Gov Administrator (Government Administrator)");
      
      doc.fillColor(secondaryTextColor).fontSize(8).font("Helvetica")
        .text(`Report ID: ${reportId}   •   Generated: ${genDate}   •   Classification: OFFICIAL (SULIT)`, pageMargin, doc.y);
      doc.moveDown(0.2);
      doc.fillColor(secondaryTextColor).fontSize(8).font("Helvetica")
        .text(`Operator: ${operatorText}`, pageMargin, doc.y);

      // Filter scope line
      let filterSummary = "All records (National Scope — Unrestricted)";
      if (reportData.filterApplied && typeof reportData.filterApplied === "object") {
        const activeEntries = Object.entries(reportData.filterApplied).filter(
          ([k, v]) => k !== "operator" && k !== "format" && v && v !== "All" && v !== "All states" && v !== "All Statuses" && v !== "All statuses"
        );
        if (activeEntries.length > 0) {
          filterSummary = activeEntries
            .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
            .join("   •   ");
        }
      }

      doc.moveDown(0.25);
      doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold")
        .text("Filter Scope: ", pageMargin, doc.y, { continued: true })
        .font("Helvetica").fillColor(secondaryTextColor).text(filterSummary);

      doc.moveDown(0.6);

      // Executive Summary Metrics Box (Multi-tile with dividers)
      const summaryBoxY = doc.y;
      const boxHeight = 56;
      doc.roundedRect(pageMargin, summaryBoxY, printableWidth, boxHeight, 4).fillAndStroke("#F8F5FC", borderColor);

      doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold")
        .text("EXECUTIVE AUDIT SUMMARY", pageMargin + 10, summaryBoxY + 7);

      let statItems: { label: string; value: string; sub?: string }[] = [];
      if (reportData.summary) {
        if (reportData.reportType === "Case Status Report") {
          statItems = [
            { label: "Total Registered", value: String(reportData.summary.totalCases ?? 0) },
            { label: "Active in Pipeline", value: String(reportData.summary.activeCases ?? 0) },
            { label: "Payment Completed", value: String(reportData.summary.paymentCompletedCases ?? 0) },
            { label: "Case Closed", value: String(reportData.summary.closedCases ?? 0) },
            { label: "Avg Lifecycle", value: String(reportData.summary.averageAgingDays ?? "0 days") },
          ];
        } else if (reportData.reportType === "Payment Report") {
          const details = reportData.details || [];
          const parseAmt = (val: any): number => {
            if (typeof val === "number") return val;
            const clean = String(val || "").replace(/[^0-9.-]+/g, "");
            const parsed = parseFloat(clean);
            return isNaN(parsed) ? 0 : parsed;
          };

          const pendingClearanceRows = details.filter((d: any) => {
            const cs = String(d.clearanceStatus || "").toLowerCase();
            const ref = String(d.bankReference || "").toLowerCase();
            const st = String(d.status || "").toUpperCase();
            return cs === "pending clearance" || ref.includes("pending") || (!st.includes("PAID") && !st.includes("SUCCEED"));
          });
          const dynamicUndisbursedNum = pendingClearanceRows.reduce((sum: number, d: any) => sum + parseAmt(d.amount), 0);

          const settledRows = details.filter((d: any) => {
            const cs = String(d.clearanceStatus || "").toLowerCase();
            const st = String(d.status || "").toUpperCase();
            return cs === "cleared" || st === "PAID" || st === "TRANSFER_SUCCEED";
          });
          const dynamicDisbursedNum = settledRows.reduce((sum: number, d: any) => sum + parseAmt(d.amount), 0);
          const dynamicTotalVolNum = dynamicDisbursedNum + dynamicUndisbursedNum;
          const dynamicRate = dynamicTotalVolNum > 0 ? Math.round((dynamicDisbursedNum / dynamicTotalVolNum) * 100) : 0;

          const totalVolStr = dynamicTotalVolNum > 0
            ? `RM ${dynamicTotalVolNum.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : (reportData.summary.totalPaymentVolume ?? "RM 0.00");
          const disbursedStr = dynamicDisbursedNum > 0
            ? `RM ${dynamicDisbursedNum.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : (reportData.summary.totalDisbursement ?? "RM 0.00");
          const undisbursedStr = dynamicUndisbursedNum > 0
            ? `RM ${dynamicUndisbursedNum.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : (reportData.summary.undisbursedAmount ?? "RM 0.00");

          statItems = [
            { label: "Total Volume", value: totalVolStr },
            { label: "Total Disbursed", value: disbursedStr },
            { label: "Undisbursed", value: undisbursedStr },
            {
              label: "Disbursed Rate",
              value: `${dynamicRate}%`,
              sub: `${settledRows.length} Paid / ${details.length} Total`,
            },
          ];
        } else if (reportData.reportType === "Blockchain Audit Report") {
          const totalRecs = Number(reportData.summary.totalRecords ?? (reportData.details?.length ?? 0));
          const publishedRecs = Number(reportData.summary.publishedRecords ?? (reportData.details?.filter((r: any) => String(r.status).toUpperCase() === "PUBLISHED").length ?? 0));
          const dynamicCryptoPercentage = totalRecs > 0 ? `${Math.round((publishedRecs / totalRecs) * 100)}%` : "0%";
          const dynamicCryptoRatio = `${publishedRecs}/${totalRecs} Notarized`;

          statItems = [
            { label: "Total Records", value: String(totalRecs) },
            { label: "Published to Sepolia", value: String(publishedRecs) },
            { label: "Ready to Publish", value: String(reportData.summary.readyToPublishRecords ?? (totalRecs - publishedRecs)) },
            {
              label: "Cryptographic Proof",
              value: dynamicCryptoPercentage,
              sub: dynamicCryptoRatio,
            },
          ];
        }
      }

      const tileCount = Math.max(1, statItems.length);
      const tileWidth = (printableWidth - 20) / tileCount;

      statItems.forEach((item, idx) => {
        const itemX = pageMargin + 10 + idx * tileWidth;

        // Vertical divider line between tiles
        if (idx > 0) {
          doc.moveTo(itemX - 5, summaryBoxY + 18).lineTo(itemX - 5, summaryBoxY + 50).lineWidth(0.5).stroke("#E2D9E8");
        }

        doc.fillColor(secondaryTextColor).fontSize(6.8).font("Helvetica")
          .text(item.label.toUpperCase(), itemX, summaryBoxY + 18, { width: tileWidth - 8, lineBreak: false });

        doc.fillColor(textColor).fontSize(11).font("Helvetica-Bold")
          .text(item.value, itemX, summaryBoxY + 29, { width: tileWidth - 8, lineBreak: false });

        if (item.sub) {
          doc.fillColor(secondaryTextColor).fontSize(6.5).font("Helvetica")
            .text(item.sub, itemX, summaryBoxY + 43, { width: tileWidth - 8, lineBreak: false });
        }
      });

      doc.y = summaryBoxY + boxHeight + 8;

      // Statutory Regulatory & Compliance Guidance Box (with purple accent bar)
      const notesBoxY = doc.y;
      const notesHeight = 36;
      doc.rect(pageMargin, notesBoxY, printableWidth, notesHeight).fillAndStroke("#FBF8FD", borderColor);
      // Left accent bar
      doc.rect(pageMargin, notesBoxY, 3.5, notesHeight).fill(primaryColor);

      doc.fillColor(primaryColor).fontSize(7.5).font("Helvetica-Bold")
        .text("STATUTORY LEGAL BASIS & COMPLIANCE SCOPE", pageMargin + 10, notesBoxY + 6);

      let statutoryNote = "";
      if (reportData.reportType === "Case Status Report") {
        statutoryNote = "Governed under Land Acquisition Act 1960 (Act 486). Lifecycle aging tracks statutory progression from Section 4 gazette to Section 8 declaration, valuation inquiry, and Form H award. Files marked Completed have settled disbursements; Closed files are formally archived.";
      } else if (reportData.reportType === "Payment Report") {
        statutoryNote = "Disbursements comply with the Financial Procedures Act 1957 and Treasury Instructions. Dual-administrator multi-sig approval enforces Segregation of Duties (SoD). Bank clearance status is audited via official bank transaction references.";
      } else {
        statutoryNote = "Anchored to Ethereum Sepolia Testnet smart contract. SHA-256 document hashing complies with Digital Signature Act 1997 and Evidence Act 1950 Section 90A for permanent electronic document admissibility and tamper-proof verification.";
      }

      doc.fillColor(secondaryTextColor).fontSize(7).font("Helvetica")
        .text(statutoryNote, pageMargin + 10, notesBoxY + 16, { width: printableWidth - 20, lineGap: 1.2 });

      doc.y = notesBoxY + notesHeight + 10;

      // Render Tables based on report type
      if (reportData.details && reportData.details.length > 0) {
        doc.fillColor(textColor).fontSize(10).font("Helvetica-Bold")
          .text("Detailed Record Breakdown", pageMargin, doc.y);
        doc.moveDown(0.3);

        if (reportData.reportType === "Case Status Report") {
          renderCaseStatusTable(doc, reportData.details, tableHeaderBg, borderColor, alternatingRowBg, rowBorderColor, textColor);
        } else if (reportData.reportType === "Payment Report") {
          renderPaymentTable(doc, reportData.details, tableHeaderBg, borderColor, alternatingRowBg, rowBorderColor, textColor);
        } else if (reportData.reportType === "Blockchain Audit Report") {
          renderBlockchainTable(doc, reportData.details, tableHeaderBg, borderColor, alternatingRowBg, rowBorderColor, textColor);
        }
      } else {
        doc.fillColor(secondaryTextColor).fontSize(9).font("Helvetica-Oblique")
          .text("No records found matching the specified report criteria.", pageMargin, doc.y + 10);
      }

      // Add Footer with Page Numbers without triggering automatic blank pages
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0;
        doc.rect(pageMargin, doc.page.height - 30, printableWidth, 0.5).fill(borderColor);
        doc.fillColor(secondaryTextColor).fontSize(7).font("Helvetica")
          .text("Federal Land Acquisition & Compensation System (FCR-SCS)  •  Governed by Land Acquisition Act 1960  •  Confidential Audit Record", pageMargin, doc.page.height - 22, { align: "left", lineBreak: false });
        doc.text(`Page ${i + 1} of ${totalPages}`, doc.page.width - pageMargin - 80, doc.page.height - 22, { width: 80, align: "right", lineBreak: false });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

interface PdfColumn {
  header: string;
  width: number;
  value: (item: any) => string;
}

const TABLE_MARGIN_X = 35;
const CELL_PAD_X = 4;
const CELL_PAD_Y = 4;
const CELL_FONT_SIZE = 7;
const HEADER_HEIGHT = 20;
const FOOTER_RESERVE = 40;

const formatStatusText = (status: any): string => {
  if (!status) return "-";
  return String(status)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

function renderTable(
  doc: PDFKit.PDFDocument,
  columns: PdfColumn[],
  items: any[],
  headerBg: string,
  headerBorderColor: string,
  altBg: string,
  rowBorderColor: string,
  textCol: string
) {
  const startX = TABLE_MARGIN_X;
  const tableWidth = doc.page.width - TABLE_MARGIN_X * 2;
  let y = doc.y;

  const drawHeader = () => {
    doc.rect(startX, y, tableWidth, HEADER_HEIGHT).fill(headerBg);
    doc.rect(startX, y, tableWidth, HEADER_HEIGHT).stroke(headerBorderColor);
    doc.fillColor(textCol).fontSize(7.5).font("Helvetica-Bold");
    let x = startX;
    columns.forEach((col) => {
      doc.text(col.header, x + CELL_PAD_X, y + 6, { width: col.width - CELL_PAD_X * 2, lineBreak: false });
      x += col.width;
    });
    y += HEADER_HEIGHT;
  };

  drawHeader();

  items.forEach((item, idx) => {
    doc.font("Helvetica").fontSize(CELL_FONT_SIZE);
    let rowHeight = 0;
    columns.forEach((col) => {
      rowHeight = Math.max(
        rowHeight,
        doc.heightOfString(String(col.value(item) ?? "-"), { width: col.width - CELL_PAD_X * 2 })
      );
    });
    rowHeight += CELL_PAD_Y * 2;

    if (y + rowHeight > doc.page.height - FOOTER_RESERVE) {
      doc.addPage();
      y = TABLE_MARGIN_X;
      drawHeader();
    }

    doc.rect(startX, y, tableWidth, rowHeight).fill(idx % 2 === 0 ? "#FFFFFF" : altBg);
    doc.rect(startX, y, tableWidth, rowHeight).stroke(rowBorderColor);

    doc.fillColor(textCol).fontSize(CELL_FONT_SIZE).font("Helvetica");
    let x = startX;
    columns.forEach((col) => {
      doc.text(String(col.value(item) ?? "-"), x + CELL_PAD_X, y + CELL_PAD_Y, {
        width: col.width - CELL_PAD_X * 2,
      });
      x += col.width;
    });

    y += rowHeight;
  });

  doc.y = y + 10;
}

function renderCaseStatusTable(
  doc: PDFKit.PDFDocument,
  items: any[],
  headerBg: string,
  headerBorder: string,
  altBg: string,
  rowBorder: string,
  textCol: string
) {
  renderTable(
    doc,
    [
      { header: "Case Ref", width: 75, value: (i) => i.caseId || "-" },
      { header: "Case Title", width: 135, value: (i) => i.title || i.caseTitle || "-" },
      { header: "State / District", width: 115, value: (i) => i.location || `${i.state || "Selangor"} / ${i.district || "-"}` },
      { header: "Statutory Status", width: 98, value: (i) => formatStatusText(i.status) },
      { header: "Notice Date", width: 55, value: (i) => i.date || i.registrationDate || "-" },
      { header: "Aging", width: 47, value: (i) => i.lifecycleAging || `${i.agingDays || 0}d` },
    ],
    items,
    headerBg,
    headerBorder,
    altBg,
    rowBorder,
    textCol
  );
}

function renderPaymentTable(
  doc: PDFKit.PDFDocument,
  items: any[],
  headerBg: string,
  headerBorder: string,
  altBg: string,
  rowBorder: string,
  textCol: string
) {
  renderTable(
    doc,
    [
      { header: "Case Ref", width: 75, value: (i) => i.caseId || "-" },
      { header: "Payee Name", width: 105, value: (i) => i.payeeName || "Landowner Beneficiary" },
      { header: "Bank Details", width: 80, value: (i) => i.bankName || "Commercial Bank" },
      { header: "Disbursement", width: 85, value: (i) => i.amount || i.formattedAmount || "-" },
      { header: "Bank Ref Number", width: 100, value: (i) => i.bankReference || "Pending Clearance" },
      {
        header: "Clearance Status",
        width: 80,
        value: (i) =>
          i.clearanceStatus ||
          (["PAID", "TRANSFER_SUCCEED", "Paid", "Transfer Succeed"].includes(i.status)
            ? "Cleared"
            : "Pending Clearance"),
      },
    ],
    items,
    headerBg,
    headerBorder,
    altBg,
    rowBorder,
    textCol
  );
}

function renderBlockchainTable(
  doc: PDFKit.PDFDocument,
  items: any[],
  headerBg: string,
  headerBorder: string,
  altBg: string,
  rowBorder: string,
  textCol: string
) {
  renderTable(
    doc,
    [
      { header: "Case Ref", width: 75, value: (i) => i.caseId || "-" },
      { header: "Milestone", width: 50, value: (i) => i.milestone || "AWARD" },
      { header: "On-Chain Transaction Hash", width: 150, value: (i) => i.transactionHash || "Pending Publication" },
      { header: "Document SHA-256 Hash", width: 110, value: (i) => i.documentHash || "-" },
      { header: "Ledger Status", width: 65, value: (i) => formatStatusText(i.status) },
      { header: "Notarized Date", width: 75, value: (i) => (i.publishedAt ? String(i.publishedAt).slice(0, 10) : "-") },
    ],
    items,
    headerBg,
    headerBorder,
    altBg,
    rowBorder,
    textCol
  );
}
