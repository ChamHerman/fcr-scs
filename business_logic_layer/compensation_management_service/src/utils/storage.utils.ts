import fs from "fs";
import path from "path";

export function getOfferLetterStorageDir(caseId: string): string {
  const c1 = path.resolve(__dirname, "../../../../data_layer/document_storage/offer_letter", caseId);
  const c2 = path.resolve(process.cwd(), "data_layer/document_storage/offer_letter", caseId);
  const c3 = path.resolve(process.cwd(), "../data_layer/document_storage/offer_letter", caseId);
  if (fs.existsSync(path.dirname(c1))) return c1;
  if (fs.existsSync(path.dirname(c2))) return c2;
  if (fs.existsSync(path.dirname(c3))) return c3;
  return c1;
}

export function getObjectionStorageDir(caseId: string): string {
  const c1 = path.resolve(__dirname, "../../../../data_layer/document_storage/objections", caseId);
  const c2 = path.resolve(process.cwd(), "data_layer/document_storage/objections", caseId);
  const c3 = path.resolve(process.cwd(), "../data_layer/document_storage/objections", caseId);
  if (fs.existsSync(path.dirname(c1))) return c1;
  if (fs.existsSync(path.dirname(c2))) return c2;
  if (fs.existsSync(path.dirname(c3))) return c3;
  return c1;
}

