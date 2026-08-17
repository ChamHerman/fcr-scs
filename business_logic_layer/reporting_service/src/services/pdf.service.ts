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
      
      doc.fontSize(9).text(`Report ID: ${reportData.reportId || "N/A"}`, doc.page.width - 200, 78, { width: 145, align: "right" });

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
          summaryText = `Total Records: ${reportData.summary.totalRecords ?? 0}  |  Published On-chain: ${reportData.summary.publishedRecords ?? 0}  |  Voided: ${reportData.summary.voidedRecords ?? 0}  |  Ledger Status: ${reportData.summary.integrityStatus ?? 'Verified'}`;
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

function renderCaseStatusTable(doc: PDFKit.PDFDocument, items: any[], headerBg: string, borderColor: string, altBg: string, textCol: string) {
  const colWidths = [75, 120, 115, 105, 55, 45];
  const startX = 40;
  let y = doc.y;

  // Table Header
  doc.rect(startX, y, doc.page.width - 80, 20).fill(headerBg);
  doc.rect(startX, y, doc.page.width - 80, 20).stroke(borderColor);

  doc.fillColor(textCol).fontSize(8).font("Helvetica-Bold");
  doc.text("Case Ref", startX + 5, y + 6, { width: colWidths[0] });
  doc.text("Case Title", startX + colWidths[0] + 5, y + 6, { width: colWidths[1] });
  doc.text("Project / Location", startX + colWidths[0] + colWidths[1] + 5, y + 6, { width: colWidths[2] });
  doc.text("Current Status", startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, y + 6, { width: colWidths[3] });
  doc.text("Reg Date", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, y + 6, { width: colWidths[4] });
  doc.text("Aging", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 5, y + 6, { width: colWidths[5] });

  y += 20;

  // Rows
  items.slice(0, 40).forEach((item, idx) => {
    if (y + 20 > doc.page.height - 45) {
      doc.addPage();
      y = 40;
    }

    const rowBg = idx % 2 === 0 ? "#FFFFFF" : altBg;
    doc.rect(startX, y, doc.page.width - 80, 18).fill(rowBg);
    doc.rect(startX, y, doc.page.width - 80, 18).stroke(borderColor);

    doc.fillColor(textCol).fontSize(7.5).font("Helvetica");
    doc.text(item.caseId || "-", startX + 5, y + 5, { width: colWidths[0] - 8, lineBreak: false });
    doc.text(item.title || item.caseTitle || "-", startX + colWidths[0] + 5, y + 5, { width: colWidths[1] - 8, lineBreak: false });
    doc.text(item.location || `${item.state || 'Selangor'} / ${item.district || 'Petaling'}`, startX + colWidths[0] + colWidths[1] + 5, y + 5, { width: colWidths[2] - 8, lineBreak: false });
    doc.text(item.status || "-", startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, y + 5, { width: colWidths[3] - 8, lineBreak: false });
    doc.text(item.date || item.registrationDate || "-", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, y + 5, { width: colWidths[4] - 8, lineBreak: false });
    doc.text(item.lifecycleAging || `${item.agingDays || 0}d`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 5, y + 5, { width: colWidths[5] - 8, lineBreak: false });

    y += 18;
  });

  doc.y = y + 10;
}

function renderPaymentTable(doc: PDFKit.PDFDocument, items: any[], headerBg: string, borderColor: string, altBg: string, textCol: string) {
  const colWidths = [85, 95, 80, 110, 85, 60];
  const startX = 40;
  let y = doc.y;

  // Header
  doc.rect(startX, y, doc.page.width - 80, 20).fill(headerBg);
  doc.rect(startX, y, doc.page.width - 80, 20).stroke(borderColor);

  doc.fillColor(textCol).fontSize(8).font("Helvetica-Bold");
  doc.text("Case Ref", startX + 5, y + 6, { width: colWidths[0] });
  doc.text("Disbursement", startX + colWidths[0] + 5, y + 6, { width: colWidths[1] });
  doc.text("Bank Details", startX + colWidths[0] + colWidths[1] + 5, y + 6, { width: colWidths[2] });
  doc.text("Bank Reference No.", startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, y + 6, { width: colWidths[3] });
  doc.text("Status", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, y + 6, { width: colWidths[4] });
  doc.text("Date", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 5, y + 6, { width: colWidths[5] });

  y += 20;

  // Rows
  items.slice(0, 40).forEach((item, idx) => {
    if (y + 20 > doc.page.height - 45) {
      doc.addPage();
      y = 40;
    }

    const rowBg = idx % 2 === 0 ? "#FFFFFF" : altBg;
    doc.rect(startX, y, doc.page.width - 80, 18).fill(rowBg);
    doc.rect(startX, y, doc.page.width - 80, 18).stroke(borderColor);

    doc.fillColor(textCol).fontSize(7.5).font("Helvetica");
    doc.text(item.caseId || "-", startX + 5, y + 5, { width: colWidths[0] - 8, lineBreak: false });
    doc.text(item.amount || item.formattedAmount || "-", startX + colWidths[0] + 5, y + 5, { width: colWidths[1] - 8, lineBreak: false });
    doc.text(item.bankName || `${item.bankDetails || 'Bank Transfer'}`, startX + colWidths[0] + colWidths[1] + 5, y + 5, { width: colWidths[2] - 8, lineBreak: false });
    doc.text(item.bankReference || "-", startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, y + 5, { width: colWidths[3] - 8, lineBreak: false });
    doc.text(item.status || "-", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, y + 5, { width: colWidths[4] - 8, lineBreak: false });
    doc.text(item.date || item.createdAt || "-", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 5, y + 5, { width: colWidths[5] - 8, lineBreak: false });

    y += 18;
  });

  doc.y = y + 10;
}

function renderBlockchainTable(doc: PDFKit.PDFDocument, items: any[], headerBg: string, borderColor: string, altBg: string, textCol: string) {
  const colWidths = [80, 135, 110, 110, 80];
  const startX = 40;
  let y = doc.y;

  // Header
  doc.rect(startX, y, doc.page.width - 80, 20).fill(headerBg);
  doc.rect(startX, y, doc.page.width - 80, 20).stroke(borderColor);

  doc.fillColor(textCol).fontSize(8).font("Helvetica-Bold");
  doc.text("Case Ref", startX + 5, y + 6, { width: colWidths[0] });
  doc.text("On-chain Transaction Hash", startX + colWidths[0] + 5, y + 6, { width: colWidths[1] });
  doc.text("Document Hash (SHA-256)", startX + colWidths[0] + colWidths[1] + 5, y + 6, { width: colWidths[2] });
  doc.text("Verification Status", startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, y + 6, { width: colWidths[3] });
  doc.text("Published Date", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, y + 6, { width: colWidths[4] });

  y += 20;

  // Rows
  items.slice(0, 40).forEach((item, idx) => {
    if (y + 20 > doc.page.height - 45) {
      doc.addPage();
      y = 40;
    }

    const rowBg = idx % 2 === 0 ? "#FFFFFF" : altBg;
    doc.rect(startX, y, doc.page.width - 80, 18).fill(rowBg);
    doc.rect(startX, y, doc.page.width - 80, 18).stroke(borderColor);

    doc.fillColor(textCol).fontSize(7.5).font("Helvetica");
    doc.text(item.caseId || "-", startX + 5, y + 5, { width: colWidths[0] - 8, lineBreak: false });
    const tx = item.transactionHash || "-";
    doc.text(tx.length > 25 ? `${tx.slice(0, 16)}...` : tx, startX + colWidths[0] + 5, y + 5, { width: colWidths[1] - 8, lineBreak: false });
    const docHash = item.documentHash || "-";
    doc.text(docHash.length > 25 ? `${docHash.slice(0, 16)}...` : docHash, startX + colWidths[0] + colWidths[1] + 5, y + 5, { width: colWidths[2] - 8, lineBreak: false });
    doc.text(item.status || item.verificationStatus || "-", startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, y + 5, { width: colWidths[3] - 8, lineBreak: false });
    doc.text(item.publishedAt || "-", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, y + 5, { width: colWidths[4] - 8, lineBreak: false });

    y += 18;
  });

  doc.y = y + 10;
}
