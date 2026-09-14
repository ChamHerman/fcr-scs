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
  BlockchainStatus,
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

function createMockPdfBuffer(title: string, caseId: string, salt = Date.now()): Buffer {
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
<< /Length 160 >>
stream
BT
/F1 16 Tf
50 700 Td
(${title} - ${caseId} [Salt:${salt}]) Tj
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

  // Clean up payment & blockchain records so they are strictly generated dynamically from Case Management
  await prisma.failedTransaction.deleteMany();
  await prisma.paymentReceipt.deleteMany();
  await prisma.paymentAuthorisation.deleteMany();
  await prisma.receiverBankDetails.deleteMany();
  await prisma.paymentCase.deleteMany();
  await prisma.blockchainRecord.deleteMany();

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
  // 1b. Seed Role Permissions (page-level RBAC matrix)
  // Government Admins: full Finance & Ledger pages (actions still endpoint-enforced).
  // Government Officers: view-only page access (backend blocks CUD).
  // SYSTEM_ADMINISTRATOR needs no rows (code bypass, view-only in payment/blockchain).
  // BANK_OPERATOR has no admin pages (the bank portal is a standalone route).
  // ===========================================================================
  console.log('\n--- 1b. Seeding Role Permissions ---');

  const FINANCE_LEDGER_PAGES = [
    '/admin/payment',
    '/admin/payment/initiate',
    '/admin/payment/pending',
    '/admin/payment/failed',
    '/admin/blockchain',
    '/admin/blockchain/publish',
    '/admin/blockchain/void',
  ];

  for (const role of [UserRole.GOVERNMENT_ADMINISTRATOR, UserRole.GOVERNMENT_OFFICER]) {
    for (const pagePath of FINANCE_LEDGER_PAGES) {
      await prisma.rolePermission.upsert({
        where: { role_pagePath: { role, pagePath } },
        update: { canAccess: true },
        create: { role, pagePath, canAccess: true },
      });
    }
  }
  console.log('✅ Upserted RolePermissions (Finance & Ledger pages) for Government Admins + Officers');

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

  const ACCEPTANCE_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
  const seedRunNow = Date.now();

  /** Deterministic signed Form H PDF written to the offer-letter storage and
   *  frozen as `blockchainHash` — the exact anchor the GA publishes as M1. */
  const writeSignedFormH = (caseId: string, ownerName: string, amount: number) => {
    const storageDir = path.resolve(__dirname, '../../document_storage/offer_letter', caseId);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    const fileName = 'Signed_Form_H_seed.pdf';
    const pdfBuf = createMockPdfBuffer(`Signed Form H - Award Accepted RM ${amount.toLocaleString('en-MY')} - ${ownerName}`, caseId);
    fs.writeFileSync(path.join(storageDir, fileName), pdfBuf);
    return {
      signedDocument: `document_storage/offer_letter/${caseId}/${fileName}`,
      blockchainHash: '0x' + crypto.createHash('sha256').update(pdfBuf).digest('hex'),
    };
  };

  const caseDefinitions = [
    // -------------------------------------------------------------------------
    // Cases 1 to 5: Siewfeng's Baseline (REMAINS UNTOUCHED)
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // Cases 6 to 15: Exactly 10 Cases at OFFER_ACCEPTED (Offer Letter Uploaded & Accepted)
    // -------------------------------------------------------------------------
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
          memberUser: m2,
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
    {
      caseIndex: 8,
      projectName: 'Batu Caves Expressway Alignment',
      projectType: 'Infrastructure Development',
      purpose: 'Highway expansion and viaduct structure',
      budget: 32000000,
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Batu Caves Expressway Alignment - Parcel 8',
      status: CaseStatus.OFFER_ACCEPTED,
      landTitleNo: 'PN 12347',
      lotNo: 'Lot 5677',
      tempat: 'Batu Caves',
      mukim: 'Mukim Batu',
      district: 'Gombak',
      state: 'Selangor',
      area: 2600,
      category: LandCategory.BUILDING,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m3,
          address: 'No. 108, Jalan Batu Caves, 68100 Batu Caves, Selangor',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 2100000,
      recommendedCompensation: 2400000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.ACCEPTED,
      hasObjection: false,
    },
    {
      caseIndex: 9,
      projectName: 'Cheras South Flood Barrier',
      projectType: 'Public Amenities',
      purpose: 'Retention pond and drainage retention system',
      budget: 22000000,
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Cheras South Flood Barrier - Parcel 9',
      status: CaseStatus.OFFER_ACCEPTED,
      landTitleNo: 'PN 12348',
      lotNo: 'Lot 5678',
      tempat: 'Cheras South',
      mukim: 'Mukim Cheras',
      district: 'Hulu Langat',
      state: 'Selangor',
      area: 2900,
      category: LandCategory.BUILDING,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m4,
          address: 'No. 209, Jalan Cheras Perdana, 43200 Cheras, Selangor',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 1800000,
      recommendedCompensation: 2100000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.ACCEPTED,
      hasObjection: false,
    },
    {
      caseIndex: 10,
      projectName: 'Klang Valley Smart Transit Resettlement',
      projectType: 'Infrastructure Development',
      purpose: 'Dual-milestone blockchain notarization flow demonstration',
      budget: 60000000,
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Klang Valley Smart Transit Resettlement - Parcel 10',
      status: CaseStatus.OFFER_ACCEPTED,
      landTitleNo: 'PN 20101',
      lotNo: 'Lot 6101',
      tempat: 'Taman Keramat',
      mukim: 'Mukim Ampang',
      district: 'Ampang',
      state: 'Selangor',
      area: 2100,
      category: LandCategory.BUILDING,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m5,
          address: 'No. 11, Jalan Keramat Hujan, 54000 Kuala Lumpur',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 780000,
      recommendedCompensation: 900000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.ACCEPTED,
      hasObjection: false,
    },
    {
      caseIndex: 11,
      projectName: 'Klang Valley Smart Transit Resettlement',
      projectType: 'Infrastructure Development',
      purpose: 'Dual-milestone blockchain notarization flow demonstration',
      budget: 60000000,
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Klang Valley Smart Transit Resettlement - Parcel 11',
      status: CaseStatus.OFFER_ACCEPTED,
      landTitleNo: 'PN 20102',
      lotNo: 'Lot 6102',
      tempat: 'Pandan Indah',
      mukim: 'Mukim Ampang',
      district: 'Ampang',
      state: 'Selangor',
      area: 2400,
      category: LandCategory.BUILDING,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m1,
          address: 'No. 22, Jalan Pandan Indah 4, 55100 Kuala Lumpur',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 1050000,
      recommendedCompensation: 1200000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.ACCEPTED,
      hasObjection: false,
    },
    {
      caseIndex: 12,
      projectName: 'Klang Valley Smart Transit Resettlement',
      projectType: 'Infrastructure Development',
      purpose: 'Dual-milestone blockchain notarization flow demonstration',
      budget: 60000000,
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Klang Valley Smart Transit Resettlement - Parcel 12',
      status: CaseStatus.OFFER_ACCEPTED,
      landTitleNo: 'PN 20103',
      lotNo: 'Lot 6103',
      tempat: 'Salak Selatan',
      mukim: 'Mukim Kuala Lumpur',
      district: 'Seputeh',
      state: 'Wilayah Persekutuan Kuala Lumpur',
      area: 3000,
      category: LandCategory.BUILDING,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m2,
          address: 'No. 33, Jalan Satu, Salak Selatan, 57100 Kuala Lumpur',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 2450000,
      recommendedCompensation: 2800000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.ACCEPTED,
      hasObjection: false,
    },
    {
      caseIndex: 13,
      projectName: 'Klang Valley Smart Transit Resettlement',
      projectType: 'Infrastructure Development',
      purpose: 'Dual-milestone blockchain notarization flow demonstration',
      budget: 60000000,
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Klang Valley Smart Transit Resettlement - Parcel 13',
      status: CaseStatus.OFFER_ACCEPTED,
      landTitleNo: 'PN 20104',
      lotNo: 'Lot 6104',
      tempat: 'Wangsa Maju',
      mukim: 'Mukim Setapak',
      district: 'Wangsa Maju',
      state: 'Wilayah Persekutuan Kuala Lumpur',
      area: 3600,
      category: LandCategory.BUILDING,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m3,
          address: 'No. 44, Jalan Wangsa Delima, 53300 Kuala Lumpur',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 3900000,
      recommendedCompensation: 4500000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.ACCEPTED,
      hasObjection: false,
    },
    {
      caseIndex: 14,
      projectName: 'Klang Valley Smart Transit Resettlement',
      projectType: 'Infrastructure Development',
      purpose: 'Dual-milestone blockchain notarization flow demonstration',
      budget: 60000000,
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Klang Valley Smart Transit Resettlement - Parcel 14',
      status: CaseStatus.OFFER_ACCEPTED,
      landTitleNo: 'PN 20105',
      lotNo: 'Lot 6105',
      tempat: 'Bukit Jalil',
      mukim: 'Mukim Kuala Lumpur',
      district: 'Seputeh',
      state: 'Wilayah Persekutuan Kuala Lumpur',
      area: 4200,
      category: LandCategory.BUILDING,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m4,
          address: 'No. 55, Jalan Jalil Perkasa, 57000 Kuala Lumpur',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 5400000,
      recommendedCompensation: 6200000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.ACCEPTED,
      hasObjection: false,
    },
    {
      caseIndex: 15,
      projectName: 'Klang Valley Smart Transit Resettlement',
      projectType: 'Infrastructure Development',
      purpose: 'Dual-milestone blockchain notarization flow demonstration',
      budget: 60000000,
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Klang Valley Smart Transit Resettlement - Parcel 15',
      status: CaseStatus.OFFER_ACCEPTED,
      landTitleNo: 'PN 20106',
      lotNo: 'Lot 6106',
      tempat: 'Setiawangsa',
      mukim: 'Mukim Setapak',
      district: 'Titiwangsa',
      state: 'Wilayah Persekutuan Kuala Lumpur',
      area: 3400,
      category: LandCategory.BUILDING,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m5,
          address: 'No. 66, Jalan Setiawangsa 10, 54200 Kuala Lumpur',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 2900000,
      recommendedCompensation: 3200000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.ACCEPTED,
      hasObjection: false,
    },

    // -------------------------------------------------------------------------
    // Cases 16 to 20: Exactly 5 Cases at OFFER_ISSUED (Offer Letter Generated, NOT yet accepted/rejected)
    // -------------------------------------------------------------------------
    {
      caseIndex: 16,
      projectName: 'Damansara Transit Link',
      projectType: 'Infrastructure Development',
      purpose: 'Elevated highway ramp and station feeder connector',
      budget: 38000000,
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Damansara Transit Link - Parcel 16',
      status: CaseStatus.OFFER_ISSUED,
      landTitleNo: 'PN 30116',
      lotNo: 'Lot 7116',
      tempat: 'Damansara Utama',
      mukim: 'Mukim Sungai Buloh',
      district: 'Petaling',
      state: 'Selangor',
      area: 2200,
      category: LandCategory.BUILDING,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m1,
          address: 'No. 16, Jalan SS 21/10, Damansara Utama, 47400 Petaling Jaya, Selangor',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 1900000,
      recommendedCompensation: 2200000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.PENDING,
      hasObjection: false,
    },
    {
      caseIndex: 17,
      projectName: 'Subang Jaya Transit Interchange',
      projectType: 'Transportation Development',
      purpose: 'Intermodal commuter concourse and parking structure',
      budget: 42000000,
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Subang Jaya Transit Interchange - Parcel 17',
      status: CaseStatus.OFFER_ISSUED,
      landTitleNo: 'PN 30117',
      lotNo: 'Lot 7117',
      tempat: 'SS 15 Subang Jaya',
      mukim: 'Mukim Damansara',
      district: 'Petaling',
      state: 'Selangor',
      area: 2700,
      category: LandCategory.BUILDING,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m2,
          address: 'No. 17, Jalan SS 15/4, 47500 Subang Jaya, Selangor',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 2300000,
      recommendedCompensation: 2650000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.PENDING,
      hasObjection: false,
    },
    {
      caseIndex: 18,
      projectName: 'Ampang River Flood Rehabilitation',
      projectType: 'Public Amenities',
      purpose: 'Retention weir and riparian buffer zone upgrade',
      budget: 26000000,
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Ampang River Flood Rehabilitation - Parcel 18',
      status: CaseStatus.OFFER_ISSUED,
      landTitleNo: 'PN 30118',
      lotNo: 'Lot 7118',
      tempat: 'Ampang Jaya',
      mukim: 'Mukim Ampang',
      district: 'Hulu Langat',
      state: 'Selangor',
      area: 3100,
      category: LandCategory.AGRICULTURE,
      tenureType: TenureType.LEASEHOLD,
      members: [
        {
          memberUser: m3,
          address: 'No. 18, Jalan Ampang Mewah, 68000 Ampang, Selangor',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 1750000,
      recommendedCompensation: 2050000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.PENDING,
      hasObjection: false,
    },
    {
      caseIndex: 19,
      projectName: 'Petaling Jaya Urban Revitalization',
      projectType: 'Urban Redevelopment',
      purpose: 'Pedestrian concourse and public park realignment',
      budget: 31000000,
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Petaling Jaya Urban Revitalization - Parcel 19',
      status: CaseStatus.OFFER_ISSUED,
      landTitleNo: 'PN 30119',
      lotNo: 'Lot 7119',
      tempat: 'Seksyen 14',
      mukim: 'Mukim Sungai Buloh',
      district: 'Petaling',
      state: 'Selangor',
      area: 2500,
      category: LandCategory.BUILDING,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m4,
          address: 'No. 19, Jalan 14/20, Seksyen 14, 46100 Petaling Jaya, Selangor',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 2600000,
      recommendedCompensation: 3000000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.PENDING,
      hasObjection: false,
    },
    {
      caseIndex: 20,
      projectName: 'Shah Alam Logistics Corridor',
      projectType: 'Commercial Realignment',
      purpose: 'Freight expressway interchange and access lane',
      budget: 49000000,
      fundingSource: FundingSource.GOVERNMENT,
      caseTitle: 'Shah Alam Logistics Corridor - Parcel 20',
      status: CaseStatus.OFFER_ISSUED,
      landTitleNo: 'PN 30120',
      lotNo: 'Lot 7120',
      tempat: 'Bukit Jelutong',
      mukim: 'Mukim Damansara',
      district: 'Petaling',
      state: 'Selangor',
      area: 4000,
      category: LandCategory.INDUSTRY,
      tenureType: TenureType.FREEHOLD,
      members: [
        {
          memberUser: m5,
          address: 'No. 20, Jalan Astaka U8/84, Bukit Jelutong, 40150 Shah Alam, Selangor',
          ownershipType: OwnershipType.INDIVIDUAL_CITIZEN,
          share: '100',
        },
      ],
      hasValuation: true,
      valuationStatus: ReportStatus.APPROVED,
      marketValue: 3400000,
      recommendedCompensation: 3900000,
      hasCompensation: true,
      hasOffer: true,
      offerStatus: OfferStatus.PENDING,
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

    const isAccepted = cDef.status === CaseStatus.OFFER_ACCEPTED;
    const isIssued = cDef.status === CaseStatus.OFFER_ISSUED;
    const primaryMember = cDef.members[0].memberUser;
    const amount = cDef.recommendedCompensation || 2500000;
    const offerRef = `FORM-H-2026-${1000 + cDef.caseIndex}`;

    let formHArtifact: { signedDocument: string; blockchainHash: string } | null = null;
    let acceptedAt: Date | null = null;

    if (isAccepted) {
      formHArtifact = writeSignedFormH(caseId, primaryMember.name, amount);
      acceptedAt = cDef.caseIndex === 15
        ? new Date(seedRunNow - (ACCEPTANCE_GRACE_PERIOD_MS - 5 * 60_000))
        : new Date(seedRunNow - 25 * 60 * 60 * 1000);
    } else if (isIssued) {
      const offerDir = path.resolve(__dirname, '../../document_storage/offer_letter', caseId);
      if (!fs.existsSync(offerDir)) fs.mkdirSync(offerDir, { recursive: true });
      const offerPdfBuf = createMockPdfBuffer(`Official Form H Award Notice - RM ${amount.toLocaleString('en-MY')} - ${primaryMember.name}`, caseId);
      fs.writeFileSync(path.join(offerDir, 'Form_H_Official_Offer.pdf'), offerPdfBuf);
    }

    let dbCase = await prisma.acquisitionCase.findFirst({
      where: { caseTitle: cDef.caseTitle },
    });

    if (dbCase) {
      await prisma.acquisitionCase.update({
        where: { caseId: dbCase.caseId },
        data: { status: cDef.status },
      });
      if (isIssued) {
        await prisma.offerMemberResponse.deleteMany({
          where: { offerLetter: { caseId: dbCase.caseId } },
        });
        if (cDef.hasOffer) {
          await prisma.offerLetter.updateMany({
            where: { caseId: dbCase.caseId },
            data: {
              status: cDef.offerStatus || OfferStatus.PENDING,
              signedDocument: null,
              blockchainHash: null,
              acceptedAt: null,
            },
          });
        }
      }
      if (isAccepted && cDef.hasOffer && formHArtifact && acceptedAt) {
        const existingOffer = await prisma.offerLetter.findFirst({ where: { caseId: dbCase.caseId } });
        if (existingOffer) {
          await prisma.offerLetter.update({
            where: { offerId: existingOffer.offerId },
            data: {
              status: OfferStatus.ACCEPTED,
              signedDocument: formHArtifact.signedDocument,
              blockchainHash: formHArtifact.blockchainHash,
              acceptedAt,
            },
          });
          const owner = await prisma.landOwner.findFirst({ where: { email: primaryMember.email } });
          if (owner) {
            await prisma.offerMemberResponse.upsert({
              where: { offerId_ownerId: { offerId: existingOffer.offerId, ownerId: owner.ownerId } },
              update: { status: OfferStatus.ACCEPTED, respondedAt: acceptedAt, signedDocument: formHArtifact.signedDocument },
              create: {
                offerId: existingOffer.offerId,
                ownerId: owner.ownerId,
                status: OfferStatus.ACCEPTED,
                signedDocument: formHArtifact.signedDocument,
                respondedAt: acceptedAt,
              },
            });
          }
        }
      }
    }

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
                offerReferenceNo: offerRef,
                offerType: 'Form H (Standard Award Notice)',
                offerAmount: amount,
                offerDate: new Date(seedRunNow - 14 * 24 * 60 * 60 * 1000),
                expiryDate: new Date(seedRunNow + 14 * 24 * 60 * 60 * 1000),
                acceptancePeriodDays: 14,
                status: isAccepted ? OfferStatus.ACCEPTED : (cDef.offerStatus || OfferStatus.PENDING),
                acceptedAt: isAccepted ? acceptedAt : null,
                signedDocument: isAccepted ? formHArtifact?.signedDocument : null,
                blockchainHash: isAccepted ? formHArtifact?.blockchainHash : null,
                remarks: isAccepted
                  ? 'Signed Form H uploaded by the landowner; award formally accepted.'
                  : 'Official Form H award notice dispatched to landowner.',
                createdById: govOfficer1.userId,
              },
            });

            if (isAccepted && formHArtifact && acceptedAt) {
              await prisma.offerMemberResponse.upsert({
                where: { offerId_ownerId: { offerId: offer.offerId, ownerId: createdOwnerships[0].ownerId } },
                update: { status: OfferStatus.ACCEPTED, respondedAt: acceptedAt, signedDocument: formHArtifact.signedDocument },
                create: {
                  offerId: offer.offerId,
                  ownerId: createdOwnerships[0].ownerId,
                  status: OfferStatus.ACCEPTED,
                  signedDocument: formHArtifact.signedDocument,
                  respondedAt: acceptedAt,
                },
              });
            }

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
  // 4. Reset Payment & Blockchain Tables
  // ===========================================================================
  console.log('\n--- 4. Resetting Payment & Blockchain Tables ---');

  // Reset payment + blockchain state (children first)
  await prisma.failedTransaction.deleteMany({});
  await prisma.paymentReceipt.deleteMany({});
  await prisma.paymentAuthorisation.deleteMany({});
  await prisma.receiverBankDetails.deleteMany({});
  await prisma.paymentCase.deleteMany({});
  await prisma.blockchainRecord.deleteMany({});

  // Purge any legacy demo cases from previous runs
  const legacyCases = await prisma.acquisitionCase.findMany({
    where: { caseId: { startsWith: 'LAC-2026-09-100' } },
    select: { caseId: true },
  });
  for (const lc of legacyCases) {
    await prisma.blockchainRecord.deleteMany({ where: { caseId: lc.caseId } });
    await prisma.paymentCase.deleteMany({ where: { caseId: lc.caseId } });
    await prisma.offerMemberResponse.deleteMany({ where: { offerLetter: { caseId: lc.caseId } } });
    await prisma.objection.deleteMany({ where: { caseId: lc.caseId } });
    await prisma.offerLetter.deleteMany({ where: { caseId: lc.caseId } });
    await prisma.compensationReport.deleteMany({ where: { caseId: lc.caseId } });
    await prisma.valuationReport.deleteMany({ where: { caseId: lc.caseId } });
    await prisma.caseDocument.deleteMany({ where: { caseId: lc.caseId } });
    await prisma.caseAssignment.deleteMany({ where: { caseId: lc.caseId } });
    const pList = await prisma.landParcel.findMany({ where: { caseId: lc.caseId } });
    for (const p of pList) {
      await prisma.landOwnership.deleteMany({ where: { landId: p.landId } });
    }
    await prisma.landParcel.deleteMany({ where: { caseId: lc.caseId } });
    await prisma.acquisitionCase.delete({ where: { caseId: lc.caseId } });
    const legacyDir = path.resolve(__dirname, '../../document_storage/offer_letter', lc.caseId);
    if (fs.existsSync(legacyDir)) {
      fs.rmSync(legacyDir, { recursive: true, force: true });
    }
  }

  // Refresh acceptance artifacts on Case 3 (siewfeng's untouched accepted offer)
  const case3 = await prisma.acquisitionCase.findUnique({
    where: { caseId: 'LAC-2026-08-0003' },
    include: {
      landParcel: { include: { ownerships: { include: { landOwner: true } } } },
      offerLetters: { where: { status: OfferStatus.ACCEPTED }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  const case3Offer = case3?.offerLetters?.[0];
  if (case3 && case3Offer) {
    const primaryOwner = case3.landParcel?.ownerships?.[0]?.landOwner;
    const amount = Number(case3Offer.offerAmount) || 3200000;
    const formH = writeSignedFormH('LAC-2026-08-0003', primaryOwner?.name || 'Landowner', amount);
    const acceptedAt = new Date(seedRunNow - 48 * 60 * 60 * 1000);
    await prisma.offerLetter.update({
      where: { offerId: case3Offer.offerId },
      data: {
        acceptedAt,
        signedDocument: formH.signedDocument,
        blockchainHash: formH.blockchainHash,
      },
    });
    if (primaryOwner) {
      await prisma.offerMemberResponse.upsert({
        where: { offerId_ownerId: { offerId: case3Offer.offerId, ownerId: primaryOwner.ownerId } },
        update: { status: OfferStatus.ACCEPTED, respondedAt: acceptedAt, signedDocument: formH.signedDocument },
        create: {
          offerId: case3Offer.offerId,
          ownerId: primaryOwner.ownerId,
          status: OfferStatus.ACCEPTED,
          signedDocument: formH.signedDocument,
          respondedAt: acceptedAt,
        },
      });
    }
    console.log(`⛓️ Case 3 acceptance refreshed: LAC-2026-08-0003 | hash frozen | grace elapsed`);
  }

  console.log(
    '\nℹ️ Seeding Summary:\n' +
    '  - LAC-2026-08-0001 to 0005: 5 Untouched baseline cases (siewfeng)\n' +
    '  - LAC-2026-08-0006 to 0015: 10 Cases at OFFER_ACCEPTED (all 4 supporting documents + signed Form H uploaded)\n' +
    '  - LAC-2026-08-0016 to 0020: 5 Cases at OFFER_ISSUED (all 4 supporting documents + Form H generated, awaiting response)\n' +
    '  - Payment & Blockchain: 0 records pre-seeded — dynamically generated upon member offer acceptance & GA blockchain publication.'
  );

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
