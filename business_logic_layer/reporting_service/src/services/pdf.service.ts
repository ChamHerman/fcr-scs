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

      doc.fillColor("#D0BCFF").fontSize(8).font("Helvetica")
        .text("Government Administration Reporting & Statutory Audit Subsystem (Act 486)", pageMargin + 14, bannerY + 38);

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
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const reportId = reportData.reportId || `RPT-${Date.now().toString().slice(-6)}`;
      doc.fillColor(secondaryTextColor).fontSize(8).font("Helvetica")
        .text(`Report ID: ${reportId}   •   Generated: ${genDate}   •   Classification: OFFICIAL (SULIT)   •   Operator: Gov Administrator`, pageMargin, doc.y);

      // Filter scope line
      let filterSummary = "All records (National Scope — Unrestricted)";
      if (reportData.filterApplied && typeof reportData.filterApplied === "object") {
        const activeEntries = Object.entries(reportData.filterApplied).filter(
          ([_, v]) => v && v !== "All" && v !== "All states" && v !== "All Statuses"
        );
        if (activeEntries.length > 0) {
          filterSummary = activeEntries
            .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
            .join("   •   ");
        }
      }

      doc.moveDown(0.3);
      doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold")
        .text("Filter Scope: ", pageMargin, doc.y, { continued: true })
        .font("Helvetica").fillColor(secondaryTextColor).text(filterSummary);

      doc.moveDown(0.6);

      // Executive Summary Metrics Box (Multi-tile with dividers)
      const summaryBoxY = doc.y;
      const boxHeight = 52;
      doc.roundedRect(pageMargin, summaryBoxY, printableWidth, boxHeight, 4).fillAndStroke("#F8F5FC", borderColor);

      doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold")
        .text("EXECUTIVE AUDIT SUMMARY", pageMargin + 10, summaryBoxY + 7);

      let statItems: { label: string; value: string }[] = [];
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
          statItems = [
            { label: "Total Disbursements", value: String(reportData.summary.totalDisbursement ?? "RM 0.00") },
            { label: "Clearance Success Rate", value: String(reportData.summary.successRate ?? "100%") },
            { label: "Paid Records", value: String(reportData.summary.successfulPayments ?? 0) },
            { label: "Pending Payouts", value: String(reportData.summary.pendingPayments ?? 0) },
          ];
        } else if (reportData.reportType === "Blockchain Audit Report") {
          statItems = [
            { label: "Total Ledger Records", value: String(reportData.summary.totalRecords ?? 0) },
            { label: "Published to Sepolia", value: String(reportData.summary.publishedRecords ?? 0) },
            { label: "Ready to Publish", value: String(reportData.summary.readyToPublishRecords ?? 0) },
            { label: "Cryptographic Proof", value: String(reportData.summary.integrityStatus ?? "100% Validated") },
          ];
        }
      }

      const tileCount = Math.max(1, statItems.length);
      const tileWidth = (printableWidth - 20) / tileCount;

      statItems.forEach((item, idx) => {
        const itemX = pageMargin + 10 + idx * tileWidth;

        // Vertical divider line between tiles
        if (idx > 0) {
          doc.moveTo(itemX - 5, summaryBoxY + 18).lineTo(itemX - 5, summaryBoxY + 46).lineWidth(0.5).stroke("#E2D9E8");
        }

        doc.fillColor(secondaryTextColor).fontSize(6.8).font("Helvetica")
          .text(item.label.toUpperCase(), itemX, summaryBoxY + 20, { width: tileWidth - 8, lineBreak: false });

        doc.fillColor(textColor).fontSize(11).font("Helvetica-Bold")
          .text(item.value, itemX, summaryBoxY + 32, { width: tileWidth - 8, lineBreak: false });
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

      // Add Footer with Page Numbers
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.rect(pageMargin, doc.page.height - 30, printableWidth, 0.5).fill(borderColor);
        doc.fillColor(secondaryTextColor).fontSize(7).font("Helvetica")
          .text("Federal Land Acquisition & Compensation System (FCR-SCS)  •  Governed by Land Acquisition Act 1960  •  Confidential Audit Record", pageMargin, doc.page.height - 22, { align: "left" });
        doc.text(`Page ${i + 1} of ${totalPages}`, doc.page.width - pageMargin - 80, doc.page.height - 22, { width: 80, align: "right" });
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
const HEADER_HEIGHT = 18;
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
      doc.text(col.header, x + CELL_PAD_X, y + 5, { width: col.width - CELL_PAD_X * 2, lineBreak: false });
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
      { header: "Clearance Status", width: 80, value: (i) => formatStatusText(i.status) },
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
      { header: "Milestone", width: 55, value: (i) => i.milestone || "AWARD" },
      { header: "On-Chain Transaction Hash", width: 165, value: (i) => i.transactionHash || "Pending Publication" },
      { header: "Document SHA-256 Hash", width: 110, value: (i) => i.documentHash || "-" },
      { header: "Ledger Status", width: 65, value: (i) => formatStatusText(i.status) },
      { header: "Notarized Date", width: 55, value: (i) => (i.publishedAt ? String(i.publishedAt).slice(0, 10) : "-") },
    ],
    items,
    headerBg,
    headerBorder,
    altBg,
    rowBorder,
    textCol
  );
}
