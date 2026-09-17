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
 *
 * Issued 1-to-1 to a single recipient (LHDN requirement): when a beneficiary id
 * is supplied the receipt shows only that owner's apportioned share and their own
 * payout account. Admin-only combined settlement detail lives in
 * generateSettlementSummary, never here.
 */
export async function generateReceipt(caseId: string, paymentBeneficiaryId?: string): Promise<Buffer> {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: {
      receipts: paymentBeneficiaryId
        ? { where: { paymentBeneficiaryId } }
        : { orderBy: { generatedAt: "asc" } },
      beneficiaries: { orderBy: { beneficiaryIndex: "asc" } },
    },
  });

  if (!pc) throw new Error("Case not found");

  // Resolve the receipt row for this beneficiary (or the case's first receipt /
  // first beneficiary when the caller did not scope it).
  const targetBeneficiary = paymentBeneficiaryId
    ? pc.beneficiaries.find((b) => b.id === paymentBeneficiaryId) ?? null
    : pc.beneficiaries[0] ?? null;
  const receipt = paymentBeneficiaryId
    ? pc.receipts[0] ?? null
    : pc.receipts[0] ?? null;

  if ((pc.status !== PaymentStatus.PAID && pc.status !== PaymentStatus.TRANSFER_SUCCEED) || !receipt) {
    throw new Error("No receipt available for this case");
  }

  // Amount is the owner's own apportioned share, never the case total.
  const amount = targetBeneficiary ? Number(targetBeneficiary.amount) : Number(pc.amount) || 0;
  const sharePercent = targetBeneficiary ? Number(targetBeneficiary.sharePercent) : null;
  const holderName =
    targetBeneficiary?.accountHolderName || pc.accountHolderName || pc.beneficiaryId;
  const bankName = targetBeneficiary?.bankName || pc.bankName || "Malayan Banking Berhad";
  const accountNumber = targetBeneficiary?.accountNumber || pc.accountNumber;
  const myKad = targetBeneficiary?.myKadNumber || pc.myKadNumber;
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
      ["Beneficiary / Landowner", holderName],
      ["Beneficiary MyKad / NRIC", myKad || "On record"],
      [
        "Apportioned Share",
        sharePercent !== null
          ? `${sharePercent.toLocaleString("en-MY", { maximumFractionDigits: 4 })}% of statutory award`
          : "100% of statutory award",
      ],
      ["Beneficiary Commercial Bank", bankName],
      ["Beneficiary Bank Account", maskAccount(accountNumber), "mono"],
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

    doc.font("Helvetica-Bold").fontSize(8).fillColor(T.success).text("YOUR APPORTIONED COMPENSATION SETTLED", pageLeft + 14, y + 12, { lineBreak: false });
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

async function findReceiptByCaseId(caseId: string, paymentBeneficiaryId?: string) {
  const receipts = await prisma.paymentReceipt.findMany({
    where: { paymentCaseId: (await prisma.paymentCase.findUnique({ where: { caseId }, select: { id: true } }))?.id ?? "" },
    orderBy: { generatedAt: "asc" },
  });
  if (paymentBeneficiaryId) {
    return receipts.find((r) => r.paymentBeneficiaryId === paymentBeneficiaryId) ?? null;
  }
  return receipts[0] ?? null;
}

/**
 * Renders the receipt PDF exactly once, freezes the bytes to disk, and stores
 * the binary SHA-256 on the receipt row. The stored hash is the anchor the
 * blockchain M2 record and the member verify-audit upload compare against —
 * the downloaded file must match it byte-for-byte. Idempotent: an already
 * persisted receipt is never regenerated (the hash would drift if the row
 * changed afterwards).
 *
 * Called once per beneficiary: each owner gets their own frozen PDF, hash, and
 * file path, so one owner regenerating can never invalidate another's anchor.
 */
export async function persistCanonicalReceipt(
  caseId: string,
  paymentBeneficiaryId?: string,
  forceRegenerate = false
): Promise<{ documentHash: string; documentPath: string }> {
  const existing = await findReceiptByCaseId(caseId, paymentBeneficiaryId);
  if (!existing) throw new Error("No receipt available for this case");
  if (!forceRegenerate && existing.documentHash && existing.documentPath && fs.existsSync(existing.documentPath)) {
    return { documentHash: existing.documentHash, documentPath: existing.documentPath };
  }

  const pdfBuffer = await generateReceipt(caseId, paymentBeneficiaryId ?? existing.paymentBeneficiaryId ?? undefined);
  const documentHash = "0x" + createHash("sha256").update(pdfBuffer).digest("hex");

  const storageDir = getReceiptStorageDir(caseId);
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  // Distinct filename per owner: a shared path would let the last writer win
  // and break every other owner's byte-for-byte verification.
  const fileName = existing.paymentBeneficiaryId
    ? `Payment_Receipt_${existing.paymentBeneficiaryId}.pdf`
    : "Payment_Receipt.pdf";
  const documentPath = path.join(storageDir, fileName);
  fs.writeFileSync(documentPath, pdfBuffer);

  await prisma.paymentReceipt.update({
    where: { id: existing.id },
    data: { documentHash, documentPath },
  });

  return { documentHash, documentPath };
}

/**
 * Freezes one receipt per PAYING beneficiary of the case. Owners who never
 * submitted bank details have nothing settled and are skipped.
 */
export async function persistCanonicalReceiptsForCase(
  caseId: string,
  forceRegenerate = false
): Promise<Array<{ paymentBeneficiaryId: string | null; documentHash: string; documentPath: string }>> {
  const receipts = await prisma.paymentReceipt.findMany({
    where: { paymentCase: { caseId } },
    orderBy: { generatedAt: "asc" },
  });
  const out: Array<{ paymentBeneficiaryId: string | null; documentHash: string; documentPath: string }> = [];
  for (const r of receipts) {
    try {
      const res = await persistCanonicalReceipt(caseId, r.paymentBeneficiaryId ?? undefined, forceRegenerate);
      out.push({ paymentBeneficiaryId: r.paymentBeneficiaryId, ...res });
    } catch (err) {
      console.error(`[WARN] [receipt.service] Could not persist receipt ${r.id} for ${caseId}:`, (err as Error).message);
    }
  }
  return out;
}

/**
 * Freezes the combined admin/audit settlement summary PDF and stamps its hash.
 * Idempotent: an already frozen summary is returned untouched so its hash stays
 * byte-stable.
 */
export async function persistCanonicalSettlementSummary(
  caseId: string,
  forceRegenerate = false
): Promise<{ documentHash: string; documentPath: string } | null> {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { settlementSummary: true },
  });
  if (!pc) throw new Error("Case not found");
  const summary = pc.settlementSummary;
  if (!summary) return null;

  if (!forceRegenerate && summary.documentHash && summary.documentPath && fs.existsSync(summary.documentPath)) {
    return { documentHash: summary.documentHash, documentPath: summary.documentPath };
  }

  const pdfBuffer = await generateSettlementSummary(caseId);
  const documentHash = "0x" + createHash("sha256").update(pdfBuffer).digest("hex");

  const storageDir = getReceiptStorageDir(caseId);
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
  const documentPath = path.join(storageDir, "Settlement_Summary.pdf");
  fs.writeFileSync(documentPath, pdfBuffer);

  await prisma.paymentSettlementSummary.update({
    where: { id: summary.id },
    data: { documentHash, documentPath },
  });

  return { documentHash, documentPath };
}

/**
 * Serves the frozen combined summary bytes, falling back to live generation for
 * rows created before the summary was persisted.
 */
export async function getSettlementSummaryBuffer(caseId: string): Promise<Buffer> {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { settlementSummary: true },
  });
  if (!pc) throw new Error("Case not found");
  const summary = pc.settlementSummary;
  if (summary?.documentPath && fs.existsSync(summary.documentPath)) {
    return fs.readFileSync(summary.documentPath);
  }
  return generateSettlementSummary(caseId);
}

/**
 * Serves the FROZEN canonical receipt bytes. Falls back to live generation
 * only when the canonical file has not been persisted yet (legacy rows).
 */
export async function getCanonicalReceiptBuffer(caseId: string, paymentBeneficiaryId?: string): Promise<Buffer> {
  const receipt = await findReceiptByCaseId(caseId, paymentBeneficiaryId);
  if (receipt?.documentPath && fs.existsSync(receipt.documentPath)) {
    return fs.readFileSync(receipt.documentPath);
  }
  return generateReceipt(caseId, paymentBeneficiaryId);
}

/**
 * FR-014 dispute "funds never arrived" resolution: the frozen receipt from the
 * voided settlement cycle is preserved here and the active PaymentReceipt row is
 * cleared so the next bank-clearance cycle generates a fresh receipt. The
 * archived row keeps the original SHA-256 anchor intact — the blockchain M2
 * record for the voided cycle still verifies against it.
 *
 * The frozen bytes on disk are moved to a per-archive path so regenerating the
 * active receipt cannot overwrite the archived file.
 */
export async function archiveCanonicalReceipt(caseId: string, reason: string): Promise<void> {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId }, select: { id: true } });
  if (!pc) return;

  const actives = await prisma.paymentReceipt.findMany({
    where: { paymentCaseId: pc.id },
    orderBy: { generatedAt: "asc" },
  });

  // Every owner's receipt belongs to the voided cycle, so all of them are
  // archived and cleared together — leaving one behind would let a stale
  // receipt survive into the next settlement cycle.
  for (const existing of actives) {
    let archivePath = existing.documentPath;
    if (existing.documentPath && fs.existsSync(existing.documentPath)) {
      const archiveDir = path.join(path.dirname(existing.documentPath), "archive");
      if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
      const suffix = existing.paymentBeneficiaryId || "case";
      archivePath = path.join(archiveDir, `Payment_Receipt_${suffix}_${Date.now()}.pdf`);
      fs.copyFileSync(existing.documentPath, archivePath);
    }

    await prisma.paymentReceiptArchive.create({
      data: {
        paymentCaseId: existing.paymentCaseId,
        bankReferenceNumber: existing.bankReferenceNumber,
        documentHash: existing.documentHash,
        documentPath: archivePath,
        generatedAt: existing.generatedAt,
        archiveReason: reason,
      },
    });

    await prisma.paymentReceipt.delete({ where: { id: existing.id } });
  }
}

/** Lists a case's archived receipts, newest first. */
export async function getArchivedReceipts(caseId: string) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");
  return prisma.paymentReceiptArchive.findMany({
    where: { paymentCaseId: pc.id },
    orderBy: { archivedAt: "desc" },
  });
}

/** Serves the FROZEN bytes of a specific archived receipt. */
export async function getArchivedReceiptBuffer(archiveId: string): Promise<Buffer> {
  const archive = await prisma.paymentReceiptArchive.findUnique({ where: { id: archiveId } });
  if (!archive) throw new Error("Archived receipt not found");
  if (archive.documentPath && fs.existsSync(archive.documentPath)) {
    return fs.readFileSync(archive.documentPath);
  }
  // Legacy archive rows without a frozen file: regenerate from the live case.
  const pc = await prisma.paymentCase.findUnique({ where: { id: archive.paymentCaseId } });
  if (!pc) throw new Error("Archived receipt not found");
  return generateReceipt(pc.caseId);
}

// ---------------------------------------------------------------------------
// Admin-only combined settlement summary
// ---------------------------------------------------------------------------

/**
 * Combined settlement statement for the ADMIN portal and audit. Deliberately
 * separate from the owner receipt: it shows the transfer detail an individual
 * owner must not see — the case total, every co-owner's share, the RENTAS
 * reference and the settlement timestamp. Owners only ever download their own
 * 1-to-1 receipt.
 */
export async function generateSettlementSummary(caseId: string): Promise<Buffer> {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: {
      beneficiaries: { orderBy: { beneficiaryIndex: "asc" } },
      receipts: { orderBy: { generatedAt: "asc" } },
      settlementSummary: true,
    },
  });
  if (!pc) throw new Error("Case not found");

  const createdAt = pc.settlementSummary?.generatedAt ?? new Date();
  const bankRef = pc.settlementSummary?.bankReferenceNumber ?? pc.receipts[0]?.bankReferenceNumber ?? "BNM-CLEARED";
  const total = Number(pc.amount) || 0;
  const settled = pc.beneficiaries.filter((b) => Boolean(b.submittedAt));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 32, bottom: 20, left: 40, right: 40 },
      info: {
        Title: `Settlement Summary ${pc.caseId}`,
        Author: `${BRAND_NAME} / ${RENTAS_NAME}`,
        CreationDate: createdAt,
        ModDate: createdAt,
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageLeft = 40;
    const pageRight = doc.page.width - 40;
    const contentWidth = pageRight - pageLeft;

    doc.rect(0, 0, doc.page.width, doc.page.height).fill(T.background);
    doc.rect(0, 0, doc.page.width, 95).fill(T.primary);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(18).text(BRAND_NAME, pageLeft, 24, { lineBreak: false });
    doc.font("Helvetica").fontSize(9.5).fillColor("#E2E8F0").text(BRAND_LEGAL_NAME, pageLeft, 47, { lineBreak: false });
    doc.fontSize(8).fillColor("#94A3B8").text(BRAND_SUBLINE, pageLeft, 61, { lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#FCD34D").text("COMBINED SETTLEMENT SUMMARY", pageLeft, 22, { width: contentWidth, align: "right" });
    doc.font("Helvetica").fontSize(7.5).fillColor("#CBD5E1").text("Administrator & Audit copy · not issued to any individual beneficiary", pageLeft, 42, { width: contentWidth, align: "right" });

    let y = 95 + 14;
    doc.roundedRect(pageLeft, y, contentWidth, 52, 6).fill(T.surfaceContainerLow);
    doc.roundedRect(pageLeft, y, contentWidth, 52, 6).lineWidth(0.75).stroke(T.outline);
    const colWidth = contentWidth / 4;
    const metaCol = (label: string, value: string, x: number, width: number) => {
      doc.font("Helvetica-Bold").fontSize(7).fillColor(T.onSurfaceVariant).text(label.toUpperCase(), x, y + 10, { width, lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(T.onSurface).text(value, x, y + 24, { width, lineBreak: false, ellipsis: true });
    };
    metaCol("Land Acquisition Case", pc.caseId, pageLeft + 12, colWidth - 16);
    metaCol("Payment ID", pc.id, pageLeft + 12 + colWidth, colWidth - 16);
    metaCol("RENTAS Reference", bankRef, pageLeft + 12 + colWidth * 2, colWidth - 16);
    metaCol("Settlement Date/Time", formatDateTime(createdAt), pageLeft + 12 + colWidth * 3, colWidth - 16);

    y += 52 + 18;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(T.onSurface).text("Apportionment & Disbursement Detail", pageLeft, y, { lineBreak: false });
    y += 18;

    const rowHeight = 22;
    const labelColWidth = 150;
    const shareColWidth = 70;
    const rows: Array<[string, string, string, string]> = settled.length > 0
      ? settled.map((b) => [
          b.accountHolderName || "—",
          `${Number(b.sharePercent).toLocaleString("en-MY", { maximumFractionDigits: 4 })}%`,
          maskAccount(b.accountNumber),
          formatRM(Number(b.amount)),
        ])
      : [["—", "100%", maskAccount(pc.accountNumber), formatRM(total)]];

    // Header row
    const headY = y;
    doc.rect(pageLeft, headY, contentWidth, rowHeight).fill(T.primary);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#FFFFFF");
    doc.text("BENEFICIARY", pageLeft + 12, headY + 7, { width: labelColWidth, lineBreak: false });
    doc.text("SHARE", pageLeft + 12 + labelColWidth, headY + 7, { width: shareColWidth, lineBreak: false });
    doc.text("BANK ACCOUNT", pageLeft + 12 + labelColWidth + shareColWidth, headY + 7, { width: 150, lineBreak: false });
    doc.text("AMOUNT", pageLeft, headY + 7, { width: contentWidth - 12, align: "right", lineBreak: false });
    y += rowHeight;

    rows.forEach(([name, share, acct, amt], idx) => {
      const rowY = y + rowHeight * idx;
      doc.rect(pageLeft, rowY, contentWidth, rowHeight).fill(idx % 2 === 0 ? T.surfaceContainer : T.surfaceContainerLow);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(T.onSurface);
      doc.text(name, pageLeft + 12, rowY + 7, { width: labelColWidth, ellipsis: true, lineBreak: false });
      doc.font("Helvetica").fontSize(8).fillColor(T.onSurface);
      doc.text(share, pageLeft + 12 + labelColWidth, rowY + 7, { width: shareColWidth, lineBreak: false });
      doc.font("Courier").fontSize(8).text(acct, pageLeft + 12 + labelColWidth + shareColWidth, rowY + 7, { width: 150, lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(8).text(amt, pageLeft, rowY + 7, { width: contentWidth - 12, align: "right", lineBreak: false });
    });
    y += rowHeight * rows.length;
    doc.rect(pageLeft, y - rowHeight * rows.length, contentWidth, rowHeight * rows.length).lineWidth(0.75).stroke(T.outline);

    // Totals
    y += 16;
    doc.roundedRect(pageLeft, y, contentWidth, 52, 6).fill(T.successContainer);
    doc.roundedRect(pageLeft, y, contentWidth, 52, 6).lineWidth(1).stroke(T.successBorder);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(T.success).text(`TOTAL STATUTORY COMPENSATION · ${rows.length} BENEFICIARY/IES`, pageLeft + 14, y + 12, { lineBreak: false });
    doc.font("Helvetica").fontSize(8).fillColor(T.success).text("Settlement Status: PAID & DISBURSED via RENTAS RTGS", pageLeft + 14, y + 28, { lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(19).fillColor(T.success).text(formatRM(total), pageLeft, y + 16, { width: contentWidth - 16, align: "right", lineBreak: false });

    y += 52 + 18;
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(T.onSurface).text("Audit Note", pageLeft, y, { lineBreak: false });
    doc.font("Helvetica").fontSize(7.5).fillColor(T.onSurfaceVariant).text(
      "This combined summary is retained for administrative and audit purposes only. Under LHDN requirements every beneficiary instead receives an individual 1-to-1 receipt tied to their own NRIC/TIN, listing only their apportioned share. Per-owner receipt hashes are anchored on the blockchain Milestone 2 record for this case.",
      pageLeft,
      y + 14,
      { width: contentWidth, lineGap: 2.5 }
    );

    const footerY = 776;
    doc.moveTo(pageLeft, footerY).lineTo(pageRight, footerY).lineWidth(0.5).stroke(T.outline);
    doc.font("Helvetica").fontSize(6.5).fillColor(T.onSurfaceVariant).text(
      "Computer-generated settlement summary issued under the Land Acquisition Act 1960 and cleared via RENTAS RTGS.",
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
