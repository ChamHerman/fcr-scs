import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL || 'postgresql://fcr_app:postgres@127.0.0.1:5432/fcr_scs_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Seed 3 Admin Users
  const plainPassword = 'password123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const adminsToCreate = [
    { email: 'admin@fcrscs.gov.my', name: 'System Administrator 1', id: '900101-14-1234', contact: '0123456789' },
    { email: 'admin2@fcrscs.gov.my', name: 'System Administrator 2', id: '900101-14-1235', contact: '0123456788' },
    { email: 'admin3@fcrscs.gov.my', name: 'System Administrator 3', id: '900101-14-1236', contact: '0123456787' },
  ];

  let firstAdminId = '';

  for (const adminData of adminsToCreate) {
    const admin = await prisma.user.upsert({
      where: { email: adminData.email },
      update: {
        passwordHash: hashedPassword,
      },
      create: {
        name: adminData.name,
        email: adminData.email,
        contactNumber: adminData.contact,
        identificationNumber: adminData.id,
        role: UserRole.SYSTEM_ADMINISTRATOR,
        passwordHash: hashedPassword,
        isActive: true,
      },
    });
    console.log(`✅ Upserted Admin User: ${admin.email}`);
    if (!firstAdminId) firstAdminId = admin.userId;
  }

  // 2. Seed Email Templates
  const templateName = 'PASSWORD_RESET';
  const template = await prisma.emailTemplate.upsert({
    where: { templateName },
    update: {},
    create: {
      templateName,
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
      createdById: firstAdminId, // Link template to first admin
    },
  });

  console.log(`✅ Upserted Email Template: ${template.templateName}`);

  const activationTemplateName = 'ACCOUNT_ACTIVATION';
  const activationTemplate = await prisma.emailTemplate.upsert({
    where: { templateName: activationTemplateName },
    update: {},
    create: {
      templateName: activationTemplateName,
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
      createdById: firstAdminId,
    },
  });

  console.log(`✅ Upserted Email Template: ${activationTemplate.templateName}`);

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
