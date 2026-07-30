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
exports.submitBankDetails = submitBankDetails;
exports.initiate = initiate;
exports.authorise = authorise;
exports.reject = reject;
exports.retry = retry;
exports.requestDetailsUpdate = requestDetailsUpdate;
exports.scheduleTomorrow = scheduleTomorrow;
exports.getStatus = getStatus;
exports.getPendingAuthorisations = getPendingAuthorisations;
exports.getAllCases = getAllCases;
exports.getFailedTransactions = getFailedTransactions;
exports.downloadReceipt = downloadReceipt;
exports.dispute = dispute;
const paymentService = __importStar(require("../services/payment.service"));
const receiptService = __importStar(require("../services/receipt.service"));
async function submitBankDetails(req, res) {
    const { caseId, bankName, accountNumber, accountHolderName, phoneNumber, myKadNumber } = req.body;
    if (!caseId) {
        res.status(400).json({ error: "caseId is required" });
        return;
    }
    if (!bankName) {
        res.status(400).json({ error: "bankName is required" });
        return;
    }
    try {
        const paymentCase = await paymentService.submitBankDetails({
            caseId,
            bankName,
            accountNumber,
            accountHolderName,
            phoneNumber,
            myKadNumber,
        });
        res.json({ paymentCase });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
async function initiate(req, res) {
    const { caseId, adminId } = req.body;
    if (!caseId) {
        res.status(400).json({ error: "caseId is required" });
        return;
    }
    if (!adminId) {
        res.status(400).json({ error: "adminId is required" });
        return;
    }
    try {
        const paymentCase = await paymentService.initiateTransfer(caseId, adminId);
        res.json({ paymentCase });
    }
    catch (e) {
        const msg = e.message;
        if (msg.toLowerCase().includes("not found")) {
            res.status(404).json({ error: msg });
        }
        else {
            res.status(400).json({ error: msg });
        }
    }
}
async function authorise(req, res) {
    const { caseId, adminId } = req.body;
    if (!caseId || !adminId) {
        res.status(400).json({ error: "caseId and adminId are required" });
        return;
    }
    try {
        const paymentCase = await paymentService.authoriseTransfer(caseId, adminId);
        res.json({ paymentCase });
    }
    catch (e) {
        const msg = e.message;
        if (msg.toLowerCase().includes("not found")) {
            res.status(404).json({ error: msg });
        }
        else {
            res.status(400).json({ error: msg });
        }
    }
}
async function reject(req, res) {
    const { caseId, adminId, reason } = req.body;
    if (!caseId || !adminId) {
        res.status(400).json({ error: "caseId and adminId are required" });
        return;
    }
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
        res.status(400).json({ error: "Rejection reason is required" });
        return;
    }
    try {
        const paymentCase = await paymentService.rejectTransfer(caseId, adminId, reason);
        res.json({ paymentCase });
    }
    catch (e) {
        const msg = e.message;
        if (msg.toLowerCase().includes("not found")) {
            res.status(404).json({ error: msg });
        }
        else {
            res.status(400).json({ error: msg });
        }
    }
}
async function retry(req, res) {
    const { caseId } = req.body;
    if (!caseId) {
        res.status(400).json({ error: "caseId is required" });
        return;
    }
    try {
        const paymentCase = await paymentService.retryPayment(caseId);
        res.json({ paymentCase });
    }
    catch (e) {
        const msg = e.message;
        if (msg.toLowerCase().includes("not found")) {
            res.status(404).json({ error: msg });
        }
        else {
            res.status(400).json({ error: msg });
        }
    }
}
async function requestDetailsUpdate(req, res) {
    const { caseId } = req.body;
    if (!caseId) {
        res.status(400).json({ error: "caseId is required" });
        return;
    }
    try {
        const paymentCase = await paymentService.requestDetailsUpdate(caseId);
        res.json({ paymentCase });
    }
    catch (e) {
        const msg = e.message;
        if (msg.toLowerCase().includes("not found")) {
            res.status(404).json({ error: msg });
        }
        else {
            res.status(400).json({ error: msg });
        }
    }
}
async function scheduleTomorrow(req, res) {
    const { caseId } = req.body;
    if (!caseId) {
        res.status(400).json({ error: "caseId is required" });
        return;
    }
    try {
        const paymentCase = await paymentService.scheduleTomorrow(caseId);
        res.json({ paymentCase });
    }
    catch (e) {
        const msg = e.message;
        if (msg.toLowerCase().includes("not found")) {
            res.status(404).json({ error: msg });
        }
        else {
            res.status(400).json({ error: msg });
        }
    }
}
async function getStatus(req, res) {
    const caseId = req.params.caseId;
    try {
        const paymentCase = await paymentService.getPaymentStatus(caseId);
        res.json({ paymentCase });
    }
    catch (e) {
        const msg = e.message;
        if (msg.toLowerCase().includes("not found")) {
            res.status(404).json({ error: msg });
        }
        else {
            res.status(500).json({ error: msg });
        }
    }
}
async function getPendingAuthorisations(_req, res) {
    try {
        const cases = await paymentService.getPendingAuthorisations();
        res.json({ cases });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
async function getAllCases(_req, res) {
    try {
        const cases = await paymentService.getAllCases();
        res.json({ cases });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
async function getFailedTransactions(_req, res) {
    try {
        const cases = await paymentService.getFailedTransactions();
        res.json({ cases });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
async function downloadReceipt(req, res) {
    const caseId = req.params.caseId;
    try {
        const pdfBuffer = await receiptService.generateReceipt(caseId);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=receipt-${caseId}.pdf`);
        res.send(pdfBuffer);
    }
    catch (e) {
        const msg = e.message;
        if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("no receipt")) {
            res.status(404).json({ error: msg });
        }
        else {
            res.status(500).json({ error: msg });
        }
    }
}
async function dispute(req, res) {
    const caseId = req.body.caseId;
    if (!caseId) {
        res.status(400).json({ error: "caseId is required" });
        return;
    }
    try {
        const paymentCase = await paymentService.disputePayment(caseId);
        res.json({ paymentCase });
    }
    catch (e) {
        const msg = e.message;
        if (msg.toLowerCase().includes("not found")) {
            res.status(404).json({ error: msg });
        }
        else {
            res.status(400).json({ error: msg });
        }
    }
}
