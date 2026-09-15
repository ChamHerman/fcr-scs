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
  // Government Admins: all admin portal pages EXCEPT /admin/role-management.
  // Finance & Ledger pages are strictly for Government Admins (actions endpoint-enforced).
  // Government Officers: operational pages only; Finance & Ledger strictly removed.
  // SYSTEM_ADMINISTRATOR needs no rows (implicit code bypass to all pages).
  // ===========================================================================
  console.log('\n--- 1b. Seeding Role Permissions ---');

  const ALL_ADMIN_PAGES = [
    // Main
    '/admin',
    '/admin/valuers',
    '/admin/forms',

    // Land Acquisition
    '/admin/case',
    '/admin/case/valuation',

    // Compensation
    '/admin/compensation/report',
    '/admin/compensation/offer',
    '/admin/compensation/objection',

    // Finance & Ledger (GA only)
    '/admin/payment',
    '/admin/payment/initiate',
    '/admin/payment/pending',
    '/admin/payment/failed',
    '/admin/blockchain',
    '/admin/blockchain/publish',

    // AI Valuation
    '/admin/prediction',
    '/admin/prediction/retrain',

    // Reporting
    '/admin/reports',
    '/admin/reports/case-status',
    '/admin/reports/payment',
    '/admin/reports/blockchain-audit',

    // System
    '/admin/profile',
    '/admin/users',
    '/admin/role-management',
    '/admin/audit-logs',
    '/admin/alerts',
    '/admin/settings',
  ];

  const OFFICER_ALLOWED_PAGES = new Set([
    '/admin',
    '/admin/valuers',
    '/admin/forms',
    '/admin/case',
    '/admin/case/valuation',
    '/admin/compensation/report',
    '/admin/compensation/offer',
    '/admin/compensation/objection',
    '/admin/prediction',
    '/admin/prediction/retrain',
    '/admin/reports',
    '/admin/reports/case-status',
    '/admin/profile',
    '/admin/audit-logs',
    '/admin/alerts',
  ]);

  const VALUER_ALLOWED_PAGES = new Set([
    '/admin',
    '/admin/case',
    '/admin/case/valuation',
    '/admin/prediction',
    '/admin/profile',
  ]);

  // Seed Government Administrator permissions:
  // Allowed to access all admin portal pages EXCEPT for role management page only.
  for (const pagePath of ALL_ADMIN_PAGES) {
    const canAccess = pagePath !== '/admin/role-management';
    await prisma.rolePermission.upsert({
      where: { role_pagePath: { role: UserRole.GOVERNMENT_ADMINISTRATOR, pagePath } },
      update: { canAccess },
      create: { role: UserRole.GOVERNMENT_ADMINISTRATOR, pagePath, canAccess },
    });
  }

  // Seed Government Officer permissions:
  // Finance & Ledger permissions removed; operational pages granted; role management & user admin denied.
  for (const pagePath of ALL_ADMIN_PAGES) {
    const canAccess = OFFICER_ALLOWED_PAGES.has(pagePath);
    await prisma.rolePermission.upsert({
      where: { role_pagePath: { role: UserRole.GOVERNMENT_OFFICER, pagePath } },
      update: { canAccess },
      create: { role: UserRole.GOVERNMENT_OFFICER, pagePath, canAccess },
    });
  }

  // Seed Land Valuer permissions:
  for (const pagePath of ALL_ADMIN_PAGES) {
    const canAccess = VALUER_ALLOWED_PAGES.has(pagePath);
    await prisma.rolePermission.upsert({
      where: { role_pagePath: { role: UserRole.LAND_VALUER, pagePath } },
      update: { canAccess },
      create: { role: UserRole.LAND_VALUER, pagePath, canAccess },
    });
  }

  console.log('✅ Upserted RolePermissions: Finance & Ledger strictly for Government Admins; Government Admins granted all pages except Role Management; Officers removed from Finance & Ledger');

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

  const offerLetterTemplate = await prisma.emailTemplate.upsert({
    where: { templateName: 'OFFER_LETTER_NOTIFICATION' },
    update: {},
    create: {
      templateName: 'OFFER_LETTER_NOTIFICATION',
      subject: 'FCR-SCS: Compensation Offer Notice - Case {{caseId}}',
      bodyContent: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Official Compensation Offer Notice</h2>
          <p>Dear {{name}},</p>
          <p>An official compensation offer has been published for Land Acquisition Case <strong>{{caseId}}</strong>.</p>
          <p>Total awarded amount: <strong>{{amount}}</strong></p>
          <p>Please log in to your Member Portal to review the formal offer letter and select your response (Accept / Dispute) within the statutory window:</p>
          <a href="{{portalLink}}" style="background-color: #2e7d32; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">View Offer Letter</a>
          <br>
          <p>Regards,<br>Land Acquisition & Compensation Department</p>
        </div>
      `,
      createdById: defaultAdmin.userId,
    },
  });
  console.log(`✅ Upserted Email Template: ${offerLetterTemplate.templateName}`);

  const paymentDisbursedTemplate = await prisma.emailTemplate.upsert({
    where: { templateName: 'PAYMENT_DISBURSED' },
    update: {},
    create: {
      templateName: 'PAYMENT_DISBURSED',
      subject: 'FCR-SCS: Payment Disbursed for Case {{caseId}}',
      bodyContent: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Compensation Payment Disbursed</h2>
          <p>Dear {{name}},</p>
          <p>Your compensation payment of <strong>{{amount}}</strong> for Case <strong>{{caseId}}</strong> has been approved and processed.</p>
          <p>Reference Transaction ID: <code>{{transactionId}}</code></p>
          <p>Payment Method: Direct Bank Transfer (EFT)</p>
          <p>Please allow 1-3 business days for the funds to reflect in your designated bank account.</p>
          <br>
          <p>Regards,<br>Finance & Disbursement Division</p>
        </div>
      `,
      createdById: defaultAdmin.userId,
    },
  });
  console.log(`✅ Upserted Email Template: ${paymentDisbursedTemplate.templateName}`);

  const objectionUpdateTemplate = await prisma.emailTemplate.upsert({
    where: { templateName: 'OBJECTION_UPDATE' },
    update: {},
    create: {
      templateName: 'OBJECTION_UPDATE',
      subject: 'FCR-SCS: Status Update on Objection - Case {{caseId}}',
      bodyContent: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Objection Status Update</h2>
          <p>Dear {{name}},</p>
          <p>We are writing to update you on your formal objection regarding Land Acquisition Case <strong>{{caseId}}</strong>.</p>
          <p>Current Status: <strong>{{status}}</strong></p>
          <p>Remarks: {{remarks}}</p>
          <a href="{{portalLink}}" style="background-color: #6750a4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Check Details in Portal</a>
          <br>
          <p>Regards,<br>Land Acquisition Hearing Committee</p>
        </div>
      `,
      createdById: defaultAdmin.userId,
    },
  });
  console.log(`✅ Upserted Email Template: ${objectionUpdateTemplate.templateName}`);

  const systemAlertTemplate = await prisma.emailTemplate.upsert({
    where: { templateName: 'SYSTEM_ALERT' },
    update: {},
    create: {
      templateName: 'SYSTEM_ALERT',
      subject: 'FCR-SCS: System Notification - {{alertType}}',
      bodyContent: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>System Notification</h2>
          <p>Hello {{name}},</p>
          <p>This is an automated system notice: <strong>{{message}}</strong></p>
          <p>Timestamp: {{timestamp}}</p>
          <p>If you require assistance, please reach out to the System Administrator.</p>
          <br>
          <p>FCR-SCS Administrative Services</p>
        </div>
      `,
      createdById: defaultAdmin.userId,
    },
  });
  console.log(`✅ Upserted Email Template: ${systemAlertTemplate.templateName}`);

  const adminOtpTemplate = await prisma.emailTemplate.upsert({
    where: { templateName: 'SYSTEM_ADMIN_OTP' },
    update: {},
    create: {
      templateName: 'SYSTEM_ADMIN_OTP',
      subject: 'FCR-SCS Security: Your Administrator Verification Code is {{otp}}',
      bodyContent: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 540px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #6750a4; margin-top: 0;">System Administrator Authentication</h2>
          <p>Dear {{name}},</p>
          <p>A login request to the FCR-SCS Administrative Console was initiated for your account. Please use the following One-Time Password (OTP) to complete your two-factor verification:</p>
          <div style="text-align: center; margin: 25px 0;">
            <span style="display: inline-block; font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 28px; background-color: #f3edf7; color: #21005d; border-radius: 8px; border: 1px dashed #6750a4;">{{otp}}</span>
          </div>
          <p style="color: #49454f; font-size: 14px;">This code is valid for <strong>{{expiresMinutes}} minutes</strong>. If you did not initiate this login, please immediately notify the security operations team.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #79747e;">Federal Land Commission Reimbursement & Statutory Compensation System (FCR-SCS)</p>
        </div>
      `,
      createdById: defaultAdmin.userId,
    },
  });
  console.log(`✅ Upserted Email Template: ${adminOtpTemplate.templateName}`);

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

    const caseCreatedDate = new Date(seedRunNow - 7 * 24 * 60 * 60 * 1000);
    caseCreatedDate.setHours(9, 30, 0, 0);

    const valDate = new Date(seedRunNow - 5 * 24 * 60 * 60 * 1000);
    valDate.setHours(11, 0, 0, 0);

    const compDate = new Date(seedRunNow - 4 * 24 * 60 * 60 * 1000);
    compDate.setHours(14, 15, 0, 0);

    const offerIssuedDate = new Date(seedRunNow - 3 * 24 * 60 * 60 * 1000);
    offerIssuedDate.setHours(10, 0, 0, 0);

    if (isAccepted) {
      formHArtifact = writeSignedFormH(caseId, primaryMember.name, amount);
      // Cases 13, 14, 15 have exactly 10 minutes left in the 24-hour grace period (accepted 23 hours 50 minutes ago)
      // All other accepted cases were accepted 25 hours ago (grace period elapsed, unlocked & ready to publish)
      acceptedAt = [13, 14, 15].includes(cDef.caseIndex)
        ? new Date(seedRunNow - (23 * 60 + 50) * 60 * 1000)
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
        data: {
          status: cDef.status,
          registrationDate: caseCreatedDate,
          createdAt: caseCreatedDate,
          updatedAt: isAccepted && acceptedAt ? acceptedAt : caseCreatedDate,
        },
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
              offerDate: offerIssuedDate,
              signedDocument: null,
              blockchainHash: null,
              acceptedAt: null,
              updatedAt: offerIssuedDate,
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
              offerDate: offerIssuedDate,
              signedDocument: formHArtifact.signedDocument,
              blockchainHash: formHArtifact.blockchainHash,
              acceptedAt,
              updatedAt: acceptedAt,
            },
          });
          // Look up the land parcel and owners specific to this case
          const parcel = await prisma.landParcel.findFirst({
            where: { caseId: dbCase.caseId },
            include: { ownerships: { include: { landOwner: true } } },
          });
          const parcelOwners = parcel?.ownerships?.map((o) => o.landOwner).filter(Boolean) || [];

          if (parcelOwners.length > 0) {
            const validOwnerIds = parcelOwners.map((o) => o.ownerId);
            // Delete any spurious responses not belonging to this parcel's owners
            await prisma.offerMemberResponse.deleteMany({
              where: {
                offerId: existingOffer.offerId,
                ownerId: { notIn: validOwnerIds },
              },
            });

            for (const owner of parcelOwners) {
              await prisma.offerMemberResponse.upsert({
                where: { offerId_ownerId: { offerId: existingOffer.offerId, ownerId: owner.ownerId } },
                update: {
                  status: OfferStatus.ACCEPTED,
                  respondedAt: acceptedAt,
                  signedDocument: formHArtifact.signedDocument,
                },
                create: {
                  offerId: existingOffer.offerId,
                  ownerId: owner.ownerId,
                  status: OfferStatus.ACCEPTED,
                  signedDocument: formHArtifact.signedDocument,
                  respondedAt: acceptedAt,
                },
              });
            }
          } else {
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
    }

    if (!dbCase) {
      dbCase = await prisma.acquisitionCase.create({
        data: {
          caseId,
          caseTitle: cDef.caseTitle,
          projectId: dbProj.projectId,
          status: cDef.status,
          registrationDate: caseCreatedDate,
          createdAt: caseCreatedDate,
          updatedAt: isAccepted && acceptedAt ? acceptedAt : caseCreatedDate,
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
              valuationDate: valDate,
              valuationMethod: 'Comparison Method',
              marketValue: cDef.marketValue || 2000000,
              recommendedCompensation: cDef.recommendedCompensation || 2500000,
              remarks:
                'Professional valuation report conducted according to Jabatan Penilaian.',
              reportStatus: cDef.valuationStatus,
              createdById: govOfficer1.userId,
              createdAt: valDate,
              updatedAt: valDate,
            },
          });
        }

        // Case Assignment record in case table
        await prisma.caseAssignment.create({
          data: {
            caseId: dbCase.caseId,
            assignedToId: landValuer1.userId,
            assignmentDate: valDate,
            dueDate: new Date(valDate.getTime() + 14 * 24 * 60 * 60 * 1000),
            remarks: 'Assigned for initial land parcel valuation.',
            createdById: govOfficer1.userId,
            createdAt: valDate,
            updatedAt: valDate,
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
              approvedAt: compDate,
              createdAt: compDate,
              updatedAt: compDate,
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
                offerDate: offerIssuedDate,
                expiryDate: new Date(offerIssuedDate.getTime() + 14 * 24 * 60 * 60 * 1000),
                acceptancePeriodDays: 14,
                status: isAccepted ? OfferStatus.ACCEPTED : (cDef.offerStatus || OfferStatus.PENDING),
                acceptedAt: isAccepted ? acceptedAt : null,
                signedDocument: isAccepted ? formHArtifact?.signedDocument : null,
                blockchainHash: isAccepted ? formHArtifact?.blockchainHash : null,
                remarks: isAccepted
                  ? 'Signed Form H uploaded by the landowner; award formally accepted.'
                  : 'Official Form H award notice dispatched to landowner.',
                createdById: govOfficer1.userId,
                createdAt: offerIssuedDate,
                updatedAt: isAccepted && acceptedAt ? acceptedAt : offerIssuedDate,
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

  // Purge any non-canonical or test cases (e.g. INGEST-*, CANCEL-TEST-*, LAC-2026-09-100-*)
  const canonicalCaseIds = Array.from({ length: 20 }, (_, i) => generateCaseId(1 + i));
  const nonCanonicalCases = await prisma.acquisitionCase.findMany({
    where: { caseId: { notIn: canonicalCaseIds } },
    select: { caseId: true },
  });
  for (const lc of nonCanonicalCases) {
    await prisma.failedTransaction.deleteMany({ where: { paymentCase: { caseId: lc.caseId } } });
    await prisma.paymentReceipt.deleteMany({ where: { paymentCase: { caseId: lc.caseId } } });
    await prisma.paymentAuthorisation.deleteMany({ where: { paymentCase: { caseId: lc.caseId } } });
    await prisma.receiverBankDetails.deleteMany({ where: { paymentCase: { caseId: lc.caseId } } });
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
    const legacyDocDir = path.resolve(__dirname, '../../document_storage/case_document', lc.caseId);
    if (fs.existsSync(legacyDocDir)) {
      fs.rmSync(legacyDocDir, { recursive: true, force: true });
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
    const case3Created = new Date(seedRunNow - 7 * 24 * 60 * 60 * 1000);
    case3Created.setHours(9, 30, 0, 0);
    const acceptedAt = new Date(seedRunNow - 48 * 60 * 60 * 1000);
    await prisma.acquisitionCase.update({
      where: { caseId: 'LAC-2026-08-0003' },
      data: {
        registrationDate: case3Created,
        createdAt: case3Created,
        updatedAt: acceptedAt,
      },
    });
    await prisma.offerLetter.update({
      where: { offerId: case3Offer.offerId },
      data: {
        offerDate: new Date(seedRunNow - 3 * 24 * 60 * 60 * 1000),
        acceptedAt,
        updatedAt: acceptedAt,
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

  // ===========================================================================
  // 5. Pre-seed Payment & Blockchain Records for Accepted Cases
  // ===========================================================================
  console.log('\n--- 5. Pre-seeding Payment & Blockchain Records for Accepted Cases ---');
  const nowYear = new Date(seedRunNow).getFullYear();
  const nowMonth = String(new Date(seedRunNow).getMonth() + 1).padStart(2, '0');
  const pmtPrefix = `PMT-${nowYear}-${nowMonth}-`;
  const bcnPrefix = `BCN-${nowYear}-${nowMonth}-`;

  const acceptedCaseIds = [
    'LAC-2026-08-0003',
    ...Array.from({ length: 10 }, (_, i) => generateCaseId(6 + i)),
  ];

  let seq = 0;
  for (const cId of acceptedCaseIds) {
    seq += 1;
    const pmtId = `${pmtPrefix}${String(seq).padStart(4, '0')}`;
    const bcnId = `${bcnPrefix}${String(seq).padStart(4, '0')}`;

    const acCase = await prisma.acquisitionCase.findUnique({
      where: { caseId: cId },
      include: {
        landParcel: { include: { ownerships: { include: { landOwner: true } } } },
        offerLetters: { where: { status: OfferStatus.ACCEPTED }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!acCase) continue;
    const primaryOwner = acCase.landParcel?.ownerships?.[0]?.landOwner;
    if (!primaryOwner) continue;
    const offerLetter = acCase.offerLetters?.[0];
    const amount = offerLetter ? Number(offerLetter.offerAmount) : 2500000;
    const recordTime = offerLetter?.acceptedAt || acCase.updatedAt || new Date(seedRunNow - 25 * 60 * 60 * 1000);
    const docHash = offerLetter?.blockchainHash || '0x0000000000000000000000000000000000000000000000000000000000000000';

    await prisma.paymentCase.create({
      data: {
        id: pmtId,
        caseId: cId,
        beneficiaryId: primaryOwner.ownerId,
        amount,
        accountHolderName: primaryOwner?.name || null,
        phoneNumber: primaryOwner?.contact || null,
        myKadNumber: primaryOwner?.nric || null,
        status: PaymentStatus.BANK_DETAILS_AND_M1_PENDING,
        requiredSignatures: 0,
        currentSignatures: 0,
        createdAt: recordTime,
        updatedAt: recordTime,
      },
    });

    const timestampSec = Math.floor(new Date(recordTime).getTime() / 1000);
    await prisma.blockchainRecord.create({
      data: {
        id: bcnId,
        caseId: cId,
        milestone: 'AWARD',
        onChainKey: `${cId}#M1-${timestampSec}`,
        documentHash: docHash,
        status: BlockchainStatus.READY_TO_PUBLISH,
        createdAt: recordTime,
        updatedAt: recordTime,
      },
    });

    console.log(`⛓️ Pre-seeded ${cId} -> Payment: ${pmtId} | Blockchain: ${bcnId} (${recordTime.toISOString()})`);
  }

  console.log(
    '\nℹ️ Seeding Summary:\n' +
    '  - LAC-2026-08-0001 to 0005: 5 Untouched baseline cases (siewfeng)\n' +
    '  - LAC-2026-08-0006 to 0015: 10 Cases at OFFER_ACCEPTED (all 4 supporting documents + signed Form H uploaded)\n' +
    '  - LAC-2026-08-0016 to 0020: 5 Cases at OFFER_ISSUED (all 4 supporting documents + Form H generated, awaiting response)\n' +
    '  - Payment & Blockchain: Pre-seeded PMT-2026-09-0001..0011 and BCN-2026-09-0001..0011 for 11 accepted cases.'
  );

  // ===========================================================================
  // 5. Seed Compliance Audit Logs
  // ===========================================================================
  console.log('\n--- 5. Seeding Compliance Audit Logs ---');
  await prisma.auditLog.deleteMany({});

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000);
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 3600 * 1000);

  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000);

  const initialAuditLogs = [
    // 1. Sys Admin Login & 2FA OTP
    {
      userId: defaultAdmin.userId,
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'USER_LOGIN_SUCCESS',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({ actorName: defaultAdmin.name, actorEmail: defaultAdmin.email, loginMethod: 'PASSWORD_AUTHENTICATION', sessionRole: 'SYSTEM_ADMINISTRATOR' }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: minutesAgo(12),
    },
    {
      userId: defaultAdmin.userId,
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'SYSTEM_ADMIN_OTP_VERIFIED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'SECURITY',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({ actorName: defaultAdmin.name, actorEmail: defaultAdmin.email, authMethod: '2FA_EMAIL_OTP', accessScope: 'FULL_SUPERUSER_ADMIN', status: 'VERIFIED' }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: minutesAgo(10),
    },
    // 2. Email Templates Provisioning & Updates
    {
      userId: defaultAdmin.userId,
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'EMAIL_TEMPLATE_UPDATED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({ actorName: defaultAdmin.name, actorEmail: defaultAdmin.email, templateName: 'SYSTEM_ADMIN_OTP', subject: 'FCR-SCS Security: Your Administrator Verification Code is {{otp}}' }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: hoursAgo(1),
    },
    {
      userId: defaultAdmin.userId,
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'EMAIL_TEMPLATE_UPDATED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({ actorName: defaultAdmin.name, actorEmail: defaultAdmin.email, templateName: 'ACCOUNT_ACTIVATION', subject: 'FCR-SCS: Activate Your Account' }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: hoursAgo(2),
    },
    {
      userId: defaultAdmin.userId,
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'EMAIL_TEMPLATE_UPDATED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({ actorName: defaultAdmin.name, actorEmail: defaultAdmin.email, templateName: 'PASSWORD_RESET', subject: 'FCR-SCS: Password Reset Request' }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: hoursAgo(3),
    },
    // 3. Staff Users Provisioning by Admin
    ...[1, 2, 3, 4, 5].map((i) => ({
      userId: defaultAdmin.userId,
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'ADMIN_USER_PROVISIONED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({
        actorName: defaultAdmin.name,
        actorEmail: defaultAdmin.email,
        provisionedUserId: seededUsers[`ga${i}@fcrscs.gov.my`]?.userId,
        provisionedUserEmail: `ga${i}@fcrscs.gov.my`,
        provisionedUserName: `Gov Admin ${i}`,
        roleAssigned: 'GOVERNMENT_ADMINISTRATOR',
        department: 'Federal Land Governance Authority',
      }),
      systemResponse: 'CREATED (201)',
      isArchived: false,
      createdAt: hoursAgo(4 + i),
    })),
    ...[1, 2, 3, 4, 5].map((i) => ({
      userId: defaultAdmin.userId,
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'ADMIN_USER_PROVISIONED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({
        actorName: defaultAdmin.name,
        actorEmail: defaultAdmin.email,
        provisionedUserId: seededUsers[`go${i}@fcrscs.gov.my`]?.userId,
        provisionedUserEmail: `go${i}@fcrscs.gov.my`,
        provisionedUserName: `Gov Officer ${i}`,
        roleAssigned: 'GOVERNMENT_OFFICER',
      }),
      systemResponse: 'CREATED (201)',
      isArchived: false,
      createdAt: daysAgo(1 + i * 0.2),
    })),
    ...[1, 2, 3, 4, 5].map((i) => ({
      userId: defaultAdmin.userId,
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'ADMIN_USER_PROVISIONED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({
        actorName: defaultAdmin.name,
        actorEmail: defaultAdmin.email,
        provisionedUserId: seededUsers[`lv${i}@fcrscs.gov.my`]?.userId,
        provisionedUserEmail: `lv${i}@fcrscs.gov.my`,
        provisionedUserName: `Land Valuer ${i}`,
        roleAssigned: 'LAND_VALUER',
        licenseNo: `VAL-MY-${1000 + i * 24}`,
      }),
      systemResponse: 'CREATED (201)',
      isArchived: false,
      createdAt: daysAgo(2 + i * 0.2),
    })),
    // 4. Community Member Registrations & Activations
    ...[1, 2, 3, 4, 5].flatMap((i) => [
      {
        userId: seededUsers[`m${i}@fcrscs.gov.my`]?.userId,
        userRole: 'DISPLACED_COMMUNITY_MEMBER',
        activityType: 'USER_REGISTERED',
        moduleName: 'USER_MANAGEMENT',
        severity: 'INFO',
        ipAddress: '127.0.0.1',
        deviceInfo: i % 2 === 0 ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)' : 'Mozilla/5.0 (Linux; Android 14)',
        activityDetails: JSON.stringify({
          actorName: `Member ${i}`,
          actorEmail: `m${i}@fcrscs.gov.my`,
          registrationChannel: 'PORTAL_PUBLIC_FORM',
          icMasked: '******-**-****',
        }),
        systemResponse: 'CREATED (201)',
        isArchived: false,
        createdAt: daysAgo(3 + i * 0.5),
      },
      {
        userId: seededUsers[`m${i}@fcrscs.gov.my`]?.userId,
        userRole: 'DISPLACED_COMMUNITY_MEMBER',
        activityType: 'ACCOUNT_ACTIVATED',
        moduleName: 'USER_MANAGEMENT',
        severity: 'INFO',
        ipAddress: '127.0.0.1',
        deviceInfo: i % 2 === 0 ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)' : 'Mozilla/5.0 (Linux; Android 14)',
        activityDetails: JSON.stringify({
          actorName: `Member ${i}`,
          actorEmail: `m${i}@fcrscs.gov.my`,
          tokenType: 'EMAIL_VERIFICATION_TOKEN',
          verifiedAt: new Date(now.getTime() - (3 + i * 0.5) * 24 * 3600 * 1000 + 15 * 60 * 1000).toISOString(),
        }),
        systemResponse: 'SUCCESS (200)',
        isArchived: false,
        createdAt: daysAgo(3 + i * 0.5 - 0.01),
      },
    ]),
    // 5. Staff Successful Logins
    {
      userId: seededUsers['ga1@fcrscs.gov.my']?.userId,
      userRole: 'GOVERNMENT_ADMINISTRATOR',
      activityType: 'USER_LOGIN_SUCCESS',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({ actorName: 'Gov Admin 1', actorEmail: 'ga1@fcrscs.gov.my', userRole: 'GOVERNMENT_ADMINISTRATOR', authType: 'CREDENTIALS' }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: hoursAgo(3),
    },
    {
      userId: seededUsers['go1@fcrscs.gov.my']?.userId,
      userRole: 'GOVERNMENT_OFFICER',
      activityType: 'USER_LOGIN_SUCCESS',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({ actorName: 'Gov Officer 1', actorEmail: 'go1@fcrscs.gov.my', userRole: 'GOVERNMENT_OFFICER', authType: 'CREDENTIALS' }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: hoursAgo(2),
    },
    {
      userId: seededUsers['lv1@fcrscs.gov.my']?.userId,
      userRole: 'LAND_VALUER',
      activityType: 'USER_LOGIN_SUCCESS',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      activityDetails: JSON.stringify({ actorName: 'Land Valuer 1', actorEmail: 'lv1@fcrscs.gov.my', userRole: 'LAND_VALUER', authType: 'CREDENTIALS' }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: hoursAgo(1),
    },
    // 6. Role Permission Matrix Update
    {
      userId: defaultAdmin.userId,
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'ROLE_PERMISSIONS_UPDATED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'CRITICAL',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({ actorName: defaultAdmin.name, actorEmail: defaultAdmin.email, targetRole: 'GOVERNMENT_ADMINISTRATOR', updatedByRole: defaultAdmin.role, permissionCount: 14 }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: hoursAgo(5),
    },
    // 7. User Status Toggle
    {
      userId: defaultAdmin.userId,
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'USER_STATUS_TOGGLED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'WARNING',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({ actorName: defaultAdmin.name, actorEmail: defaultAdmin.email, targetUserId: seededUsers['m5@fcrscs.gov.my']?.userId, targetEmail: 'm5@fcrscs.gov.my', targetName: 'Member 5', newStatus: 'Active', reason: 'Periodic statutory identity document re-verification cleared' }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: daysAgo(1),
    },
    // 8. Security Throttling Alert
    {
      userId: null,
      userRole: null,
      activityType: 'SECURITY_ALERT_BRUTE_FORCE_THROTTLED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'SECURITY',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      activityDetails: JSON.stringify({ attemptedEmail: defaultAdmin.email, reason: '3 consecutive invalid password entries detected', actionTaken: 'TEMPORARY_RATE_LIMIT_APPLIED', gateway: 'Local development gateway' }),
      systemResponse: 'FAILED (429)',
      isArchived: false,
      createdAt: hoursAgo(10),
    },
    // 9. Annual Compliance Archive
    {
      userId: defaultAdmin.userId,
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'ANNUAL_COMPLIANCE_ARCHIVE',
      moduleName: 'USER_MANAGEMENT',
      severity: 'WARNING',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({ actorName: defaultAdmin.name, actorEmail: defaultAdmin.email, archivedBatchCount: 1420, policy: 'STATUTORY_DATA_RETENTION_7_YEARS', retentionNotice: 'Prior annual records archived to cold audit vault' }),
      systemResponse: 'SUCCESS (200)',
      isArchived: true,
      createdAt: daysAgo(210),
    },
  ];

  for (const log of initialAuditLogs) {
    await prisma.auditLog.create({ data: log });
  }
  console.log(`📋 Seeded ${initialAuditLogs.length} Compliance Audit Logs`);

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
