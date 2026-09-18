import * as fs from "fs";
import * as path from "path";
import { verifyDocument } from "../services/blockchain.service";

describe("Document Verification - Milestone & Case Detection (M1 published vs M2 unpublished)", () => {
  const findPath = (rel: string) => {
    const candidates = [
      path.resolve(process.cwd(), rel),
      path.resolve(process.cwd(), "../..", rel),
      path.resolve(__dirname, "../../../../..", rel),
    ];
    return candidates.find((c) => fs.existsSync(c)) || candidates[0];
  };

  const rcptPath = findPath(
    "data_layer/document_storage/payment_receipt/LAC-2026-08-0003/Payment_Receipt.pdf"
  );
  const formHPath = findPath(
    "data_layer/document_storage/offer_letter/LAC-2026-08-0003/Signed_Form_H_seed.pdf"
  );

  it("returns Not Found with milestone M2 for unaltered receipt when M2 has not been published yet", async () => {
    expect(fs.existsSync(rcptPath)).toBe(true);
    const origBuf = fs.readFileSync(rcptPath);

    const result = await verifyDocument(origBuf, "FCR-Payment-Receipt-LAC-2026-08-0003.pdf");

    expect(result.verified).toBe(false);
    expect(result.status).toBe("Not Found");
    expect(result.milestone).toBe("M2");
    expect(result.caseId).toBe("LAC-2026-08-0003");
    expect(result.isPublished).toBe(false);
    expect(result.localHash).toBe("0xce967d3e10739a5ceca9ecadc75bc30a2b2d714417ce3c265d228ec3944a5a2a");
    expect(result.onChainHash).toBe("0xce967d3e10739a5ceca9ecadc75bc30a2b2d714417ce3c265d228ec3944a5a2a");
    expect(result.message).toMatch(/Milestone 2.*not been published/i);
  });

  it("detects altered payment receipt as M2 Altered when modified", async () => {
    expect(fs.existsSync(rcptPath)).toBe(true);
    const origBuf = fs.readFileSync(rcptPath);

    // Alter 2 bytes
    const altered = Buffer.from(origBuf);
    altered[100] = (altered[100] + 1) % 256;
    altered[101] = (altered[101] + 1) % 256;

    const result = await verifyDocument(altered, "FCR-Payment-Receipt-LAC-2026-08-0003.pdf");

    expect(result.verified).toBe(false);
    expect(result.status).toBe("Altered");
    expect(result.milestone).toBe("M2");
    expect(result.caseId).toBe("LAC-2026-08-0003");
    expect(result.isPublished).toBe(false);
    expect(result.onChainHash).toBe("0xce967d3e10739a5ceca9ecadc75bc30a2b2d714417ce3c265d228ec3944a5a2a");
    expect(result.localHash).not.toBe(result.onChainHash);
  });

  it("returns Authentic for unaltered Form H (M1 published on chain)", async () => {
    expect(fs.existsSync(formHPath)).toBe(true);
    const origBuf = fs.readFileSync(formHPath);

    const result = await verifyDocument(origBuf, "Signed_Form_H_seed.pdf");

    expect(result.verified).toBe(true);
    expect(result.status).toBe("Authentic");
    expect(result.milestone).toBe("M1");
    expect(result.caseId).toBe("LAC-2026-08-0003");
  });

  it("detects altered Form H as M1 Altered when modified", async () => {
    expect(fs.existsSync(formHPath)).toBe(true);
    const origBuf = fs.readFileSync(formHPath);

    // Alter 2 bytes
    const altered = Buffer.from(origBuf);
    altered[100] = (altered[100] + 1) % 256;
    altered[101] = (altered[101] + 1) % 256;

    const result = await verifyDocument(altered, "Signed_Form_H_seed.pdf");

    expect(result.verified).toBe(false);
    expect(result.status).toBe("Altered");
    expect(result.milestone).toBe("M1");
    expect(result.caseId).toBe("LAC-2026-08-0003");
    expect(result.isPublished).toBe(true);
    expect(result.localHash).not.toBe(result.onChainHash);
  });

  it("returns Not Found for completely unknown/random PDF", async () => {
    const dummyPdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
    const result = await verifyDocument(dummyPdf, "unknown.pdf");

    expect(result.verified).toBe(false);
    expect(result.status).toBe("Not Found");
  });
});
