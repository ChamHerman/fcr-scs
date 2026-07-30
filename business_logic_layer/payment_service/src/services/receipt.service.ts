import { prisma } from "../prisma";
import PDFDocument from "pdfkit";

export async function generateReceipt(caseId: string): Promise<Buffer> {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { receipt: true },
  });

  if (!pc) throw new Error("Case not found");
  if (pc.status !== "Paid" || !pc.receipt) {
    throw new Error("No receipt available for this case");
  }

  const receipt = pc.receipt;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    // PDF Content
    doc.fontSize(20).text("PAYMENT RECEIPT", { align: "center" });
    doc.moveDown(1.5);

    doc.fontSize(12).text(`Receipt ID: ${receipt.id}`);
    doc.text(`Bank Reference: ${receipt.bankReferenceNumber}`);
    doc.text(`Date: ${receipt.generatedAt.toLocaleString()}`);
    doc.moveDown(1);

    doc.text("--------------------------------------------------");
    doc.moveDown(1);

    doc.text(`Case ID: ${pc.caseId}`);
    doc.text(`Beneficiary ID: ${pc.beneficiaryId}`);
    doc.text(`Account Holder: ${pc.accountHolderName || "N/A"}`);
    doc.text(`Bank Name: ${pc.bankName || "N/A"}`);
    doc.text(`Account Number: ${pc.accountNumber || "N/A"}`);
    doc.text(`Amount: RM ${Number(pc.amount).toFixed(2)}`);
    doc.moveDown(1);

    doc.fontSize(14).text(`Status: PAID`, { align: "right" });

    doc.end();
  });
}
