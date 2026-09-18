import * as fs from "fs";
import * as path from "path";
import { verifyDocument } from "../services/blockchain.service";

describe("Document Verification - Altered Document Milestone & Case Detection", () => {
  const findPath = (rel: string) => {
    const candidates = [
      path.resolve(process.cwd(), rel),
      path.resolve(process.cwd(), "../..", rel),
      path.resolve(__dirname, "../../../../..", rel),
    ];
    return candidates.find((c) => fs.existsSync(c)) || candidates[0];
  };

  const rcptPath = findPath(
    "data_layer/document_storage/payment_receipt/LAC-2026-09-0001/Payment_Receipt.pdf"
  );
  const formHPath = findPath(
    "data_layer/document_storage/offer_letter/LAC-2026-09-0001/Signed_1789749637661_Zalikha_binti_Yusoff_-_63c756a9-0e4f-41ef-ae0d-4679fdce7d15.pdf"
  );

  it("detects altered payment receipt as M2 (Payment Settlement) with correct settlement hash", async () => {
    expect(fs.existsSync(rcptPath)).toBe(true);
    const origBuf = fs.readFileSync(rcptPath);

    // Alter 2 bytes
    const altered = Buffer.from(origBuf);
    altered[100] = (altered[100] + 1) % 256;
    altered[101] = (altered[101] + 1) % 256;

    const result = await verifyDocument(altered, "Payment_Receipt.pdf");

    expect(result.verified).toBe(false);
    expect(result.status).toBe("Altered");
    expect(result.milestone).toBe("M2");
    expect(result.caseId).toBe("LAC-2026-09-0001");
    expect(result.isPublished).toBe(true);
    // On-chain hash must be M2 settlement hash, NOT M1 award hash
    expect(result.onChainHash).toBe("0x93f49b0ea37fad6017528d021c1b19774d7d1b8a45fe12c004a32e8aef3a7cd3");
    expect(result.message).toContain("LAC-2026-09-0001");
  });

  it("detects altered Form H as M1 (Statutory Award) instead of Record Not Found", async () => {
    expect(fs.existsSync(formHPath)).toBe(true);
    const origBuf = fs.readFileSync(formHPath);

    // Alter 2 bytes
    const altered = Buffer.from(origBuf);
    altered[100] = (altered[100] + 1) % 256;
    altered[101] = (altered[101] + 1) % 256;

    // Test with actual saved filename
    const resultWithFileName = await verifyDocument(
      altered,
      "Signed_1789749637661_Zalikha_binti_Yusoff_-_63c756a9-0e4f-41ef-ae0d-4679fdce7d15.pdf"
    );

    expect(resultWithFileName.verified).toBe(false);
    expect(resultWithFileName.status).toBe("Altered");
    expect(resultWithFileName.milestone).toBe("M1");
    expect(resultWithFileName.caseId).toBe("LAC-2026-09-0001");
    expect(resultWithFileName.isPublished).toBe(true);
    // On-chain hash must be M1 award hash
    expect(resultWithFileName.onChainHash).toBe("0xcb9a9055bc44653eb232ee7213ce4a03b858eb33f97733734826d2025bcc68ae");

    // Test with generic filename (proves structural / storage matching works without filename hint)
    const resultGeneric = await verifyDocument(altered, "random_edited_file.pdf");

    expect(resultGeneric.verified).toBe(false);
    expect(resultGeneric.status).toBe("Altered");
    expect(resultGeneric.milestone).toBe("M1");
    expect(resultGeneric.caseId).toBe("LAC-2026-09-0001");
    expect(resultGeneric.isPublished).toBe(true);
    expect(resultGeneric.onChainHash).toBe("0xcb9a9055bc44653eb232ee7213ce4a03b858eb33f97733734826d2025bcc68ae");
  });

  it("returns authentic for unaltered payment receipt", async () => {
    const origBuf = fs.readFileSync(rcptPath);
    const result = await verifyDocument(origBuf, "Payment_Receipt.pdf");

    expect(result.verified).toBe(true);
    expect(result.status).toBe("Authentic");
    expect(result.milestone).toBe("M2");
    expect(result.caseId).toBe("LAC-2026-09-0001");
  });

  it("returns authentic for unaltered Form H", async () => {
    const origBuf = fs.readFileSync(formHPath);
    const result = await verifyDocument(origBuf, "Signed_Form_H.pdf");

    expect(result.verified).toBe(true);
    expect(result.status).toBe("Authentic");
    expect(result.milestone).toBe("M1");
    expect(result.caseId).toBe("LAC-2026-09-0001");
  });

  it("returns Not Found for completely unknown/random PDF", async () => {
    const dummyPdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
    const result = await verifyDocument(dummyPdf, "unknown.pdf");

    expect(result.verified).toBe(false);
    expect(result.status).toBe("Not Found");
  });
});
