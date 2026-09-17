import { prisma } from "../prisma";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CaseStatus, OfferStatus, ObjectionStatus, Prisma, PaymentStatus, BlockchainStatus } from "@prisma/client";
import { buildNricConditions } from "../utils/nric.utils";
import { newPaymentId } from "../../../payment_service/src/services/payment.service";
import { newRecordId } from "../../../smart_contract_service/src/services/blockchain.service";

export interface OfferLetterFilters {
  caseId?: string;
  status?: string;
  search?: string;
  ownerNric?: string;
  caseCreatedById?: string;
  userRole?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface CreateOfferLetterInput {
  compensationReportId: string;
  caseId: string;
  ownershipId: string;
  offerType: string;
  offerAmount: number;
  acceptancePeriodDays?: number;
  remarks?: string;
  createdById?: string;
}

export async function getAllOfferLetters(filters: OfferLetterFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const andConditions: Prisma.OfferLetterWhereInput[] = [];

  if (filters.caseId) {
    andConditions.push({ caseId: filters.caseId });
  }

  if (filters.status) {
    andConditions.push({ status: filters.status as OfferStatus });
  }

  // 1. Government Officer: directly filter by user ID (createdById on OfferLetter or AcquisitionCase)
  if (filters.caseCreatedById || (filters.userRole === "GOVERNMENT_OFFICER" && filters.userId) || (filters.userId && !filters.ownerNric)) {
    const targetUserId = filters.caseCreatedById || filters.userId;
    if (targetUserId) {
      andConditions.push({
        OR: [
          { createdById: targetUserId },
          { acquisitionCase: { createdById: targetUserId } },
        ],
      });
    }
  }

  if (filters.ownerNric) {
    const nricConditions = buildNricConditions(filters.ownerNric);

    // Match if user is direct ownership on offer letter OR a co-owner of the land parcel
    andConditions.push({
      OR: [
        {
          landOwnership: {
            landOwner: {
              OR: nricConditions,
            },
          },
        },
        {
          acquisitionCase: {
            landParcel: {
              ownerships: {
                some: {
                  landOwner: {
                    OR: nricConditions,
                  },
                },
              },
            },
          },
        },
      ],
    });
  }

  if (filters.search) {
    const term = filters.search;
    andConditions.push({
      OR: [
        { offerReferenceNo: { contains: term, mode: "insensitive" } },
        { acquisitionCase: { caseTitle: { contains: term, mode: "insensitive" } } },
        { landOwnership: { landOwner: { name: { contains: term, mode: "insensitive" } } } },
        {
          acquisitionCase: {
            landParcel: {
              ownerships: {
                some: {
                  landOwner: {
                    name: { contains: term, mode: "insensitive" },
                  },
                },
              },
            },
          },
        },
      ],
    });
  }

  const where: Prisma.OfferLetterWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

  const [offerLetters, total] = await Promise.all([
    prisma.offerLetter.findMany({
      where,
      include: {
        acquisitionCase: {
          include: {
            project: true,
            landParcel: {
              include: {
                ownerships: {
                  include: {
                    landOwner: true,
                  },
                },
              },
            },
          },
        },
        compensationReport: {
          include: {
            valuationReport: {
              include: { valuer: true },
            },
          },
        },
        landOwnership: { include: { landOwner: true, landParcel: true } },
        memberResponses: { include: { landOwner: true } },
        objections: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.offerLetter.count({ where }),
  ]);

  return { offerLetters, total, page, limit };
}

export async function getOfferLetterById(offerId: string) {
  const offer = await prisma.offerLetter.findUnique({
    where: { offerId },
    include: {
      acquisitionCase: {
        include: {
          project: true,
          landParcel: {
            include: {
              ownerships: {
                include: {
                  landOwner: true,
                },
              },
            },
          },
          valuationReports: true,
        },
      },
      compensationReport: {
        include: {
          valuationReport: {
            include: { valuer: true },
          },
        },
      },
      landOwnership: { include: { landOwner: true, landParcel: true } },
      objections: {
        include: {
          objectionDocuments: true,
          createdBy: true,
          reviewedBy: true,
        },
      },
      memberResponses: {
        include: {
          landOwner: true,
        },
      },
    },
  });

  if (!offer) {
    throw new Error("Offer letter not found");
  }

  return offer;
}

export async function getOfferLetterByCaseId(caseId: string) {
  const offer = await prisma.offerLetter.findFirst({
    where: { caseId },
    include: {
      acquisitionCase: {
        include: {
          project: true,
          landParcel: {
            include: {
              ownerships: {
                include: {
                  landOwner: true,
                },
              },
            },
          },
          valuationReports: true,
        },
      },
      compensationReport: {
        include: {
          valuationReport: {
            include: { valuer: true },
          },
        },
      },
      landOwnership: { include: { landOwner: true, landParcel: true } },
      objections: {
        include: {
          objectionDocuments: true,
          createdBy: true,
          reviewedBy: true,
        },
      },
      memberResponses: {
        include: {
          landOwner: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!offer) {
    throw new Error("Offer letter not found for the given caseId");
  }

  return offer;
}

export async function createOfferLetter(input: CreateOfferLetterInput) {
  const { compensationReportId, caseId, ownershipId, offerType, offerAmount, acceptancePeriodDays = 42, remarks, createdById } = input;

  const compReport = await prisma.compensationReport.findUnique({
    where: { compensationReportId },
  });
  if (!compReport) throw new Error("Compensation report not found");
  if (compReport.status !== "APPROVED") {
    throw new Error("Compensation report must be APPROVED before issuing offer letter");
  }

  // The offer letter created by should be the same as the compensation report created by
  const finalCreatedById = compReport.createdById || createdById || "00000000-0000-0000-0000-000000000001";

  const refNo = `OFFER-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  const SIX_WEEKS_MS = 42 * 24 * 60 * 60 * 1000;
  const offerDate = new Date(Date.now() + SIX_WEEKS_MS);
  const finalAcceptanceDays = acceptancePeriodDays || 42;
  const expiryDate = new Date(offerDate.getTime() + finalAcceptanceDays * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const offer = await tx.offerLetter.create({
      data: {
        compensationReportId,
        caseId,
        ownershipId,
        offerReferenceNo: refNo,
        offerType: offerType || "Form H (Standard Offer)",
        offerAmount,
        offerDate,
        expiryDate,
        acceptancePeriodDays: finalAcceptanceDays,
        status: OfferStatus.PENDING,
        remarks: remarks || "",
        createdById: finalCreatedById,
      },
      include: {
        acquisitionCase: true,
        compensationReport: true,
        landOwnership: { include: { landOwner: true } },
        memberResponses: { include: { landOwner: true } },
      },
    });

    await tx.acquisitionCase.update({
      where: { caseId },
      data: { status: CaseStatus.OFFER_ISSUED },
    });

    return offer;
  });

  return result;
}

export interface RespondOfferOptions {
  signedDocument?: string;
  forceAccept?: boolean;
  ownerNric?: string;
  ownerId?: string;
  userId?: string;
  remarks?: string;
  /** Server-computed binary SHA-256 of the signed Form H (FR-019). */
  documentHash?: string;
}

function hashStoredFormH(signedDocument?: string | null): string | null {
  if (!signedDocument) return null;
  try {
    const rawRel = signedDocument.replace(/^document_storage\//, "");
    const candidates = [
      path.resolve(__dirname, "../../../../data_layer", signedDocument),
      path.resolve(__dirname, "../../../../data_layer/document_storage", rawRel),
      path.resolve(process.cwd(), "data_layer", signedDocument),
      path.resolve(process.cwd(), "data_layer/document_storage", rawRel),
      path.resolve(process.cwd(), "../data_layer", signedDocument),
      path.resolve(process.cwd(), "../data_layer/document_storage", rawRel),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return "0x" + crypto.createHash("sha256").update(fs.readFileSync(candidate)).digest("hex");
      }
    }
  } catch {}
  return null;
}

function findMatchingOwner(owners: any[], options?: RespondOfferOptions) {
  if (!options) return owners[0] || null;

  if (options.ownerId) {
    const found = owners.find((o) => o.ownerId === options.ownerId);
    if (found) return found;
  }

  if (options.ownerNric) {
    const rawNric = options.ownerNric.trim();
    const cleanNric = rawNric.replace(/[^a-zA-Z0-9]/g, "");
    const found = owners.find((o) => {
      const oNric = (o.nric || "").trim();
      const oClean = oNric.replace(/[^a-zA-Z0-9]/g, "");
      return oNric === rawNric || (cleanNric && oClean === cleanNric);
    });
    if (found) return found;
  }

  return owners[0] || null;
}

export async function acceptOffer(
  offerId: string,
  signedDocument?: string,
  forceAccept: boolean = false,
  options?: RespondOfferOptions
) {
  const offer = await prisma.offerLetter.findUnique({
    where: { offerId },
    include: {
      objections: true,
      acquisitionCase: {
        include: {
          landParcel: {
            include: {
              ownerships: {
                include: { landOwner: true },
              },
            },
          },
        },
      },
      landOwnership: { include: { landOwner: true } },
      memberResponses: { include: { landOwner: true } },
    },
  });
  if (!offer) throw new Error("Offer letter not found");

  if (offer.status !== OfferStatus.PENDING) {
    throw new Error(`Cannot accept offer in '${offer.status}' status`);
  }

  // Check for active (unresolved) objections related to this offer/case
  const activeObjections = (offer.objections || []).filter(
    (o) => o.status === ObjectionStatus.PENDING
  );

  if (activeObjections.length > 0 && !forceAccept) {
    const err: any = new Error("Active objection exists for this case/offer letter.");
    err.code = "ACTIVE_OBJECTION_EXISTS";
    err.objection = activeObjections[0];
    throw err;
  }

  // Extract all parcel owners
  const parcelOwnerships = offer.acquisitionCase?.landParcel?.ownerships || [];
  const parcelOwners = parcelOwnerships.map((ow) => ow.landOwner).filter(Boolean);
  const allOwners = parcelOwners.length > 0
    ? parcelOwners
    : (offer.landOwnership?.landOwner ? [offer.landOwnership.landOwner] : []);

  const totalOwnersCount = Math.max(allOwners.length, 1);
  const matchingOwner = findMatchingOwner(allOwners, options);

  // Each co-owner signs their own Form H, so hash THIS owner's document rather
  // than the shared offer file. Milestone 1 later anchors one hash per owner.
  const ownerSignedDocument = signedDocument || offer.signedDocument;
  const ownerDocumentHash = options?.documentHash || hashStoredFormH(ownerSignedDocument);

  const result = await prisma.$transaction(async (tx) => {
    if (matchingOwner) {
      await tx.offerMemberResponse.upsert({
        where: {
          offerId_ownerId: {
            offerId,
            ownerId: matchingOwner.ownerId,
          },
        },
        create: {
          offerId,
          ownerId: matchingOwner.ownerId,
          status: OfferStatus.ACCEPTED,
          signedDocument: ownerSignedDocument,
          ...(ownerDocumentHash ? { documentHash: ownerDocumentHash } : {}),
          respondedAt: new Date(),
        },
        update: {
          status: OfferStatus.ACCEPTED,
          signedDocument: ownerSignedDocument,
          ...(ownerDocumentHash ? { documentHash: ownerDocumentHash } : {}),
          respondedAt: new Date(),
          remarks: null,
        },
      });
    }

    // Check all current responses
    const allResponses = await tx.offerMemberResponse.findMany({
      where: { offerId },
    });

    const acceptedOwners = allOwners.filter((owner) =>
      allResponses.some((r) => r.ownerId === owner.ownerId && r.status === OfferStatus.ACCEPTED)
    );

    const isAllAccepted = totalOwnersCount <= 1 || acceptedOwners.length >= totalOwnersCount;

    let updatedOffer;
    if (isAllAccepted) {
      // FR-019: at the moment of full acceptance the signed Form H becomes the
      // statutory award anchor. Freeze its binary SHA-256 (client-attested and
      // server-verified, or computed from the stored file) so the GA can
      // notarize Milestone 1 against this exact fingerprint.
      const finalSignedDocument = signedDocument || offer.signedDocument;
      const formHHash = options?.documentHash || hashStoredFormH(finalSignedDocument);

      // All owners have accepted! Update offer to ACCEPTED and case to OFFER_ACCEPTED
      updatedOffer = await tx.offerLetter.update({
        where: { offerId },
        data: {
          status: OfferStatus.ACCEPTED,
          acceptedAt: new Date(),
          signedDocument: finalSignedDocument,
          ...(formHHash ? { blockchainHash: formHHash } : {}),
        },
        include: {
          acquisitionCase: true,
          memberResponses: { include: { landOwner: true } },
        },
      });
      await tx.acquisitionCase.update({
        where: { caseId: offer.caseId },
        data: { status: CaseStatus.OFFER_ACCEPTED },
      });

      // Dynamically ingest payment case
      let primaryOwner: any = allOwners[0];
      if (!primaryOwner) {
        primaryOwner = await tx.landOwner.findFirst({
          where: { ownerships: { some: { landParcel: { caseId: offer.caseId } } } },
        });
      }
      if (!primaryOwner) {
        primaryOwner = await tx.landOwner.findFirst();
      }

      const existingPmt = await tx.paymentCase.findUnique({
        where: { caseId: offer.caseId },
        include: { receiverBankDetails: true },
      });
      if (!existingPmt) {
        const m1 = await tx.blockchainRecord.findFirst({
          where: { caseId: offer.caseId, milestone: "AWARD", status: BlockchainStatus.PUBLISHED },
        });
        await tx.paymentCase.create({
          data: {
            id: await newPaymentId(),
            caseId: offer.caseId,
            beneficiaryId: primaryOwner?.ownerId || offer.ownershipId,
            amount: Number(offer.offerAmount),
            accountHolderName: primaryOwner?.name || null,
            phoneNumber: primaryOwner?.contact || null,
            myKadNumber: primaryOwner?.nric || null,
            status: m1 ? PaymentStatus.BANK_DETAILS_PENDING : PaymentStatus.BANK_DETAILS_AND_M1_PENDING,
            requiredSignatures: 0,
            currentSignatures: 0,
          },
        });
      } else {
        // Reuse existing PaymentCase record (same PMT ID)
        // Restore from soft-delete if it was previously cancelled during grace period
        const m1 = await tx.blockchainRecord.findFirst({
          where: { caseId: offer.caseId, milestone: "AWARD", status: BlockchainStatus.PUBLISHED },
        });
        const hasBank = Boolean(
          existingPmt.bankName ||
          existingPmt.accountNumber ||
          existingPmt.receiverBankDetails?.accountNumber
        );

        let initialStatus: PaymentStatus;
        if (!hasBank) {
          initialStatus = m1 ? PaymentStatus.BANK_DETAILS_PENDING : PaymentStatus.BANK_DETAILS_AND_M1_PENDING;
        } else {
          // Bank details were preserved from prior submission
          initialStatus = m1 ? PaymentStatus.READY_TO_INITIATE : PaymentStatus.AWARD_NOTARIZATION_PENDING;
        }

        await tx.paymentCase.update({
          where: { id: existingPmt.id },
          data: {
            deletedAt: null,
            amount: Number(offer.offerAmount),
            status: initialStatus,
          },
        });
      }

      // Dynamically ingest or restore blockchain record for Milestone 1 (AWARD)
      const existingBcn = await tx.blockchainRecord.findUnique({
        where: { caseId_milestone: { caseId: offer.caseId, milestone: "AWARD" } },
      });
      if (!existingBcn) {
        const bcnId = await newRecordId();
        await tx.blockchainRecord.create({
          data: {
            id: bcnId,
            caseId: offer.caseId,
            milestone: "AWARD",
            onChainKey: `${offer.caseId}#M1`,
            documentHash: formHHash || "0x0000000000000000000000000000000000000000000000000000000000000000",
            status: BlockchainStatus.READY_TO_PUBLISH,
            createdAt: new Date(),
          },
        });
      } else if (existingBcn.deletedAt != null) {
        await tx.blockchainRecord.update({
          where: { id: existingBcn.id },
          data: {
            deletedAt: null,
            documentHash: formHHash || existingBcn.documentHash,
            status: existingBcn.status === BlockchainStatus.PUBLISHED ? BlockchainStatus.PUBLISHED : BlockchainStatus.READY_TO_PUBLISH,
          },
        });
      }
    } else {
      // Partially accepted (multi-owner pending)
      updatedOffer = await tx.offerLetter.findUnique({
        where: { offerId },
        include: {
          acquisitionCase: true,
          memberResponses: { include: { landOwner: true } },
        },
      });
    }

    return updatedOffer;
  });

  return result;
}

export async function rejectOffer(
  offerId: string,
  remarks?: string,
  options?: RespondOfferOptions
) {
  const offer = await prisma.offerLetter.findUnique({
    where: { offerId },
    include: {
      acquisitionCase: {
        include: {
          landParcel: {
            include: {
              ownerships: {
                include: { landOwner: true },
              },
            },
          },
        },
      },
      landOwnership: { include: { landOwner: true } },
      memberResponses: { include: { landOwner: true } },
    },
  });
  if (!offer) throw new Error("Offer letter not found");

  if (offer.status !== OfferStatus.PENDING) {
    throw new Error(`Cannot reject offer in '${offer.status}' status`);
  }

  // Extract all parcel owners
  const parcelOwnerships = offer.acquisitionCase?.landParcel?.ownerships || [];
  const parcelOwners = parcelOwnerships.map((ow) => ow.landOwner).filter(Boolean);
  const allOwners = parcelOwners.length > 0
    ? parcelOwners
    : (offer.landOwnership?.landOwner ? [offer.landOwnership.landOwner] : []);

  const matchingOwner = findMatchingOwner(allOwners, options);

  const result = await prisma.$transaction(async (tx) => {
    if (matchingOwner) {
      await tx.offerMemberResponse.upsert({
        where: {
          offerId_ownerId: {
            offerId,
            ownerId: matchingOwner.ownerId,
          },
        },
        create: {
          offerId,
          ownerId: matchingOwner.ownerId,
          status: OfferStatus.REJECTED,
          remarks: remarks || "Offer rejected",
          respondedAt: new Date(),
        },
        update: {
          status: OfferStatus.REJECTED,
          remarks: remarks || "Offer rejected",
          respondedAt: new Date(),
        },
      });
    }

    // Build clear rejection remark noting who rejected
    let finalRemark = remarks || "";
    if (matchingOwner) {
      const ownerInfo = `${matchingOwner.name} (${matchingOwner.nric})`;
      finalRemark = remarks ? `Rejected by ${ownerInfo}: ${remarks}` : `Rejected by ${ownerInfo}`;
    }

    const updatedOffer = await tx.offerLetter.update({
      where: { offerId },
      data: {
        status: OfferStatus.REJECTED,
        rejectedAt: new Date(),
        remarks: finalRemark || offer.remarks,
      },
      include: {
        acquisitionCase: true,
        memberResponses: { include: { landOwner: true } },
      },
    });

    await tx.acquisitionCase.update({
      where: { caseId: offer.caseId },
      data: { status: CaseStatus.OFFER_REJECTED },
    });

    return updatedOffer;
  });

  return result;
}

export async function cancelAcceptance(
  offerId: string,
  options?: RespondOfferOptions
) {
  const offer = await prisma.offerLetter.findUnique({
    where: { offerId },
    include: {
      acquisitionCase: {
        include: {
          landParcel: {
            include: {
              ownerships: {
                include: { landOwner: true },
              },
            },
          },
        },
      },
      landOwnership: { include: { landOwner: true } },
      memberResponses: { include: { landOwner: true } },
    },
  });
  if (!offer) throw new Error("Offer letter not found");

  // Extract all parcel owners
  const parcelOwnerships = offer.acquisitionCase?.landParcel?.ownerships || [];
  const parcelOwners = parcelOwnerships.map((ow) => ow.landOwner).filter(Boolean);
  const allOwners = parcelOwners.length > 0
    ? parcelOwners
    : (offer.landOwnership?.landOwner ? [offer.landOwnership.landOwner] : []);

  const matchingOwner = findMatchingOwner(allOwners, options);

  // Check 1-day (24 hour) cancellation window
  const memberResp = matchingOwner
    ? offer.memberResponses.find((r) => r.ownerId === matchingOwner.ownerId)
    : null;

  const acceptanceTime = memberResp?.respondedAt || offer.acceptedAt;
  if (!acceptanceTime) {
    throw new Error("No formal acceptance record found to cancel");
  }

  const now = new Date();
  const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
  const NETWORK_LATENCY_BUFFER_MS = 60 * 1000; // 60s network tolerance buffer for requests submitted near 0s
  const elapsedMs = now.getTime() - new Date(acceptanceTime).getTime();

  if (elapsedMs > (GRACE_PERIOD_MS + NETWORK_LATENCY_BUFFER_MS)) {
    throw new Error(
      "The 24-hour statutory cancellation period has expired. Approvals cannot be cancelled or modified after the grace window."
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    if (matchingOwner) {
      await tx.offerMemberResponse.upsert({
        where: {
          offerId_ownerId: {
            offerId,
            ownerId: matchingOwner.ownerId,
          },
        },
        create: {
          offerId,
          ownerId: matchingOwner.ownerId,
          status: OfferStatus.PENDING,
          remarks: "Approval cancelled within 1-day grace period",
          respondedAt: new Date(),
        },
        update: {
          status: OfferStatus.PENDING,
          remarks: "Approval cancelled within 1-day grace period",
          respondedAt: new Date(),
        },
      });
    }

    const updatedOffer = await tx.offerLetter.update({
      where: { offerId },
      data: {
        status: OfferStatus.PENDING,
        acceptedAt: null,
        remarks: "Approval cancelled by land owner within 24-hour grace window",
      },
      include: {
        acquisitionCase: true,
        memberResponses: { include: { landOwner: true } },
      },
    });

    if (offer.caseId) {
      await tx.acquisitionCase.update({
        where: { caseId: offer.caseId },
        data: { status: CaseStatus.OFFER_ISSUED },
      });

      // Soft-delete the associated payment case so it disappears from the active payment dashboard
      // while retaining its sequential PMT-XXXX id and submitted bank details
      await tx.paymentCase.updateMany({
        where: { caseId: offer.caseId },
        data: { deletedAt: new Date() },
      });

      // Soft-delete the associated milestone 1 blockchain record so it disappears from queues
      await tx.blockchainRecord.updateMany({
        where: {
          caseId: offer.caseId,
          milestone: "AWARD",
        },
        data: { deletedAt: new Date() },
      });
    }

    return updatedOffer;
  });

  return result;
}

export async function checkAndMarkExpiredOffers(): Promise<number> {
  const now = new Date();
  const expiredOffers = await prisma.offerLetter.findMany({
    where: {
      status: OfferStatus.PENDING,
      expiryDate: { lt: now },
    },
  });

  if (expiredOffers.length === 0) return 0;

  await prisma.$transaction(
    expiredOffers.map((offer) =>
      prisma.offerLetter.update({
        where: { offerId: offer.offerId },
        data: { status: OfferStatus.EXPIRED },
      })
    )
  );

  return expiredOffers.length;
}

export async function getOfferCaseId(offerId: string): Promise<string> {
  const offer = await prisma.offerLetter.findUnique({
    where: { offerId },
    select: { caseId: true },
  });
  return offer?.caseId || "general";
}


