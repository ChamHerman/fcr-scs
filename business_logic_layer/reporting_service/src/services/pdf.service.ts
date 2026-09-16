import PDFDocument from "pdfkit";

export const generatePdfBuffer = async (reportTitle: string, reportData: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4", bufferPages: true });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Color Palette based on FCR-SCS Design System
      const primaryColor = "#6750A4"; // Deep Purple Primary
      const textColor = "#1D1B20";
      const secondaryTextColor = "#49454F";
      const tableHeaderBg = "#F3EDF7";
      const borderColor = "#CAC4D0";
      const alternatingRowBg = "#FBF8FD";

      // Header Banner
      doc.rect(40, 40, doc.page.width - 80, 75).fill(primaryColor);

      doc.fillColor("#FFFFFF").fontSize(15).font("Helvetica-Bold")
        .text("FAIR COMPENSATION & RESETTLEMENT SMART CONTRACT SYSTEM", 55, 50, { width: doc.page.width - 240, align: "left" });
      
      doc.fontSize(9.5).font("Helvetica")
        .text("Government Administration Reporting & Audit Subsystem (FCR-SCS)", 55, doc.y + 4, { align: "left" });

      doc.moveDown(3);
      doc.y = 130;

      // Report Title & Meta Info
      doc.fillColor(textColor).fontSize(15).font("Helvetica-Bold").text(reportTitle, 40, doc.y);
      doc.moveDown(0.3);

      const genDate = new Date(reportData.generatedAt || Date.now()).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      doc.fillColor(secondaryTextColor).fontSize(9).font("Helvetica")
        .text(`Generated on: ${genDate}  |  Authorized Operator: Government Administrator`, 40, doc.y);
      
      doc.moveDown(1.2);

      // Executive Summary Metrics Box
      const summaryBoxY = doc.y;
      doc.rect(40, summaryBoxY, doc.page.width - 80, 54).fillAndStroke(tableHeaderBg, borderColor);

      doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold")
        .text("EXECUTIVE METRICS SUMMARY", 50, summaryBoxY + 8);

      let summaryText = "";
      if (reportData.summary) {
        if (reportData.reportType === "Case Status Report") {
          summaryText = `Total Cases: ${reportData.summary.totalCases ?? 0}  |  Active Cases: ${reportData.summary.activeCases ?? 0}  |  Completed: ${reportData.summary.completedCases ?? 0}  |  Avg Lifecycle Aging: ${reportData.summary.averageAgingDays ?? '0 days'}`;
        } else if (reportData.reportType === "Payment Report") {
          summaryText = `Total Disbursement: ${reportData.summary.totalDisbursement ?? 'RM 0.00'}  |  Success Rate: ${reportData.summary.successRate ?? '100%'}  |  Paid: ${reportData.summary.successfulPayments ?? 0}  |  Pending: ${reportData.summary.pendingPayments ?? 0}`;
        } else if (reportData.reportType === "Blockchain Audit Report") {
          summaryText = `Total Records: ${reportData.summary.totalRecords ?? 0}  |  Published On-chain: ${reportData.summary.publishedRecords ?? 0}  |  Ready to Publish: ${reportData.summary.readyToPublishRecords ?? 0}  |  Ledger Status: ${reportData.summary.integrityStatus ?? 'Verified'}`;
        } else {
          summaryText = JSON.stringify(reportData.summary);
        }
      }

      doc.fillColor(textColor).fontSize(9).font("Helvetica").text(summaryText, 50, summaryBoxY + 26, { width: doc.page.width - 100 });

      doc.y = summaryBoxY + 68;

      // Render Tables based on report type
      if (reportData.details && reportData.details.length > 0) {
        doc.fillColor(textColor).fontSize(11).font("Helvetica-Bold").text("Detailed Record Breakdown", 40, doc.y);
        doc.moveDown(0.5);

        if (reportData.reportType === "Case Status Report") {
          renderCaseStatusTable(doc, reportData.details, tableHeaderBg, borderColor, alternatingRowBg, textColor);
        } else if (reportData.reportType === "Payment Report") {
          renderPaymentTable(doc, reportData.details, tableHeaderBg, borderColor, alternatingRowBg, textColor);
        } else if (reportData.reportType === "Blockchain Audit Report") {
          renderBlockchainTable(doc, reportData.details, tableHeaderBg, borderColor, alternatingRowBg, textColor);
        }
      } else {
        doc.fillColor(secondaryTextColor).fontSize(10).font("Helvetica-Oblique").text("No records found matching the specified report criteria.", 40, doc.y + 10);
      }

      // Add Footer with Page Numbers
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.rect(40, doc.page.height - 35, doc.page.width - 80, 0.5).fill(borderColor);
        doc.fillColor(secondaryTextColor).fontSize(8).font("Helvetica")
          .text("FCR-SCS Audit Subsystem • Land Acquisition Act 1960 • Confidential", 40, doc.page.height - 25, { align: "left" });
        doc.text(`Page ${i + 1} of ${totalPages}`, doc.page.width - 120, doc.page.height - 25, { width: 80, align: "right" });
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

const TABLE_MARGIN_X = 40;
const CELL_PAD_X = 4;
const CELL_PAD_Y = 4;
const CELL_FONT_SIZE = 7.5;
const HEADER_HEIGHT = 20;
const FOOTER_RESERVE = 45;

/**
 * Draws a table whose row heights follow the wrapped cell content, so no value
 * is clipped. Every row is emitted — rows flow onto new pages instead of being
 * dropped, and the column header is redrawn on each page.
 */
function renderTable(
  doc: PDFKit.PDFDocument,
  columns: PdfColumn[],
  items: any[],
  headerBg: string,
  borderColor: string,
  altBg: string,
  textCol: string
) {
  const startX = TABLE_MARGIN_X;
  const tableWidth = doc.page.width - TABLE_MARGIN_X * 2;
  let y = doc.y;

  const drawHeader = () => {
    doc.rect(startX, y, tableWidth, HEADER_HEIGHT).fill(headerBg);
    doc.rect(startX, y, tableWidth, HEADER_HEIGHT).stroke(borderColor);
    doc.fillColor(textCol).fontSize(8).font("Helvetica-Bold");
    let x = startX;
    columns.forEach((col) => {
      doc.text(col.header, x + CELL_PAD_X, y + 6, { width: col.width - CELL_PAD_X * 2 });
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
    doc.rect(startX, y, tableWidth, rowHeight).stroke(borderColor);

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

function renderCaseStatusTable(doc: PDFKit.PDFDocument, items: any[], headerBg: string, borderColor: string, altBg: string, textCol: string) {
  renderTable(
    doc,
    [
      { header: "Case Ref", width: 75, value: (i) => i.caseId || "-" },
      { header: "Case Title", width: 120, value: (i) => i.title || i.caseTitle || "-" },
      { header: "Project / Location", width: 115, value: (i) => i.location || `${i.state || "Selangor"} / ${i.district || "Petaling"}` },
      { header: "Current Status", width: 105, value: (i) => i.status || "-" },
      { header: "Reg Date", width: 55, value: (i) => i.date || i.registrationDate || "-" },
      { header: "Aging", width: 45, value: (i) => i.lifecycleAging || `${i.agingDays || 0}d` },
    ],
    items,
    headerBg,
    borderColor,
    altBg,
    textCol
  );
}

function renderPaymentTable(doc: PDFKit.PDFDocument, items: any[], headerBg: string, borderColor: string, altBg: string, textCol: string) {
  renderTable(
    doc,
    [
      { header: "Case Ref", width: 85, value: (i) => i.caseId || "-" },
      { header: "Disbursement", width: 95, value: (i) => i.amount || i.formattedAmount || "-" },
      { header: "Bank Details", width: 80, value: (i) => i.bankName || i.bankDetails || "Bank Transfer" },
      { header: "Bank Reference No.", width: 110, value: (i) => i.bankReference || "-" },
      { header: "Status", width: 85, value: (i) => i.status || "-" },
      { header: "Date", width: 60, value: (i) => i.date || i.createdAt || "-" },
    ],
    items,
    headerBg,
    borderColor,
    altBg,
    textCol
  );
}

function renderBlockchainTable(doc: PDFKit.PDFDocument, items: any[], headerBg: string, borderColor: string, altBg: string, textCol: string) {
  renderTable(
    doc,
    [
      { header: "Case Ref", width: 80, value: (i) => i.caseId || "-" },
      { header: "On-chain Transaction Hash", width: 135, value: (i) => i.transactionHash || "-" },
      { header: "Document Hash (SHA-256)", width: 110, value: (i) => i.documentHash || "-" },
      { header: "Verification Status", width: 110, value: (i) => i.status || i.verificationStatus || "-" },
      { header: "Published Date", width: 80, value: (i) => i.publishedAt || "-" },
    ],
    items,
    headerBg,
    borderColor,
    altBg,
    textCol
  );
}
