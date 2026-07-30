import request from "supertest";
import { app } from "../index";
import { prisma } from "../prisma";

jest.mock("../prisma", () => ({
  prisma: {
    receiverBankDetails: {
      create: jest.fn(),
    },
  },
}));

describe("Bank Details API", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if required fields are missing", async () => {
    const res = await request(app).post("/api/bank-details").send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if myKadNumber is invalid (too short)", async () => {
    const res = await request(app).post("/api/bank-details").send({
      bankName: "Maybank",
      accountNumber: "1234567890",
      accountHolderName: "John Doe",
      phoneNumber: "0123456789",
      myKadNumber: "123", // invalid
      paymentCaseId: "case-123",
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 200 and create record on valid input", async () => {
    (prisma.receiverBankDetails.create as jest.Mock).mockResolvedValue({
      id: "detail-1",
      bankName: "Maybank",
      accountNumber: "1234567890",
      accountHolderName: "John Doe",
      phoneNumber: "0123456789",
      myKadNumber: "900101-14-1234",
      encryptedBankDetails: Buffer.from("1234567890").toString("base64"),
      paymentCaseId: "case-123",
    });

    const res = await request(app).post("/api/bank-details").send({
      bankName: "Maybank",
      accountNumber: "1234567890",
      accountHolderName: "John Doe",
      phoneNumber: "0123456789",
      myKadNumber: "900101-14-1234",
      paymentCaseId: "case-123",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe("detail-1");
    expect(prisma.receiverBankDetails.create).toHaveBeenCalled();
  });
});
