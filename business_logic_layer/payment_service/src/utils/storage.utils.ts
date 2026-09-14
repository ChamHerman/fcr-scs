import fs from "fs";
import path from "path";

/**
 * Filesystem home for member-uploaded dispute bank statements, mirroring the
 * offer-letter signed-document storage: files live under
 * data_layer/document_storage/payment_dispute/<caseId>/ and the relative
 * path is what gets persisted on the PaymentCase row.
 */
export function getPaymentDisputeStorageDir(caseId: string): string {
  const c1 = path.resolve(__dirname, "../../../../data_layer/document_storage/payment_dispute", caseId);
  const c2 = path.resolve(process.cwd(), "data_layer/document_storage/payment_dispute", caseId);
  const c3 = path.resolve(process.cwd(), "../data_layer/document_storage/payment_dispute", caseId);
  if (fs.existsSync(path.dirname(c1))) return c1;
  if (fs.existsSync(path.dirname(c2))) return c2;
  if (fs.existsSync(path.dirname(c3))) return c3;
  return c1;
}
