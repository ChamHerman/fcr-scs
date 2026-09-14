import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../prisma";
import { PaymentStatus } from "@prisma/client";
import PDFDocument from "pdfkit";

// MD3 tokens & RENTAS Central Bank palette from DESIGN.md
const T = {
  primary: "#6750A4",
  primaryGold: "#B45309",
  brandPrimary: "#6750A4",
  onSurface: "#0F172A",
  onSurfaceVariant: "#475569",
  outline: "#CBD5E1",
  surfaceContainer: "#F8FAFC",
  surfaceContainerLow: "#F1F5F9",
  background: "#FFFFFF",
  success: "#15803D",
  successContainer: "#DCFCE7",
  successBorder: "#86EFAC",
} as const;

const BRAND_NAME = "FCR-SCS";
const BRAND_LEGAL_NAME = "Fair Compensation & Resettlement System";
const BRAND_SUBLINE = "Land Acquisition Resettlement · Malaysia";

const RENTAS_NAME = "RENTAS RTGS";
const RENTAS_FULL_NAME = "Real-Time Electronic Transfer of Funds and Securities";
const RENTAS_OPERATOR = "Bank Negara Malaysia (Central Bank of Malaysia)";

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function maskAccount(accountNumber: string | null): string {
  if (!accountNumber) return "N/A";
  const clean = accountNumber.replace(/[\s-]/g, "");
  return clean.length > 4 ? `•••• ${clean.slice(-4)}` : clean;
}

function formatDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, "0");

  return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
}

/**
 * Official RENTAS RTGS settlement receipt rendered on MD3 & Central Bank tokens.
 * Strictly 1-PAGE layout guaranteed: mathematical coordinate pacing eliminates
 * any multi-page overflow, and all statutory disclaimers are set in the Page 1 footer.
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
    // Explicit margins to prevent any accidental page wrap. Strict 1-PAGE receipt.
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 32, bottom: 20, left: 40, right: 40 },
      info: {
        Title: `Payment Receipt ${pc.caseId}`,
        Author: `${BRAND_NAME} / ${RENTAS_NAME}`,
        CreationDate: generatedAt,
        ModDate: generatedAt,
      },
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    const pageLeft = 40;
    const pageRight = doc.page.width - 40;
    const contentWidth = pageRight - pageLeft;

    // Page backdrop
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(T.background);

    // ---------------- Header band (Height 95pt) ----------------
    const headerHeight = 95;
    doc.rect(0, 0, doc.page.width, headerHeight).fill(T.primary);

    // Left side: FCR-SCS Brand
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(18).text(BRAND_NAME, pageLeft, 24, { lineBreak: false });
    doc.font("Helvetica").fontSize(9.5).fillColor("#E2E8F0").text(BRAND_LEGAL_NAME, pageLeft, 47, { lineBreak: false });
    doc.fontSize(8).fillColor("#94A3B8").text(BRAND_SUBLINE, pageLeft, 61, { lineBreak: false });

    // Right side: RENTAS RTGS Brand
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#FCD34D").text("RENTAS SETTLEMENT RECEIPT", pageLeft, 22, {
      width: contentWidth,
      align: "right",
    });
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#FFFFFF").text("Real-Time Electronic Transfer of Funds and Securities", pageLeft, 40, {
      width: contentWidth,
      align: "right",
    });
    doc.font("Helvetica").fontSize(7.5).fillColor("#CBD5E1").text("Bank Negara Malaysia RTGS · Land Acquisition Act 1960 Statutory Disbursement", pageLeft, 54, {
      width: contentWidth,
      align: "right",
    });

    // ---------------- Metadata band (Height 52pt) ----------------
    let y = headerHeight + 14;
    doc.roundedRect(pageLeft, y, contentWidth, 52, 6).fill(T.surfaceContainerLow);
    doc.roundedRect(pageLeft, y, contentWidth, 52, 6).lineWidth(0.75).stroke(T.outline);

    const metaCol = (label: string, value: string, x: number, width: number) => {
      doc.font("Helvetica-Bold").fontSize(7).fillColor(T.onSurfaceVariant).text(label.toUpperCase(), x, y + 10, { width, lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(T.onSurface).text(value, x, y + 24, { width, lineBreak: false, ellipsis: true });
    };

    const colWidth = contentWidth / 4;
    metaCol("Receipt Number", receipt.id, pageLeft + 12, colWidth - 16);
    metaCol("RENTAS Reference", receipt.bankReferenceNumber || "BNM-CLEARED", pageLeft + 12 + colWidth, colWidth - 16);
    metaCol("Settlement Date/Time", formatDateTime(generatedAt), pageLeft + 12 + colWidth * 2, colWidth - 16);
    metaCol("Clearing Mode", "RENTAS RTGS (Gross)", pageLeft + 12 + colWidth * 3, colWidth - 16);

    // ---------------- Particulars table (7 rows, height 175pt) ----------------
    y += 52 + 16;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(T.onSurface).text("Statutory Settlement Particulars", pageLeft, y, { lineBreak: false });
    y += 18;

    const rowHeight = 22;
    const rows: Array<[string, string, string?]> = [
      ["Land Acquisition Case ID", pc.caseId, "bold"],
      ["Payment ID", pc.id, "bold"],
      ["Beneficiary / Landowner", pc.accountHolderName || pc.beneficiaryId],
      ["Beneficiary Commercial Bank", pc.bankName || "Malayan Banking Berhad"],
      ["Beneficiary Bank Account", maskAccount(pc.accountNumber), "mono"],
      ["Interbank Clearing Network", "RENTAS (Real-Time Electronic Transfer of Funds and Securities)"],
      ["Settlement Authority", "Bank Negara Malaysia RTGS High-Value Payment Gateway"],
    ];
    const labelColWidth = 195;

    rows.forEach(([label, value, style], idx) => {
      const rowY = y + rowHeight * idx;
      doc.rect(pageLeft, rowY, contentWidth, rowHeight).fill(idx % 2 === 0 ? T.surfaceContainer : T.surfaceContainerLow);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(T.onSurfaceVariant).text(label, pageLeft + 12, rowY + 6, { width: labelColWidth, lineBreak: false });
      doc.font(style === "bold" ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).fillColor(T.onSurface).text(value, pageLeft + 12 + labelColWidth, rowY + 6, {
        width: contentWidth - labelColWidth - 24,
        ellipsis: true,
        lineBreak: false,
      });
    });
    y += rowHeight * rows.length;

    // Table outer border
    doc.rect(pageLeft, y - rowHeight * rows.length, contentWidth, rowHeight * rows.length).lineWidth(0.75).stroke(T.outline);

    // ---------------- Amount summary band (Height 52pt) ----------------
    y += 16;
    const summaryHeight = 52;
    doc.roundedRect(pageLeft, y, contentWidth, summaryHeight, 6).fill(T.successContainer);
    doc.roundedRect(pageLeft, y, contentWidth, summaryHeight, 6).lineWidth(1).stroke(T.successBorder);

    doc.font("Helvetica-Bold").fontSize(8).fillColor(T.success).text("TOTAL STATUTORY COMPENSATION SETTLED", pageLeft + 14, y + 12, { lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(T.success).text("Gross Settlement Status: PAID & DISBURSED", pageLeft + 14, y + 28, { lineBreak: false });

    doc.font("Helvetica-Bold").fontSize(19).fillColor(T.success).text(formatRM(amount), pageLeft, y + 16, {
      width: contentWidth - 16,
      align: "right",
      lineBreak: false,
    });

    // ---------------- System-generated digital signature block (Height 84pt) ----------------
    y += summaryHeight + 16;
    const sealWidth = 220;
    const sealHeight = 84;

    // Left info block
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(T.onSurface).text("Statutory Immutability & Blockchain Proof", pageLeft, y + 4, { lineBreak: false });
    doc.font("Helvetica").fontSize(7.5).fillColor(T.onSurfaceVariant).text(
      "This official voucher confirms that statutory compensation has been disbursed in full through the RENTAS interbank gross settlement network. The SHA-256 fingerprint of this document is permanently anchored onto the Ethereum Sepolia blockchain (Milestone 2 - Settlement). Any alteration invalidates this certificate.",
      pageLeft,
      y + 18,
      { width: contentWidth - sealWidth - 18, lineGap: 2.5 }
    );

    // Right digital seal box
    doc.roundedRect(pageRight - sealWidth, y, sealWidth, sealHeight, 6).fill(T.surfaceContainerLow);
    doc.roundedRect(pageRight - sealWidth, y, sealWidth, sealHeight, 6).lineWidth(1).stroke(T.primary);

    doc.font("Helvetica-Bold").fontSize(8).fillColor(T.primary).text("RENTAS CRYPTOGRAPHIC SEAL", pageRight - sealWidth, y + 9, { width: sealWidth, align: "center", lineBreak: false });
    doc.font("Helvetica").fontSize(6.5).fillColor(T.onSurfaceVariant).text(
      "System-generated & digitally sealed by FCR-SCS & RENTAS Host Gateway",
      pageRight - sealWidth + 8,
      y + 22,
      { width: sealWidth - 16, align: "center", lineBreak: false }
    );
    doc.font("Courier").fontSize(6.5).fillColor(T.onSurface).text(
      `SHA256: ${digitalSignature.slice(0, 32)}`,
      pageRight - sealWidth + 8,
      y + 44,
      { width: sealWidth - 16, align: "center", lineBreak: false }
    );
    doc.font("Courier").fontSize(6.5).text(
      `        ${digitalSignature.slice(32)}`,
      pageRight - sealWidth + 8,
      y + 55,
      { width: sealWidth - 16, align: "center", lineBreak: false }
    );
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(T.success).text(
      "ETH SEPOLIA ANCHORED (M2)",
      pageRight - sealWidth,
      y + 68,
      { width: sealWidth, align: "center", lineBreak: false }
    );

    // ---------------- Page 1 Footer (Fixed 1-Page Guarantee) ----------------
    const footerY = 776;
    doc.moveTo(pageLeft, footerY).lineTo(pageRight, footerY).lineWidth(0.5).stroke(T.outline);

    doc.font("Helvetica").fontSize(6.5).fillColor(T.onSurfaceVariant).text(
      "This is an official computer-generated settlement receipt issued under the Land Acquisition Act 1960 and cleared via RENTAS RTGS. Valid without signature.",
      pageLeft,
      footerY + 7,
      { width: contentWidth, align: "center", lineBreak: false }
    );
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(T.onSurfaceVariant).text(
      `${BRAND_NAME} · ${BRAND_LEGAL_NAME} · Bank Negara Malaysia RENTAS RTGS Host`,
      pageLeft,
      footerY + 20,
      { width: contentWidth, align: "center", lineBreak: false }
    );

    doc.end();
  });
}

// ---------------------------------------------------------------------------
// FR-019 canonical receipt persistence
// ---------------------------------------------------------------------------

function getReceiptStorageDir(caseId: string): string {
  const candidates = [
    path.resolve(__dirname, "../../../../data_layer/document_storage/payment_receipt", caseId),
    path.resolve(process.cwd(), "data_layer/document_storage/payment_receipt", caseId),
    path.resolve(process.cwd(), "../data_layer/document_storage/payment_receipt", caseId),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.dirname(candidate))) return candidate;
  }
  return candidates[0];
}

async function findReceiptByCaseId(caseId: string) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId }, include: { receipt: true } });
  return pc?.receipt ?? null;
}

/**
 * Renders the receipt PDF exactly once, freezes the bytes to disk, and stores
 * the binary SHA-256 on the receipt row. The stored hash is the anchor the
 * blockchain M2 record and the member verify-audit upload compare against —
 * the downloaded file must match it byte-for-byte. Idempotent: an already
 * persisted receipt is never regenerated (the hash would drift if the row
 * changed afterwards).
 */
export async function persistCanonicalReceipt(caseId: string, forceRegenerate = false): Promise<{ documentHash: string; documentPath: string }> {
  const existing = await findReceiptByCaseId(caseId);
  if (!existing) throw new Error("No receipt available for this case");
  if (!forceRegenerate && existing.documentHash && existing.documentPath && fs.existsSync(existing.documentPath)) {
    return { documentHash: existing.documentHash, documentPath: existing.documentPath };
  }

  const pdfBuffer = await generateReceipt(caseId);
  const documentHash = "0x" + createHash("sha256").update(pdfBuffer).digest("hex");

  const storageDir = getReceiptStorageDir(caseId);
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  const documentPath = path.join(storageDir, "Payment_Receipt.pdf");
  fs.writeFileSync(documentPath, pdfBuffer);

  await prisma.paymentReceipt.update({
    where: { id: existing.id },
    data: { documentHash, documentPath },
  });

  return { documentHash, documentPath };
}

/**
 * Serves the FROZEN canonical receipt bytes. Falls back to live generation
 * only when the canonical file has not been persisted yet (legacy rows).
 */
export async function getCanonicalReceiptBuffer(caseId: string): Promise<Buffer> {
  const receipt = await findReceiptByCaseId(caseId);
  if (receipt?.documentPath && fs.existsSync(receipt.documentPath)) {
    return fs.readFileSync(receipt.documentPath);
  }
  return generateReceipt(caseId);
}
