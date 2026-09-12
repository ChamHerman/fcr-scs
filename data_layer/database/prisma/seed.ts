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
  FundingSource,
  LandCategory,
  TenureType,
  OwnershipType,
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

function createMockPdfBuffer(title: string, caseId: string): Buffer {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 120 >>
stream
BT
/F1 18 Tf
50 700 Td
(${title} - ${caseId}) Tj
/F1 12 Tf
0 -30 Td
(Official Case Document - Federal Land Acquisition System) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000240 00000 n 
0000000410 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
485
%%EOF`;
  return Buffer.from(content, 'utf-8');
}

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
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Kampung Baru Urban Renewal - Parcel 1',
      status: CaseStatus.CASE_REGISTERED,
      landTitleNo: 'PN 12340',
      lotNo: 'Lot 5670',
      tempat: 'Kampung Baru',
      mukim: 'Bandar Kuala Lumpur',
      district: 'Titiwangsa',
      state: 'Wilayah Persekutuan Kuala Lumpur',
      area: 2500,
      category: LandCategory.BUILDING,
      tenureType: TenureType.MALAY_RESERVE,
      members: [
        {
          memberUser: m1,
          address: 'No. 101, Jalan Ampang, Kampung Baru, 50450 Kuala Lumpur',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
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
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'KL Sentral Railway Expansion - Parcel 2',
      status: CaseStatus.VALUER_ASSIGNED,
      landTitleNo: 'PN 12341',
      lotNo: 'Lot 5671',
      tempat: 'Brickfields',
      mukim: 'Bandar Kuala Lumpur',
      district: 'Lembah Pantai',
      state: 'Wilayah Persekutuan Kuala Lumpur',
      area: 3500,
      category: LandCategory.BUILDING,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m2,
          address: 'No. 202, Jalan Travers, Brickfields, 50470 Kuala Lumpur',
          ownershipType: OwnershipType.JOINT_OWNERSHIP,
          share: '50',
        },
        {
          memberUser: m3,
          address: 'No. 203, Jalan Tun Sambanthan, Brickfields, 50470 Kuala Lumpur',
          ownershipType: OwnershipType.JOINT_OWNERSHIP,
          share: '50',
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
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Desa Melati Flood Mitigation - Parcel 3',
      status: CaseStatus.OFFER_ACCEPTED,
      landTitleNo: 'PN 12342',
      lotNo: 'Lot 5672',
      tempat: 'Desa Melati',
      mukim: 'Mukim Setapak',
      district: 'Wangsa Maju',
      state: 'Wilayah Persekutuan Kuala Lumpur',
      area: 4500,
      category: LandCategory.AGRICULTURE,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m4,
          address: 'No. 404, Jalan Melati 2, Desa Melati, 43000 Kuala Lumpur',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
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
      fundingSource: FundingSource.PRIVATE,
      caseTitle: 'Sitiawan Tourism Waterfront - Parcel 4',
      status: CaseStatus.OFFER_ISSUED,
      landTitleNo: 'PN 12343',
      lotNo: 'Lot 5673',
      tempat: 'Teluk Batik',
      mukim: 'Mukim Sitiawan',
      district: 'Manjung',
      state: 'Perak',
      area: 5500,
      category: LandCategory.AGRICULTURE,
      tenureType: TenureType.LEASEHOLD,
      members: [
        {
          memberUser: m5,
          address: 'No. 505, Jalan Persiaran Pantai, 32000 Sitiawan, Perak',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
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
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Penang Coastal Infrastructure Upgrade - Parcel 5',
      status: CaseStatus.PENDING_VALUATION_APPROVAL,
      landTitleNo: 'PN 12344',
      lotNo: 'Lot 5674',
      tempat: 'Bayan Lepas',
      mukim: 'Mukim 12',
      district: 'Barat Daya',
      state: 'Pulau Pinang',
      area: 3000,
      category: LandCategory.INDUSTRY,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m3,
          address: 'No. 303, Jalan Tun Sambanthan, Brickfields, 50470 Kuala Lumpur',
          ownershipType: OwnershipType.CORPORATE_ENTITY,
          share: '100',
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
    {
      caseIndex: 6,
      projectName: 'Gombak Transit Corridor',
      projectType: 'Infrastructure Development',
      purpose: 'Transit station access road widening and park-and-ride facility',
      budget: 35000000,
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Gombak Transit Corridor - Parcel 6',
      status: CaseStatus.OFFER_ACCEPTED,
      landTitleNo: 'PN 12345',
      lotNo: 'Lot 5675',
      tempat: 'Gombak Setia',
      mukim: 'Mukim Setapak',
      district: 'Gombak',
      state: 'Wilayah Persekutuan Kuala Lumpur',
      area: 3200,
      category: LandCategory.BUILDING,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m1,
          address: 'No. 102, Jalan Gombak, 53000 Kuala Lumpur',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 2200000,
      recommendedCompensation: 2500000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.ACCEPTED,
      hasObjection: false,
    },
    {
      caseIndex: 7,
      projectName: 'Setapak Commercial Realignment',
      projectType: 'Commercial Realignment',
      purpose: 'Road widening and transit access expansion',
      budget: 28000000,
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Setapak Commercial Realignment - Parcel 7',
      status: CaseStatus.OFFER_ACCEPTED,
      landTitleNo: 'PN 12346',
      lotNo: 'Lot 5676',
      tempat: 'Setapak Jaya',
      mukim: 'Mukim Setapak',
      district: 'Wangsa Maju',
      state: 'Wilayah Persekutuan Kuala Lumpur',
      area: 2800,
      category: LandCategory.BUILDING,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m1,
          address: 'No. 103, Jalan Setapak, 53300 Kuala Lumpur',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 1500000,
      recommendedCompensation: 1800000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.ACCEPTED,
      hasObjection: false,
    },
  ];

  for (const cDef of caseDefinitions) {
    const dbProj = await prisma.project.upsert({
      where: { projectName: cDef.projectName },
      update: {
        fundingSource: cDef.fundingSource,
        createdById: govOfficer1.userId,
      },
      create: {
        projectName: cDef.projectName,
        projectType: cDef.projectType,
        purpose: cDef.purpose,
        budget: cDef.budget,
        fundingSource: cDef.fundingSource,
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
          tempat: cDef.tempat,
          mukim: cDef.mukim,
          district: cDef.district,
          state: cDef.state,
          area: cDef.area,
          areaUnit: AreaUnit.SQUARE_METER,
          category: cDef.category,
          tenureType: cDef.tenureType,
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
            email: mInfo.memberUser.email,
            createdById: govOfficer1.userId,
          },
        });

        const ownership = await prisma.landOwnership.create({
          data: {
            landId: landParcel.landId,
            ownerId: owner.ownerId,
            ownershipType: mInfo.ownershipType,
            share: mInfo.share,
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

      // Seed 4 Mandatory Supporting Documents for this case
      await prisma.caseDocument.deleteMany({
        where: { caseId: dbCase.caseId },
      });

      const docStorageDir = path.resolve(__dirname, '../../document_storage/case_document', dbCase.caseId);
      if (!fs.existsSync(docStorageDir)) {
        fs.mkdirSync(docStorageDir, { recursive: true });
      }

      const seedDocs = [
        { type: 'Acquisition Plan', file: 'Acquisition_Plan.pdf' },
        { type: 'Official Title Search', file: 'Official_Title_Search.pdf' },
        { type: 'Proof of Financial Allocation', file: 'Proof_of_Financial_Allocation.pdf' },
        { type: 'Project Proposal', file: 'Project_Proposal.pdf' },
      ];

      for (const sDoc of seedDocs) {
        const filePathOnDisk = path.join(docStorageDir, sDoc.file);
        const pdfBuf = createMockPdfBuffer(sDoc.type, dbCase.caseId);
        fs.writeFileSync(filePathOnDisk, pdfBuf);

        const checksum = crypto.createHash('sha256').update(pdfBuf).digest('hex');
        const dbPath = `document_storage/case_document/${dbCase.caseId}/${sDoc.file}`;

        await prisma.caseDocument.create({
          data: {
            caseId: dbCase.caseId,
            documentType: sDoc.type,
            fileName: sDoc.file,
            fileSize: pdfBuf.length,
            filePath: dbPath,
            mimeType: 'application/pdf',
            checksum,
            createdById: govOfficer1.userId,
          },
        });
      }

      console.log(
        `✅ Seeded Land Acquisition Case: ${dbCase.caseTitle} (${dbCase.status}) | Owner(s): ${cDef.members.map(m => m.memberUser.name).join(', ')}`
      );
    }

    // Seed/refresh 4 Mandatory Supporting Documents for every case
    await prisma.caseDocument.deleteMany({
      where: { caseId: dbCase.caseId },
    });

    const docStorageDir = path.resolve(__dirname, '../../document_storage/case_document', dbCase.caseId);
    if (!fs.existsSync(docStorageDir)) {
      fs.mkdirSync(docStorageDir, { recursive: true });
    }

    const seedDocs = [
      { type: 'Acquisition Plan', file: 'Acquisition_Plan.pdf' },
      { type: 'Official Title Search', file: 'Official_Title_Search.pdf' },
      { type: 'Proof of Financial Allocation', file: 'Proof_of_Financial_Allocation.pdf' },
      { type: 'Project Proposal', file: 'Project_Proposal.pdf' },
    ];

    for (const sDoc of seedDocs) {
      const filePathOnDisk = path.join(docStorageDir, sDoc.file);
      const pdfBuf = createMockPdfBuffer(sDoc.type, dbCase.caseId);
      fs.writeFileSync(filePathOnDisk, pdfBuf);

      const checksum = crypto.createHash('sha256').update(pdfBuf).digest('hex');
      const dbPath = `document_storage/case_document/${dbCase.caseId}/${sDoc.file}`;

      await prisma.caseDocument.create({
        data: {
          caseId: dbCase.caseId,
          documentType: sDoc.type,
          fileName: sDoc.file,
          fileSize: pdfBuf.length,
          filePath: dbPath,
          mimeType: 'application/pdf',
          checksum,
          createdById: govOfficer1.userId,
        },
      });
    }

    console.log(`📄 Seeded 4 Mandatory Supporting Documents for ${dbCase.caseId} (${dbCase.caseTitle})`);
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

  // ===========================================================================
  // 12. Payment Cases: Left empty by design for dynamic ingestion
  // ===========================================================================
  console.log('\n--- 12. Payment Module ---');
  await prisma.paymentReceipt.deleteMany({});
  await prisma.paymentAuthorisation.deleteMany({});
  await prisma.failedTransaction.deleteMany({});
  await prisma.receiverBankDetails.deleteMany({});
  await prisma.paymentCase.deleteMany({});
  console.log('ℹ️ Payment cases table cleared. Cases will be dynamically ingested when offers are accepted.');

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
