import { createHash } from "crypto";
import { prisma } from "../prisma";
import { PaymentStatus } from "@prisma/client";
import PDFDocument from "pdfkit";

// MD3 light-theme tokens from DESIGN.md, inlined because the PDF is a
// standalone artefact that must look identical regardless of portal theme.
const T = {
  primary: "#6750A4",
  onSurface: "#1C1B1F",
  onSurfaceVariant: "#49454F",
  outline: "#CAC4D0",
  surfaceContainer: "#F3EDF7",
  surfaceContainerLow: "#E7E0EC",
  background: "#FEF7FF",
  success: "#1B5E20",
  successContainer: "#E8F5E9",
} as const;

const BRAND_NAME = "FCR-SCS";
const BRAND_LEGAL_NAME = "Fair Compensation & Resettlement System";
const BRAND_SUBLINE = "Land Acquisition Resettlement · Malaysia";

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function maskAccount(accountNumber: string | null): string {
  if (!accountNumber) return "N/A";
  const clean = accountNumber.replace(/[\s-]/g, "");
  return clean.length > 4 ? `•••• ${clean.slice(-4)}` : clean;
}

/**
 * FR (receipt redesign): industry-standard official receipt rendered on MD3
 * tokens — branded header, metadata band, tabulated particulars, a prominent
 * amount summary, and a system-generated digital signature block. The document
 * explicitly states it was produced (digitally signed) by the FCR-SCS system,
 * not by any human officer.
 */
export async function generateReceipt(caseId: string): Promise<Buffer> {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { receipt: true },
  });

  if (!pc) throw new Error("Case not found");
  if ((pc.status !== PaymentStatus.PAID && pc.status !== PaymentStatus.TRANSFER_SUCCEED) || !pc.receipt) {
    throw new Error("No receipt available for this case");
  }

  const receipt = pc.receipt;
  const amount = Number(pc.amount) || 0;
  const generatedAt = receipt.generatedAt;
  const digitalSignature = createHash("sha256")
    .update(`${receipt.id}|${pc.caseId}|${amount}|${generatedAt.toISOString()}`)
    .digest("hex")
    .toUpperCase();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56, info: { Title: `Payment Receipt ${pc.caseId}`, Author: BRAND_NAME } });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    const pageLeft = 56;
    const pageRight = doc.page.width - 56;
    const contentWidth = pageRight - pageLeft;

    // Page backdrop
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(T.background);

    // ---------------- Header band ----------------
    const headerHeight = 118;
    doc.rect(0, 0, doc.page.width, headerHeight).fill(T.primary);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(20).text(BRAND_NAME, pageLeft, 34);
    doc.font("Helvetica").fontSize(10.5).fillColor("#E9DDFF").text(BRAND_LEGAL_NAME, pageLeft, 60);
    doc.fontSize(8.5).text(BRAND_SUBLINE, pageLeft, 75);

    doc.font("Helvetica-Bold").fontSize(16).fillColor("#FFFFFF").text("OFFICIAL PAYMENT RECEIPT", {
      width: contentWidth,
      align: "right",
    });
    doc.font("Helvetica").fontSize(8.5).fillColor("#E9DDFF").text("Statutory compensation disbursement under Land Acquisition Act 1960", {
      width: contentWidth,
      align: "right",
    });

    // ---------------- Metadata band ----------------
    let y = headerHeight + 24;
    doc.roundedRect(pageLeft, y, contentWidth, 62, 8).fill(T.surfaceContainer);

    const metaCol = (label: string, value: string, x: number, width: number) => {
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(T.onSurfaceVariant).text(label.toUpperCase(), x, y + 12, { width });
      doc.font("Courier").fontSize(9).fillColor(T.onSurface).text(value, x, y + 26, { width, ellipsis: true });
    };
    const colWidth = contentWidth / 3;
    metaCol("Receipt No.", receipt.id, pageLeft + 16, colWidth - 24);
    metaCol("Payment Reference", receipt.bankReferenceNumber || "N/A", pageLeft + 16 + colWidth, colWidth - 24);
    metaCol("Issue Date & Time", generatedAt.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" }), pageLeft + 16 + colWidth * 2, colWidth - 24);

    // ---------------- Particulars table ----------------
    y += 62 + 28;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(T.onSurface).text("Payment Particulars", pageLeft, y);
    y += 22;

    const rowHeight = 26;
    const rows: Array<[string, string, string?]> = [
      ["Case ID", pc.caseId, "mono"],
      ["Payment ID", pc.id, "mono"],
      ["Beneficiary", pc.accountHolderName || pc.beneficiaryId],
      ["Beneficiary Bank", pc.bankName || "N/A"],
      ["Beneficiary Account", maskAccount(pc.accountNumber), "mono"],
      ["Payment Channel", "Bank Gateway Electronic Fund Transfer"],
    ];
    const labelColWidth = 190;

    rows.forEach(([label, value, style], idx) => {
      const rowY = y + rowHeight * idx;
      doc.rect(pageLeft, rowY, contentWidth, rowHeight).fill(idx % 2 === 0 ? T.surfaceContainer : T.surfaceContainerLow);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(T.onSurfaceVariant).text(label, pageLeft + 14, rowY + 9, { width: labelColWidth });
      doc.font(style === "mono" ? "Courier" : "Helvetica").fontSize(9.5).fillColor(T.onSurface).text(value, pageLeft + 14 + labelColWidth, rowY + 9, {
        width: contentWidth - labelColWidth - 28,
        ellipsis: true,
      });
    });
    y += rowHeight * rows.length;

    // Table border
    doc.rect(pageLeft, y - rowHeight * rows.length, contentWidth, rowHeight * rows.length).lineWidth(1).stroke(T.outline);

    // ---------------- Amount summary ----------------
    y += 20;
    const summaryHeight = 56;
    doc.roundedRect(pageLeft, y, contentWidth, summaryHeight, 8).fill(T.successContainer);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(T.success).text("TOTAL STATUTORY COMPENSATION PAID", pageLeft + 16, y + 12);
    doc.font("Helvetica-Bold").fontSize(20).fillColor(T.success).text(formatRM(amount), pageLeft, y + 26, {
      width: contentWidth - 160,
      align: "right",
    });
    doc.font("Helvetica").fontSize(8).fillColor(T.success).text("Status: PAID", pageLeft + 16, y + 30);

    // ---------------- System-generated digital signature block ----------------
    y += summaryHeight + 24;
    const sealWidth = 210;
    const sealHeight = 92;
    doc.roundedRect(pageRight - sealWidth, y, sealWidth, sealHeight, 8).lineWidth(1.5).stroke(T.primary);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(T.primary).text("DIGITALLY SIGNED", pageRight - sealWidth, y + 12, { width: sealWidth, align: "center" });
    doc.font("Helvetica").fontSize(7.5).fillColor(T.onSurfaceVariant).text(
      "System-generated by the FCR-SCS payment engine. This document was not issued or signed by any human officer.",
      pageRight - sealWidth + 14,
      y + 28,
      { width: sealWidth - 28, align: "center" }
    );
    doc.font("Courier").fontSize(6.5).fillColor(T.onSurfaceVariant).text(
      `SHA-256 ${digitalSignature.slice(0, 32)}`,
      pageRight - sealWidth + 14,
      y + 66,
      { width: sealWidth - 28, align: "center", ellipsis: true }
    );
    doc.font("Courier").fontSize(6.5).text(`        ${digitalSignature.slice(32)}`, pageRight - sealWidth + 14, y + 76, {
      width: sealWidth - 28,
      align: "center",
    });

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(T.onSurfaceVariant)
      .text(
        "The integrity of this receipt can be verified against the FCR-SCS audit ledger using the SHA-256 digital fingerprint above.",
        pageLeft,
        y + 20,
        { width: contentWidth - sealWidth - 24 }
      );

    // ---------------- Footer ----------------
    const footerY = doc.page.height - 72;
    doc.moveTo(pageLeft, footerY).lineTo(pageRight, footerY).lineWidth(0.75).stroke(T.outline);
    doc.font("Helvetica").fontSize(7.5).fillColor(T.onSurfaceVariant).text(
      "This is a computer-generated document and is valid without a handwritten signature.",
      pageLeft,
      footerY + 10,
      { width: contentWidth, align: "center" }
    );
    doc.fontSize(7).text(`${BRAND_NAME} · ${BRAND_LEGAL_NAME}`, pageLeft, footerY + 24, { width: contentWidth, align: "center" });

    doc.end();
  });
}
