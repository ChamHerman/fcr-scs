import 'dotenv/config';
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

  // 1. Seed Admin User
  const adminEmail = 'admin@fcrscs.gov.my';
  const plainPassword = 'password123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hashedPassword,
    },
    create: {
      name: 'System Administrator',
      email: adminEmail,
      contactNumber: '0123456789',
      identificationNumber: '900101-14-1234',
      role: UserRole.SYSTEM_ADMINISTRATOR,
      passwordHash: hashedPassword,
      isActive: true,
    },
  });

  console.log(`✅ Upserted Admin User: ${admin.email}`);

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
      createdById: admin.userId, // Link template to admin
    },
  });

  console.log(`✅ Upserted Email Template: ${template.templateName}`);

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
