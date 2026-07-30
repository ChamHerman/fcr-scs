import { Request, Response } from "express";
import { prisma } from "../prisma";

export const submitBankDetails = async (req: Request, res: Response) => {
  try {
    const {
      bankName,
      accountNumber,
      accountHolderName,
      phoneNumber,
      myKadNumber,
      paymentCaseId,
    } = req.body;

    if (!paymentCaseId || !myKadNumber || !bankName || !accountNumber) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // verify myKadNumber (mock check)
    if (myKadNumber.length < 5) {
      return res.status(400).json({ success: false, error: "Invalid MyKad Number" });
    }

    // encrypt details (simple mock encryption)
    const encryptedBankDetails = Buffer.from(accountNumber).toString("base64");

    const data = await prisma.receiverBankDetails.create({
      data: {
        bankName,
        accountNumber,
        accountHolderName: accountHolderName || "",
        phoneNumber: phoneNumber || "",
        myKadNumber,
        encryptedBankDetails,
        paymentCaseId,
      }
    });

    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
