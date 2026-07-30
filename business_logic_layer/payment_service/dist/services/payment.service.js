"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRequiredSignatures = calculateRequiredSignatures;
exports.submitBankDetails = submitBankDetails;
exports.initiateTransfer = initiateTransfer;
exports.authoriseTransfer = authoriseTransfer;
exports.rejectTransfer = rejectTransfer;
exports.retryPayment = retryPayment;
exports.requestDetailsUpdate = requestDetailsUpdate;
exports.scheduleTomorrow = scheduleTomorrow;
exports.getPaymentStatus = getPaymentStatus;
exports.getPendingAuthorisations = getPendingAuthorisations;
exports.getAllCases = getAllCases;
exports.getFailedTransactions = getFailedTransactions;
exports.disputePayment = disputePayment;
const prisma_1 = require("../prisma");
const bankService = __importStar(require("./bank.service"));
function calculateRequiredSignatures(amount) {
    return 1 + Math.floor(amount / 1000000);
}
async function submitBankDetails(data) {
    await bankService.validateBankAccount(data.bankName, data.accountNumber);
    return prisma_1.prisma.paymentCase.upsert({
        where: { caseId: data.caseId },
        update: {
            bankName: data.bankName,
            accountNumber: data.accountNumber,
            accountHolderName: data.accountHolderName,
            phoneNumber: data.phoneNumber,
            myKadNumber: data.myKadNumber,
            status: "Bank Details Submitted",
        },
        create: {
            caseId: data.caseId,
            beneficiaryId: "BEN-" + data.caseId,
            amount: 0,
            bankName: data.bankName,
            accountNumber: data.accountNumber,
            accountHolderName: data.accountHolderName,
            phoneNumber: data.phoneNumber,
            myKadNumber: data.myKadNumber,
            status: "Bank Details Submitted",
        },
    });
}
async function initiateTransfer(caseId, adminId) {
    const pc = await prisma_1.prisma.paymentCase.findUnique({ where: { caseId } });
    if (!pc)
        throw new Error("Case not found");
    const requiredSigs = calculateRequiredSignatures(Number(pc.amount));
    await prisma_1.prisma.paymentAuthorisation.create({
        data: {
            paymentCaseId: pc.id,
            adminId,
            action: "initiate",
        },
    });
    return prisma_1.prisma.paymentCase.update({
        where: { caseId },
        data: {
            requiredSignatures: requiredSigs,
            currentSignatures: 1,
            status: "Transfer Initiated",
        },
        include: { authorisations: true, receipt: true },
    });
}
async function authoriseTransfer(caseId, adminId) {
    const pc = await prisma_1.prisma.paymentCase.findUnique({
        where: { caseId },
        include: { authorisations: true },
    });
    if (!pc)
        throw new Error("Case not found");
    const existingAuth = pc.authorisations.find((a) => a.adminId === adminId);
    if (existingAuth) {
        throw new Error("Segregation of duties: Admin cannot authorise their own initiation or double-sign");
    }
    await prisma_1.prisma.paymentAuthorisation.create({
        data: {
            paymentCaseId: pc.id,
            adminId,
            action: "authorise",
        },
    });
    const newCurrentSigs = pc.currentSignatures + 1;
    if (newCurrentSigs >= pc.requiredSignatures) {
        try {
            const bankRef = `BNK-${Date.now()}-${caseId}`;
            await prisma_1.prisma.paymentReceipt.create({
                data: {
                    paymentCaseId: pc.id,
                    bankReferenceNumber: bankRef,
                },
            });
            return prisma_1.prisma.paymentCase.update({
                where: { caseId },
                data: {
                    currentSignatures: newCurrentSigs,
                    status: "Paid",
                },
                include: { authorisations: true, receipt: true },
            });
        }
        catch (e) {
            await prisma_1.prisma.failedTransaction.create({
                data: {
                    paymentCaseId: pc.id,
                    errorLog: e.message || "Bank transfer failed",
                },
            });
            return prisma_1.prisma.paymentCase.update({
                where: { caseId },
                data: {
                    currentSignatures: newCurrentSigs,
                    status: "Transfer Failed",
                },
                include: { authorisations: true, failedTransactions: true },
            });
        }
    }
    else {
        return prisma_1.prisma.paymentCase.update({
            where: { caseId },
            data: {
                currentSignatures: newCurrentSigs,
                status: "Authorised",
            },
            include: { authorisations: true },
        });
    }
}
async function rejectTransfer(caseId, adminId, reason) {
    const pc = await prisma_1.prisma.paymentCase.findUnique({ where: { caseId } });
    if (!pc)
        throw new Error("Case not found");
    await prisma_1.prisma.paymentAuthorisation.create({
        data: {
            paymentCaseId: pc.id,
            adminId,
            action: "reject",
            reason,
        },
    });
    return prisma_1.prisma.paymentCase.update({
        where: { caseId },
        data: { status: "Transfer Rejected" },
        include: { authorisations: true },
    });
}
async function retryPayment(caseId) {
    const pc = await prisma_1.prisma.paymentCase.findUnique({
        where: { caseId },
        include: { failedTransactions: true },
    });
    if (!pc)
        throw new Error("Case not found");
    if (pc.status !== "Transfer Failed")
        throw new Error("Payment is not in failed state");
    const latestFailed = pc.failedTransactions[pc.failedTransactions.length - 1];
    if (latestFailed) {
        await prisma_1.prisma.failedTransaction.update({
            where: { id: latestFailed.id },
            data: { resolution: "retry", resolvedAt: new Date() },
        });
    }
    return prisma_1.prisma.paymentCase.update({
        where: { caseId },
        data: { status: "Authorised" },
        include: { authorisations: true, failedTransactions: true },
    });
}
async function requestDetailsUpdate(caseId) {
    const pc = await prisma_1.prisma.paymentCase.findUnique({
        where: { caseId },
        include: { failedTransactions: true },
    });
    if (!pc)
        throw new Error("Case not found");
    const latestFailed = pc.failedTransactions[pc.failedTransactions.length - 1];
    if (latestFailed) {
        await prisma_1.prisma.failedTransaction.update({
            where: { id: latestFailed.id },
            data: { resolution: "request_details", resolvedAt: new Date() },
        });
    }
    return prisma_1.prisma.paymentCase.update({
        where: { caseId },
        data: { status: "Pending New Bank Details" },
        include: { authorisations: true, failedTransactions: true },
    });
}
async function scheduleTomorrow(caseId) {
    const pc = await prisma_1.prisma.paymentCase.findUnique({
        where: { caseId },
        include: { failedTransactions: true },
    });
    if (!pc)
        throw new Error("Case not found");
    const latestFailed = pc.failedTransactions[pc.failedTransactions.length - 1];
    if (latestFailed) {
        await prisma_1.prisma.failedTransaction.update({
            where: { id: latestFailed.id },
            data: { resolution: "schedule_tomorrow", resolvedAt: new Date() },
        });
    }
    return prisma_1.prisma.paymentCase.update({
        where: { caseId },
        data: { status: "Scheduled" },
        include: { authorisations: true, failedTransactions: true },
    });
}
async function getPaymentStatus(caseId) {
    const pc = await prisma_1.prisma.paymentCase.findUnique({
        where: { caseId },
        include: { authorisations: true, receipt: true, failedTransactions: true },
    });
    if (!pc)
        throw new Error("Case not found");
    return pc;
}
async function getPendingAuthorisations() {
    return prisma_1.prisma.paymentCase.findMany({
        where: { status: "Transfer Initiated" },
        include: { authorisations: true },
    });
}
async function getAllCases() {
    return prisma_1.prisma.paymentCase.findMany({
        include: { authorisations: true, receipt: true, failedTransactions: true },
        orderBy: { updatedAt: "desc" },
    });
}
async function getFailedTransactions() {
    return prisma_1.prisma.paymentCase.findMany({
        where: { status: "Transfer Failed" },
        include: { failedTransactions: true, authorisations: true },
    });
}
async function disputePayment(caseId) {
    const pc = await prisma_1.prisma.paymentCase.findUnique({ where: { caseId } });
    if (!pc)
        throw new Error("Case not found");
    return prisma_1.prisma.paymentCase.update({
        where: { caseId },
        data: { status: "Payment Disputed" },
        include: { authorisations: true, receipt: true },
    });
}
