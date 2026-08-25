import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  CaseStatus,
  ReportStatus,
  OfferStatus,
  ObjectionStatus,
  AreaUnit,
  UserRole,
  PaymentStatus,
} from '@prisma/client';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import bcrypt from 'bcrypt';

// Load environment variables from workspace root or local .env
const rootEnv = path.resolve(__dirname, '../../../.env');
const dbEnv = path.resolve(__dirname, '../.env');

if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
}
if (fs.existsSync(dbEnv)) {
  dotenv.config({ path: dbEnv });
}
dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://fcr_app:postgres@127.0.0.1:5432/fcr_scs?schema=public';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const generateCaseId = (idx: number) =>
  `LAC-2026-08-${String(idx).padStart(4, '0')}`;

// Crockford-style alphabet: no I, O, 0, 1 to avoid look-alikes
const SHORT_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const shortId = () => {
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++)
    out += SHORT_ID_ALPHABET[bytes[i] % SHORT_ID_ALPHABET.length];
  return out;
};

// Random digit generators
const generateRandomDigits = (length: number): string => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
};

// 10-digit contact number starting with '01'
const generateContactNumber = (): string => `01${generateRandomDigits(8)}`;

// 12-digit identification number
const generateIdentificationNumber = (): string => `${generateRandomDigits(12)}`;

async function main() {
  console.log('🚀 Starting database seeding...');

  // Standard password hash for all seeded accounts: "Password$123"
  const defaultPassword = 'Password$123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // ===========================================================================
  // 1. Seed Users (1 Sys Admin, 5 Gov Admin, 5 Gov Officer, 5 Land Valuer, 5 Member)
  // ===========================================================================
  console.log('\n--- 1. Seeding Users ---');

  const usersToSeed: {
    name: string;
    email: string;
    role: UserRole;
  }[] = [];

  // 1 System Admin
  usersToSeed.push({
    name: 'Sys Admin 1',
    email: 'admin@fcrscs.gov.my',
    role: UserRole.SYSTEM_ADMINISTRATOR,
  });

  // 5 Government Admins (ga)
  for (let i = 1; i <= 5; i++) {
    usersToSeed.push({
      name: `Gov Admin ${i}`,
      email: `ga${i}@fcrscs.gov.my`,
      role: UserRole.GOVERNMENT_ADMINISTRATOR,
    });
  }

  // 5 Government Officers (go)
  for (let i = 1; i <= 5; i++) {
    usersToSeed.push({
      name: `Gov Officer ${i}`,
      email: `go${i}@fcrscs.gov.my`,
      role: UserRole.GOVERNMENT_OFFICER,
    });
  }

  // 5 Land Valuers (lv)
  for (let i = 1; i <= 5; i++) {
    usersToSeed.push({
      name: `Land Valuer ${i}`,
      email: `lv${i}@fcrscs.gov.my`,
      role: UserRole.LAND_VALUER,
    });
  }

  // 5 Members (m)
  for (let i = 1; i <= 5; i++) {
    usersToSeed.push({
      name: `Member ${i}`,
      email: `m${i}@fcrscs.gov.my`,
      role: UserRole.DISPLACED_COMMUNITY_MEMBER,
    });
  }

  const seededUsers: Record<string, any> = {};

  for (const u of usersToSeed) {
    const contactNumber = generateContactNumber();
    const identificationNumber = generateIdentificationNumber();

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        passwordHash: hashedPassword,
        isActive: true,
      },
      create: {
        name: u.name,
        email: u.email,
        contactNumber,
        identificationNumber,
        role: u.role,
        passwordHash: hashedPassword,
        isActive: true,
      },
    });

    seededUsers[u.email] = user;
    console.log(`✅ Upserted User: ${user.email} | ${user.role} | ${user.name}`);
  }

  const defaultAdmin = seededUsers['admin@fcrscs.gov.my'];
  const govOfficer1 = seededUsers['go1@fcrscs.gov.my'];
  const landValuer1 = seededUsers['lv1@fcrscs.gov.my'];

  const m1 = seededUsers['m1@fcrscs.gov.my'];
  const m2 = seededUsers['m2@fcrscs.gov.my'];
  const m3 = seededUsers['m3@fcrscs.gov.my'];
  const m4 = seededUsers['m4@fcrscs.gov.my'];
  const m5 = seededUsers['m5@fcrscs.gov.my'];

  // ===========================================================================
  // 2. Seed Email Templates
  // ===========================================================================
  console.log('\n--- 2. Seeding Email Templates ---');

  const passwordResetTemplate = await prisma.emailTemplate.upsert({
    where: { templateName: 'PASSWORD_RESET' },
    update: {},
    create: {
      templateName: 'PASSWORD_RESET',
      subject: 'FCR-SCS: Password Reset Request',
      bodyContent: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Hi {{name}},</p>
          <p>You recently requested to reset your password for your FCR-SCS account. Click the button below to reset it:</p>
          <a href="{{resetLink}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Password</a>
          <p>If you did not request a password reset, please ignore this email or reply to let us know. This password reset link is only valid for the next 60 minutes.</p>
          <br>
          <p>Thanks,<br>The FCR-SCS Team</p>
        </div>
      `,
      createdById: defaultAdmin.userId,
    },
  });
  console.log(`✅ Upserted Email Template: ${passwordResetTemplate.templateName}`);

  const activationTemplate = await prisma.emailTemplate.upsert({
    where: { templateName: 'ACCOUNT_ACTIVATION' },
    update: {},
    create: {
      templateName: 'ACCOUNT_ACTIVATION',
      subject: 'FCR-SCS: Activate Your Account',
      bodyContent: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Activate Your Account</h2>
          <p>Hi {{name}},</p>
          <p>Thank you for registering with FCR-SCS. Please click the button below to activate your account:</p>
          <a href="{{activationLink}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Activate Account</a>
          <p>If you did not register for an account, please ignore this email. This link is valid for 24 hours.</p>
          <br>
          <p>Thanks,<br>The FCR-SCS Team</p>
        </div>
      `,
      createdById: defaultAdmin.userId,
    },
  });
  console.log(`✅ Upserted Email Template: ${activationTemplate.templateName}`);

  // ===========================================================================
  // 3. Seed Land Acquisition Cases & Compensation Pipeline (5 Cases)
  //
  // Created By: Gov Officer 1 (go1)
  // Land Valuer Assigned: Land Valuer 1 (lv1) for cases other than CASE_REGISTERED
  // Land Owners:
  // - Case 1: Member 1
  // - Case 2: Member 2 & Member 3
  // - Case 3: Member 4
  // - Case 4: Member 5
  // - Case 5: Member 3
  // ===========================================================================
  console.log('\n--- 3. Seeding Land Acquisition Cases & Pipeline ---');

  const caseDefinitions = [
    {
      caseIndex: 1,
      projectName: 'Kampung Baru Urban Renewal',
      projectType: 'Urban Redevelopment',
      purpose: 'Mixed-use commercial development',
      budget: 45000000,
      caseTitle: 'Kampung Baru Urban Renewal - Parcel 1',
      status: CaseStatus.CASE_REGISTERED,
      landTitleNo: 'PN 12340',
      lotNo: 'Lot 5670',
      mukim: 'Mukim Kuala Lumpur',
      district: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan Kuala Lumpur',
      area: 2.5,
      latitude: 3.139,
      longitude: 101.6869,
      members: [
        {
          memberUser: m1,
          address: 'No. 101, Jalan Ampang, Kampung Baru, 50450 Kuala Lumpur',
          ownershipType: 'Individual',
        },
      ],
      hasValuation: false,
      valuationStatus: ReportStatus.PENDING,
      hasCompensation: false,
      hasOffer: false,
      hasObjection: false,
    },
    {
      caseIndex: 2,
      projectName: 'KL Sentral Railway Expansion',
      projectType: 'Transportation Development',
      purpose: 'Public rail transit line extension',
      budget: 120000000,
      caseTitle: 'KL Sentral Railway Expansion - Parcel 2',
      status: CaseStatus.VALUER_ASSIGNED,
      landTitleNo: 'PN 12341',
      lotNo: 'Lot 5671',
      mukim: 'Mukim Kuala Lumpur',
      district: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan Kuala Lumpur',
      area: 3.5,
      latitude: 3.149,
      longitude: 101.6969,
      members: [
        {
          memberUser: m2,
          address: 'No. 202, Jalan Travers, Brickfields, 50470 Kuala Lumpur',
          ownershipType: 'Joint / Multiple Ownership',
        },
        {
          memberUser: m3,
          address: 'No. 203, Jalan Tun Sambanthan, Brickfields, 50470 Kuala Lumpur',
          ownershipType: 'Joint / Multiple Ownership',
        },
      ],
      hasValuation: false,
      valuationStatus: ReportStatus.PENDING,
      hasCompensation: false,
      hasOffer: false,
      hasObjection: false,
    },
    {
      caseIndex: 3,
      projectName: 'Desa Melati Flood Mitigation',
      projectType: 'Public Amenities',
      purpose: 'River deepening and drainage upgrade',
      budget: 18000000,
      caseTitle: 'Desa Melati Flood Mitigation - Parcel 3',
      status: CaseStatus.OFFER_ACCEPTED,
      landTitleNo: 'PN 12342',
      lotNo: 'Lot 5672',
      mukim: 'Mukim Kuala Lumpur',
      district: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan Kuala Lumpur',
      area: 4.5,
      latitude: 3.159,
      longitude: 101.7069,
      members: [
        {
          memberUser: m4,
          address: 'No. 404, Jalan Melati 2, Desa Melati, 43000 Kuala Lumpur',
          ownershipType: 'Individual',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 2800000,
      recommendedCompensation: 3200000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.ACCEPTED,
      hasObjection: false,
    },
    {
      caseIndex: 4,
      projectName: 'Sitiawan Tourism Waterfront',
      projectType: 'Tourism Development',
      purpose: 'Coastal promenade and public park',
      budget: 25000000,
      caseTitle: 'Sitiawan Tourism Waterfront - Parcel 4',
      status: CaseStatus.OFFER_ISSUED,
      landTitleNo: 'PN 12343',
      lotNo: 'Lot 5673',
      mukim: 'Mukim Sitiawan',
      district: 'Manjung',
      state: 'Perak',
      area: 5.5,
      latitude: 4.219,
      longitude: 100.6969,
      members: [
        {
          memberUser: m5,
          address: 'No. 505, Jalan Persiaran Pantai, 32000 Sitiawan, Perak',
          ownershipType: 'Individual',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 3300000,
      recommendedCompensation: 3700000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.PENDING,
      hasObjection: true,
      objectionReason: 'Disagreement on agricultural crop valuation component.',
      requestedAmount: 4200000,
    },
    {
      caseIndex: 5,
      projectName: 'Penang Coastal Infrastructure Upgrade',
      projectType: 'Infrastructure Development',
      purpose: 'Coastal highway reinforcement and revetment works',
      budget: 85000000,
      caseTitle: 'Penang Coastal Infrastructure Upgrade - Parcel 5',
      status: CaseStatus.PENDING_VALUATION_APPROVAL,
      landTitleNo: 'PN 12344',
      lotNo: 'Lot 5674',
      mukim: 'Mukim 12',
      district: 'Barat Daya',
      state: 'Pulau Pinang',
      area: 3.0,
      latitude: 5.319,
      longitude: 100.2869,
      members: [
        {
          memberUser: m3,
          address: 'No. 303, Jalan Tun Sambanthan, Brickfields, 50470 Kuala Lumpur',
          ownershipType: 'Individual',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.PENDING,
      marketValue: 4500000,
      recommendedCompensation: 5000000,
      hasCompensation: false,
      hasOffer: false,
      hasObjection: false,
    },
  ];

  for (const cDef of caseDefinitions) {
    const dbProj = await prisma.project.upsert({
      where: { projectName: cDef.projectName },
      update: {
        createdById: govOfficer1.userId,
      },
      create: {
        projectName: cDef.projectName,
        projectType: cDef.projectType,
        purpose: cDef.purpose,
        budget: cDef.budget,
        fundingSource: 'Government (Federal Budget)',
        createdById: govOfficer1.userId,
      },
    });

    const caseId = generateCaseId(cDef.caseIndex);

    let dbCase = await prisma.acquisitionCase.findFirst({
      where: { caseTitle: cDef.caseTitle },
    });

    if (!dbCase) {
      dbCase = await prisma.acquisitionCase.create({
        data: {
          caseId,
          caseTitle: cDef.caseTitle,
          projectId: dbProj.projectId,
          status: cDef.status,
          registrationDate: new Date(),
          remarks: `Land acquisition case for ${cDef.projectName}`,
          createdById: govOfficer1.userId,
        },
      });

      const landParcel = await prisma.landParcel.create({
        data: {
          caseId: dbCase.caseId,
          landTitleNo: cDef.landTitleNo,
          lotNo: cDef.lotNo,
          mukim: cDef.mukim,
          district: cDef.district,
          state: cDef.state,
          area: cDef.area,
          areaUnit: AreaUnit.HECTARE,
          category: 'Commercial / Residential',
          latitude: cDef.latitude,
          longitude: cDef.longitude,
          createdById: govOfficer1.userId,
        },
      });

      // Create Land Owners & Land Ownerships for each assigned member
      const createdOwnerships: any[] = [];
      for (const mInfo of cDef.members) {
        const owner = await prisma.landOwner.create({
          data: {
            name: mInfo.memberUser.name,
            nric: mInfo.memberUser.identificationNumber,
            address: mInfo.address,
            contact: mInfo.memberUser.contactNumber,
            createdById: govOfficer1.userId,
          },
        });

        const ownership = await prisma.landOwnership.create({
          data: {
            landId: landParcel.landId,
            ownerId: owner.ownerId,
            ownershipType: mInfo.ownershipType,
            createdById: govOfficer1.userId,
          },
        });

        createdOwnerships.push(ownership);
      }

      // Assign Land Valuer 1 if status is other than CASE_REGISTERED
      let valReport: any = null;
      if (cDef.status !== CaseStatus.CASE_REGISTERED) {
        if (cDef.hasValuation) {
          valReport = await prisma.valuationReport.create({
            data: {
              caseId: dbCase.caseId,
              valuerId: landValuer1.userId,
              valuationDate: new Date(),
              valuationMethod: 'Comparison Method',
              marketValue: cDef.marketValue || 2000000,
              recommendedCompensation: cDef.recommendedCompensation || 2500000,
              remarks:
                'Professional valuation report conducted according to Jabatan Penilaian.',
              reportStatus: cDef.valuationStatus,
              createdById: govOfficer1.userId,
            },
          });
        }

        // Case Assignment record in case table
        await prisma.caseAssignment.create({
          data: {
            caseId: dbCase.caseId,
            assignedToId: landValuer1.userId,
            assignmentDate: new Date(),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            remarks: 'Assigned for initial land parcel valuation.',
            createdById: govOfficer1.userId,
            valuationReportId: valReport ? valReport.reportId : null,
          },
        });

        // Compensation Report
        if (cDef.hasCompensation && valReport) {
          const compReport = await prisma.compensationReport.create({
            data: {
              caseId: dbCase.caseId,
              valuationReportId: valReport.reportId,
              totalCompensation: cDef.recommendedCompensation || 2500000,
              remarks: 'Approved compensation package.',
              status: ReportStatus.APPROVED,
              approvedById: govOfficer1.userId,
              approvedAt: new Date(),
              createdById: govOfficer1.userId,
            },
          });

          // Offer Letter
          if (cDef.hasOffer) {
            const offer = await prisma.offerLetter.create({
              data: {
                compensationReportId: compReport.compensationReportId,
                caseId: dbCase.caseId,
                ownershipId: createdOwnerships[0].ownershipId,
                offerReferenceNo: `FORM-H-2026-${100 + cDef.caseIndex}`,
                offerType: 'Form H (Standard Award Notice)',
                offerAmount: cDef.recommendedCompensation || 2500000,
                offerDate: new Date(),
                expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                acceptancePeriodDays: 14,
                status: cDef.offerStatus || OfferStatus.ACCEPTED,
                createdById: govOfficer1.userId,
              },
            });

            // Objection
            if (cDef.hasObjection && cDef.objectionReason) {
              await prisma.objection.create({
                data: {
                  offerId: offer.offerId,
                  caseId: dbCase.caseId,
                  objectionReason: cDef.objectionReason,
                  requestedAmount: cDef.requestedAmount || 3000000,
                  status: ObjectionStatus.PENDING,
                  createdById: govOfficer1.userId,
                },
              });
            }
          }
        }
      }

      console.log(
        `✅ Seeded Land Acquisition Case: ${dbCase.caseTitle} (${dbCase.status}) | Owner(s): ${cDef.members.map(m => m.memberUser.name).join(', ')}`
      );
    }
  }

  // ===========================================================================
  // 4. Seed Payment Cases — flow-test baseline (25 records)
  // ===========================================================================
  console.log('\n--- 4. Seeding Payment Cases (Flow-Test Baseline) ---');

  // Reset payment + blockchain state (children first)
  await prisma.failedTransaction.deleteMany({});
  await prisma.paymentReceipt.deleteMany({});
  await prisma.paymentAuthorisation.deleteMany({});
  await prisma.receiverBankDetails.deleteMany({});
  await prisma.paymentCase.deleteMany({});
  await prisma.blockchainRecord.deleteMany({});

  const paymentUsers = [
    { name: 'Ahmad bin Abu', bank: 'Maybank', account: '1234567890' },
    { name: 'Lee Chong Wei', bank: 'CIMB', account: '0987654321' },
    { name: 'Siti Nurhaliza', bank: 'Public Bank', account: '1122334455' },
    { name: 'Ravi Kumar', bank: 'RHB', account: '5566778899' },
    { name: 'Wong Choong Hann', bank: 'Hong Leong', account: '6677889900' },
  ];

  for (let i = 1; i <= 25; i++) {
    const caseId = generateCaseId(i);
    const user = paymentUsers[i % paymentUsers.length];
    const paymentId = `PMT-${shortId()}`;

    // Every 4th record is RM 1,000,000 → 3 signatures required; the rest need 2.
    const amount =
      i % 4 === 0 ? 1000000 : (Math.floor(Math.random() * 50) + 1) * 10000;
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

    console.log(
      `✅ Created Payment Case: ${caseId} · ${paymentId} · Offer Accepted · ${requiredSignatures} signatures required`
    );
  }

  console.log('\n✨ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
