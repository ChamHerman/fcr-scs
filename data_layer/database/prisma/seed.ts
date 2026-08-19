import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, CaseStatus, ReportStatus, OfferStatus, ObjectionStatus, AreaUnit, UserRole, PaymentStatus } from '@prisma/client'
import { Pool } from 'pg'
import * as crypto from 'crypto'

/**
 * NOTE: this seed targets the CURRENT module schema (pre-integrated-redesign).
 * The payment/blockchain rows are a flow-test baseline: every payment case
 * starts at OFFER_ACCEPTED with zero signatures so the full settlement flow
 * (initiate → multi-sign → bank approval → paid → blockchain publish) must be
 * exercised live — no fake approved/failed states are seeded.
 */

const connectionString = 'postgresql://fcr_app:postgres@127.0.0.1:5432/fcr_scs?schema=public'

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const generateCaseId = (idx: number) => `LAC-2026-08-${String(idx).padStart(4, '0')}`;

// Crockford-style alphabet: no I, O, 0, 1 to avoid look-alikes
const SHORT_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const shortId = () => {
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) out += SHORT_ID_ALPHABET[bytes[i] % SHORT_ID_ALPHABET.length];
  return out;
};

async function main() {
  console.log('Seeding dummy data...');

  // 1. Seed System Admin User
  const defaultAdmin = await prisma.user.upsert({
    where: { userId: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      userId: '00000000-0000-0000-0000-000000000001',
      name: 'System Admin',
      email: 'admin@fcr-scs.gov.my',
      contactNumber: '011-00000001',
      identificationNumber: '000101-14-0001',
      passwordHash: '$2b$10$xyz...',
      role: UserRole.SYSTEM_ADMINISTRATOR,
      isActive: true,
    },
  });

  // Seed Valuer User
  const valuer1 = await prisma.user.upsert({
    where: { email: 'ahmad.faizal@fcr-scs.gov.my' },
    update: {},
    create: {
      userId: '00000000-0000-0000-0000-000000000002',
      name: 'Ahmad Faizal',
      email: 'ahmad.faizal@fcr-scs.gov.my',
      contactNumber: '011-00000002',
      identificationNumber: '750101-14-0002',
      passwordHash: '$2b$10$xyz...',
      role: UserRole.LAND_VALUER,
      isActive: true,
    },
  });

  // 2. Seed Land Acquisition Cases & Compensation Pipeline
  const sampleProjects = [
    { name: 'Kampung Baru Urban Renewal', type: 'Urban Redevelopment', purpose: 'Mixed-use commercial development', budget: 45000000 },
    { name: 'KL Sentral Railway Expansion', type: 'Transportation Development', purpose: 'Public rail transit line extension', budget: 120000000 },
    { name: 'Desa Melati Flood Mitigation', type: 'Public Amenities', purpose: 'River deepening and drainage upgrade', budget: 18000000 },
    { name: 'Sitiawan Tourism Waterfront', type: 'Tourism Development', purpose: 'Coastal promenade and public park', budget: 25000000 },
  ];

  for (let i = 0; i < sampleProjects.length; i++) {
    const proj = sampleProjects[i];

    const dbProj = await prisma.project.upsert({
      where: { projectName: proj.name },
      update: {},
      create: {
        projectName: proj.name,
        projectType: proj.type,
        purpose: proj.purpose,
        budget: proj.budget,
        fundingSource: 'Government (Federal Budget)',
        createdById: defaultAdmin.userId,
      },
    });

    const caseTitle = `${proj.name} - Parcel ${i + 1}`;

    let dbCase = await prisma.acquisitionCase.findFirst({
      where: { caseTitle },
    });

    if (!dbCase) {
      const caseId = generateCaseId(i + 1);
      dbCase = await prisma.acquisitionCase.create({
        data: {
          caseId,
          caseTitle,
          projectId: dbProj.projectId,
          status: i === 0 ? CaseStatus.CASE_REGISTERED : i === 1 ? CaseStatus.VALUER_ASSIGNED : CaseStatus.OFFER_ACCEPTED,
          registrationDate: new Date(),
          remarks: 'Initial acquisition case for land parcel',
          createdById: defaultAdmin.userId,
        },
      });

      const landParcel = await prisma.landParcel.create({
        data: {
          caseId: dbCase.caseId,
          landTitleNo: `PN ${12340 + i}`,
          lotNo: `Lot ${5670 + i}`,
          mukim: 'Mukim Kuala Lumpur',
          district: 'Kuala Lumpur',
          state: 'Wilayah Persekutuan Kuala Lumpur',
          area: 2.5 + i,
          areaUnit: AreaUnit.HECTARE,
          category: 'Commercial / Residential',
          latitude: 3.1390 + (i * 0.01),
          longitude: 101.6869 + (i * 0.01),
          createdById: defaultAdmin.userId,
        },
      });

      const owner = await prisma.landOwner.create({
        data: {
          name: i % 2 === 0 ? 'Ahmad Bin Abdullah' : 'Siti Binti Hassan',
          nric: `75010${i}-10-567${i}`,
          address: `No. ${45 + i}, Jalan Utama, Kuala Lumpur`,
          contact: `012-345678${i}`,
          createdById: defaultAdmin.userId,
        },
      });

      const ownership = await prisma.landOwnership.create({
        data: {
          landId: landParcel.landId,
          ownerId: owner.ownerId,
          ownershipType: 'Individual',
          createdById: defaultAdmin.userId,
        },
      });

      // Seed Valuation Report for cases 2, 3, 4
      if (i > 0) {
        const valReport = await prisma.valuationReport.create({
          data: {
            caseId: dbCase.caseId,
            valuerId: valuer1.userId,
            valuationDate: new Date(),
            valuationMethod: 'Comparison Method',
            marketValue: 1800000 + (i * 500000),
            recommendedCompensation: 2200000 + (i * 500000),
            remarks: 'Professional valuation report conducted according to Jabatan Penilaian.',
            reportStatus: ReportStatus.APPROVED,
            createdById: defaultAdmin.userId,
          },
        });

        // Seed Compensation Report
        const compReport = await prisma.compensationReport.create({
          data: {
            caseId: dbCase.caseId,
            valuationReportId: valReport.reportId,
            totalCompensation: 2200000 + (i * 500000),
            remarks: 'Approved compensation package.',
            status: ReportStatus.APPROVED,
            approvedById: defaultAdmin.userId,
            approvedAt: new Date(),
            createdById: defaultAdmin.userId,
          },
        });

        // Seed Offer Letter
        const offer = await prisma.offerLetter.create({
          data: {
            compensationReportId: compReport.compensationReportId,
            caseId: dbCase.caseId,
            ownershipId: ownership.ownershipId,
            offerReferenceNo: `FORM-H-2026-${100 + i}`,
            offerType: 'Form H (Standard Award Notice)',
            offerAmount: 2200000 + (i * 500000),
            offerDate: new Date(),
            expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            acceptancePeriodDays: 14,
            status: i === 1 ? OfferStatus.PENDING : OfferStatus.ACCEPTED,
            createdById: defaultAdmin.userId,
          },
        });

        // Seed Objection for case 4
        if (i === 3) {
          await prisma.objection.create({
            data: {
              offerId: offer.offerId,
              caseId: dbCase.caseId,
              objectionReason: 'Disagreement on agricultural crop valuation component.',
              requestedAmount: 3200000,
              status: ObjectionStatus.SUBMITTED,
              createdById: defaultAdmin.userId,
            },
          });
        }
      }

      console.log(`Seeded Land Acquisition Case: ${dbCase.caseTitle} (${dbCase.status})`);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Seed Payment Cases — flow-test baseline (25 records)
  //
  // Every record starts at OFFER_ACCEPTED with zero signatures so the whole
  // payment flow is exercised live: initiate → multi-sign (Authorised) →
  // Waiting Bank Approval → bank approve/reject → Paid / Transfer Failed →
  // blockchain publish. No authorisations, receipts, failed transactions or
  // blockchain records are seeded — those states must be reached through the
  // real flow.
  // ---------------------------------------------------------------------------

  // Reset payment + blockchain state (children first) so old scaffold rows,
  // artifacts and uuid-format ids never leak into the flow-test baseline.
  await prisma.failedTransaction.deleteMany({});
  await prisma.paymentReceipt.deleteMany({});
  await prisma.paymentAuthorisation.deleteMany({});
  await prisma.receiverBankDetails.deleteMany({});
  await prisma.paymentCase.deleteMany({});
  await prisma.blockchainRecord.deleteMany({});

  const users = [
    { name: 'Ahmad bin Abu', bank: 'Maybank', account: '1234567890' },
    { name: 'Lee Chong Wei', bank: 'CIMB', account: '0987654321' },
    { name: 'Siti Nurhaliza', bank: 'Public Bank', account: '1122334455' },
    { name: 'Ravi Kumar', bank: 'RHB', account: '5566778899' },
    { name: 'Wong Choong Hann', bank: 'Hong Leong', account: '6677889900' },
  ];

  for (let i = 1; i <= 25; i++) {
    const caseId = generateCaseId(i);
    const user = users[i % users.length];
    const paymentId = `PMT-${shortId()}`;

    // Every 4th record is RM 1M → 3 signatures required (admin-01/02/03 can
    // complete it in the UI); the rest need 2.
    const amount = i % 4 === 0 ? 1000000 : (Math.floor(Math.random() * 50) + 1) * 10000;

    const requiredSignatures = 2 + Math.floor(amount / 1000000);

    await prisma.paymentCase.create({
      data: {
        id: paymentId,
        caseId,
        beneficiaryId: `BEN-${String(i).padStart(3, '0')}`,
        amount,
        bankName: user.bank,
        accountNumber: user.account,
        accountHolderName: user.name,
        phoneNumber: '012-3456789',
        myKadNumber: '900101-14-1234',
        status: PaymentStatus.OFFER_ACCEPTED,
        requiredSignatures,
        currentSignatures: 0,
      },
    });

    console.log(`Created Payment Case: ${caseId} · ${paymentId} · Offer Accepted · ${requiredSignatures} signatures required`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
