process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";

import { prisma } from "../prisma";
import {
  calculateNextWorkingDayMYT,
  rejectBankTransfer,
  scheduleTomorrow,
  checkAndAutoExecuteScheduledTransfers,
  formatPaymentResponse,
  newPaymentId,
} from "../services/payment.service";
import { PaymentStatus, CaseStatus } from "@prisma/client";

describe("Bank Rejection & Scheduled Transfer SOP", () => {
  let createdCaseId: string;
  let createdPaymentCaseId: string;
  let testLandOwnerId: string;
  let testProjectId: string;
  let testCreatedById: string;

  beforeAll(async () => {
    const existingAc = await prisma.acquisitionCase.findFirst();
    testProjectId = existingAc!.projectId;
    testCreatedById = existingAc!.createdById;

    const lo = await prisma.landOwner.findFirst();
    testLandOwnerId = lo!.ownerId;
  });

  afterAll(async () => {
    if (createdPaymentCaseId) {
      await prisma.failedTransaction.deleteMany({ where: { paymentCaseId: createdPaymentCaseId } });
      await prisma.paymentAuthorisation.deleteMany({ where: { paymentCaseId: createdPaymentCaseId } });
      await prisma.paymentCase.deleteMany({ where: { id: createdPaymentCaseId } });
    }
    if (createdCaseId) {
      await prisma.acquisitionCase.deleteMany({ where: { caseId: createdCaseId } });
    }
    await prisma.$disconnect();
  });

  describe("calculateNextWorkingDayMYT", () => {
    it("rolls Wednesday 10:00 AM MYT forward to Thursday 09:00 AM MYT", () => {
      // 2026-09-16 02:00:00 UTC = 2026-09-16 10:00:00 MYT (Wednesday)
      const wednesday = new Date("2026-09-16T02:00:00.000Z");
      const nextDay = calculateNextWorkingDayMYT(wednesday);

      // Expected: 2026-09-17 01:00:00 UTC = 2026-09-17 09:00:00 MYT (Thursday)
      expect(nextDay.toISOString()).toBe("2026-09-17T01:00:00.000Z");
    });

    it("rolls Friday 04:00 PM MYT forward to Monday 09:00 AM MYT", () => {
      // 2026-09-18 08:00:00 UTC = 2026-09-18 16:00:00 MYT (Friday)
      const friday = new Date("2026-09-18T08:00:00.000Z");
      const nextDay = calculateNextWorkingDayMYT(friday);

      // Expected: 2026-09-21 01:00:00 UTC = 2026-09-21 09:00:00 MYT (Monday)
      expect(nextDay.toISOString()).toBe("2026-09-21T01:00:00.000Z");
    });

    it("rolls Saturday 12:00 PM MYT forward to Monday 09:00 AM MYT", () => {
      // 2026-09-19 04:00:00 UTC = 2026-09-19 12:00:00 MYT (Saturday)
      const saturday = new Date("2026-09-19T04:00:00.000Z");
      const nextDay = calculateNextWorkingDayMYT(saturday);

      expect(nextDay.toISOString()).toBe("2026-09-21T01:00:00.000Z");
    });

    it("rolls Sunday 12:00 PM MYT forward to Monday 09:00 AM MYT", () => {
      // 2026-09-20 04:00:00 UTC = 2026-09-20 12:00:00 MYT (Sunday)
      const sunday = new Date("2026-09-20T04:00:00.000Z");
      const nextDay = calculateNextWorkingDayMYT(sunday);

      expect(nextDay.toISOString()).toBe("2026-09-21T01:00:00.000Z");
    });
  });

  describe("rejectBankTransfer status enforcement", () => {
    beforeEach(async () => {
      const stamp = Date.now();
      createdCaseId = `LAC-TEST-REJECT-${stamp}`;
      createdPaymentCaseId = await newPaymentId();

      await prisma.acquisitionCase.create({
        data: {
          caseId: createdCaseId,
          projectId: testProjectId,
          caseTitle: "Bank Rejection Test Case",
          registrationDate: new Date(),
          remarks: "Test for bank rejection",
          createdById: testCreatedById,
          status: CaseStatus.OFFER_ACCEPTED,
        },
      });

      await prisma.paymentCase.create({
        data: {
          id: createdPaymentCaseId,
          caseId: createdCaseId,
          beneficiaryId: testLandOwnerId,
          amount: 500000,
          bankName: "Maybank",
          accountNumber: "1234567890",
          accountHolderName: "Test Landowner",
          status: PaymentStatus.BANK_APPROVAL_PENDING,
          requiredSignatures: 1,
          currentSignatures: 1,
        },
      });
    });

    afterEach(async () => {
      if (createdPaymentCaseId) {
        await prisma.failedTransaction.deleteMany({ where: { paymentCaseId: createdPaymentCaseId } });
        await prisma.paymentCase.deleteMany({ where: { id: createdPaymentCaseId } });
      }
      if (createdCaseId) {
        await prisma.acquisitionCase.deleteMany({ where: { caseId: createdCaseId } });
      }
    });

    it("sets status to TRANSFER_FAILED even when Category 1 reason is selected", async () => {
      const res = await rejectBankTransfer(
        createdCaseId,
        "RECIPIENT_ACCOUNT_CLOSED_OR_FROZEN: Recipient bank account is dormant, frozen, or closed",
        true
      );

      expect(res.status).toBe(PaymentStatus.TRANSFER_FAILED);

      const inDb = await prisma.paymentCase.findUnique({ where: { id: createdPaymentCaseId } });
      expect(inDb?.status).toBe(PaymentStatus.TRANSFER_FAILED);
    });

    it("sets status to TRANSFER_FAILED when Category 2 reason is selected", async () => {
      const res = await rejectBankTransfer(
        createdCaseId,
        "INTERBANK_SWITCH_GATEWAY_TIMEOUT: Interbank switch gateway communication timeout",
        false
      );

      expect(res.status).toBe(PaymentStatus.TRANSFER_FAILED);

      const inDb = await prisma.paymentCase.findUnique({ where: { id: createdPaymentCaseId } });
      expect(inDb?.status).toBe(PaymentStatus.TRANSFER_FAILED);
    });
  });

  describe("scheduleTomorrow and checkAndAutoExecuteScheduledTransfers", () => {
    beforeEach(async () => {
      const stamp = Date.now();
      createdCaseId = `LAC-TEST-SCHED-${stamp}`;
      createdPaymentCaseId = await newPaymentId();

      await prisma.acquisitionCase.create({
        data: {
          caseId: createdCaseId,
          projectId: testProjectId,
          caseTitle: "Bank Rejection Test Case",
          registrationDate: new Date(),
          remarks: "Test for bank rejection",
          createdById: testCreatedById,
          status: CaseStatus.OFFER_ACCEPTED,
        },
      });

      await prisma.paymentCase.create({
        data: {
          id: createdPaymentCaseId,
          caseId: createdCaseId,
          beneficiaryId: testLandOwnerId,
          amount: 750000,
          bankName: "CIMB Bank",
          accountNumber: "9876543210",
          accountHolderName: "Scheduled Beneficiary",
          status: PaymentStatus.BANK_APPROVAL_PENDING,
          requiredSignatures: 1,
          currentSignatures: 1,
        },
      });

      // Simulate initial bank rejection
      await rejectBankTransfer(
        createdCaseId,
        "INTERBANK_SWITCH_GATEWAY_TIMEOUT: Timeout",
        false
      );
    });

    afterEach(async () => {
      if (createdPaymentCaseId) {
        await prisma.failedTransaction.deleteMany({ where: { paymentCaseId: createdPaymentCaseId } });
        await prisma.paymentCase.deleteMany({ where: { id: createdPaymentCaseId } });
      }
      if (createdCaseId) {
        await prisma.acquisitionCase.deleteMany({ where: { caseId: createdCaseId } });
      }
    });

    it("schedules payment for next working day and attaches scheduledFor timestamp", async () => {
      const res = await scheduleTomorrow(createdCaseId);

      expect(res.status).toBe(PaymentStatus.SCHEDULED);
      expect(res.scheduledFor).toBeDefined();

      const scheduledDate = new Date(res.scheduledFor!);
      expect(scheduledDate.getUTCHours()).toBe(1); // 01:00 UTC = 09:00 MYT
    });

    it("auto-executes scheduled transfer to BANK_APPROVAL_PENDING when target date is met", async () => {
      await scheduleTomorrow(createdCaseId);

      // Backdate the failed transaction resolution to simulate target time passed
      const pastDate = new Date(Date.now() - 60_000); // 1 minute in the past
      const ft = await prisma.failedTransaction.findFirst({
        where: { paymentCaseId: createdPaymentCaseId },
        orderBy: { createdAt: "desc" },
      });

      await prisma.failedTransaction.update({
        where: { id: ft!.id },
        data: { resolution: `schedule_next_working_day:${pastDate.toISOString()}` },
      });

      const executedCount = await checkAndAutoExecuteScheduledTransfers();
      expect(executedCount).toBeGreaterThanOrEqual(1);

      const after = await prisma.paymentCase.findUnique({ where: { id: createdPaymentCaseId } });
      expect(after?.status).toBe(PaymentStatus.BANK_APPROVAL_PENDING);
    });
  });
});
