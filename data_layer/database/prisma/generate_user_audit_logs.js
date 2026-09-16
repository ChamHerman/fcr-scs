const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env' });
}

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:0193378431@localhost:5432/fcr_scs_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔄 Fetching current database entities...');

  // 1. Fetch real Users
  const users = await prisma.user.findMany({
    select: {
      userId: true,
      name: true,
      email: true,
      role: true,
      contactNumber: true,
      identificationNumber: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' }
  });

  if (users.length === 0) {
    console.error('❌ No users found in database! Please seed users first.');
    process.exit(1);
  }

  const sysAdmin = users.find(u => u.role === 'SYSTEM_ADMINISTRATOR') || users[0];
  const govAdmins = users.filter(u => u.role === 'GOVERNMENT_ADMINISTRATOR');
  const govOfficers = users.filter(u => u.role === 'GOVERNMENT_OFFICER');
  const landValuers = users.filter(u => u.role === 'LAND_VALUER');
  const members = users.filter(u => u.role === 'DISPLACED_COMMUNITY_MEMBER');

  console.log(`Found ${users.length} total users:`);
  console.log(`- 1 Sys Admin: ${sysAdmin.email} (${sysAdmin.name})`);
  console.log(`- ${govAdmins.length} Gov Admins`);
  console.log(`- ${govOfficers.length} Gov Officers`);
  console.log(`- ${landValuers.length} Land Valuers`);
  console.log(`- ${members.length} Displaced Community Members`);

  // 2. Fetch real Email Templates
  const templates = await prisma.emailTemplate.findMany({
    select: {
      templateId: true,
      templateName: true,
      subject: true,
      createdAt: true,
    }
  });
  console.log(`Found ${templates.length} email templates in DB.`);

  // 3. Clean up existing audit logs
  const deleted = await prisma.auditLog.deleteMany();
  console.log(`🧹 Cleared ${deleted.count} old predefined audit logs.`);

  const now = new Date();
  const minutesAgo = (m) => new Date(now.getTime() - m * 60 * 1000);
  const hoursAgo = (h) => new Date(now.getTime() - h * 3600 * 1000);
  const daysAgo = (d) => new Date(now.getTime() - d * 24 * 3600 * 1000);

  const newLogs = [];

  // ==========================================
  // A. System Admin Login & Security OTP
  // ==========================================
  newLogs.push({
    userId: sysAdmin.userId,
    userRole: sysAdmin.role,
    activityType: 'USER_LOGIN_SUCCESS',
    moduleName: 'USER_MANAGEMENT',
    severity: 'INFO',
    ipAddress: '127.0.0.1',
    deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
    activityDetails: JSON.stringify({
      actorName: sysAdmin.name,
      actorEmail: sysAdmin.email,
      loginMethod: 'PASSWORD_AUTHENTICATION',
      sessionRole: sysAdmin.role,
      note: 'Admin session initiated on localhost',
    }),
    systemResponse: 'SUCCESS (200)',
    isArchived: false,
    createdAt: minutesAgo(12),
  });

  newLogs.push({
    userId: sysAdmin.userId,
    userRole: sysAdmin.role,
    activityType: 'SYSTEM_ADMIN_OTP_VERIFIED',
    moduleName: 'USER_MANAGEMENT',
    severity: 'SECURITY',
    ipAddress: '127.0.0.1',
    deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
    activityDetails: JSON.stringify({
      actorName: sysAdmin.name,
      actorEmail: sysAdmin.email,
      authMethod: '2FA_EMAIL_OTP',
      accessScope: 'FULL_SUPERUSER_ADMIN',
      status: 'VERIFIED',
    }),
    systemResponse: 'SUCCESS (200)',
    isArchived: false,
    createdAt: minutesAgo(10),
  });

  // ==========================================
  // B. Email Templates Provisioned / Updated
  // ==========================================
  templates.forEach((tmpl, idx) => {
    newLogs.push({
      userId: sysAdmin.userId,
      userRole: sysAdmin.role,
      activityType: tmpl.templateName === 'TEST_CUSTOM_NOTICE' ? 'EMAIL_TEMPLATE_CREATED' : 'EMAIL_TEMPLATE_UPDATED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({
        actorName: sysAdmin.name,
        actorEmail: sysAdmin.email,
        templateId: tmpl.templateId,
        templateName: tmpl.templateName,
        subject: tmpl.subject,
        action: tmpl.templateName === 'TEST_CUSTOM_NOTICE' ? 'CREATE_TEMPLATE' : 'SAVE_TEMPLATE_CHANGES',
      }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: hoursAgo(1 + idx * 0.5),
    });
  });

  // ==========================================
  // C. Government Administrators Provisioned by Admin
  // ==========================================
  govAdmins.forEach((ga, idx) => {
    newLogs.push({
      userId: sysAdmin.userId,
      userRole: sysAdmin.role,
      activityType: 'ADMIN_USER_PROVISIONED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({
        actorName: sysAdmin.name,
        actorEmail: sysAdmin.email,
        provisionedUserId: ga.userId,
        provisionedUserEmail: ga.email,
        provisionedUserName: ga.name,
        roleAssigned: ga.role,
        contactNumber: ga.contactNumber,
        department: 'Federal Land Governance Authority',
      }),
      systemResponse: 'CREATED (201)',
      isArchived: false,
      createdAt: hoursAgo(4 + idx),
    });
  });

  // ==========================================
  // D. Government Officers Provisioned
  // ==========================================
  govOfficers.forEach((go, idx) => {
    newLogs.push({
      userId: sysAdmin.userId,
      userRole: sysAdmin.role,
      activityType: 'ADMIN_USER_PROVISIONED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({
        actorName: sysAdmin.name,
        actorEmail: sysAdmin.email,
        provisionedUserId: go.userId,
        provisionedUserEmail: go.email,
        provisionedUserName: go.name,
        roleAssigned: go.role,
        contactNumber: go.contactNumber,
      }),
      systemResponse: 'CREATED (201)',
      isArchived: false,
      createdAt: daysAgo(1 + idx * 0.2),
    });
  });

  // ==========================================
  // E. Land Valuers Provisioned
  // ==========================================
  landValuers.forEach((lv, idx) => {
    newLogs.push({
      userId: sysAdmin.userId,
      userRole: sysAdmin.role,
      activityType: 'ADMIN_USER_PROVISIONED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({
        actorName: sysAdmin.name,
        actorEmail: sysAdmin.email,
        provisionedUserId: lv.userId,
        provisionedUserEmail: lv.email,
        provisionedUserName: lv.name,
        roleAssigned: lv.role,
        licenseNo: `VAL-MY-${1000 + idx * 24}`,
      }),
      systemResponse: 'CREATED (201)',
      isArchived: false,
      createdAt: daysAgo(2 + idx * 0.2),
    });
  });

  // ==========================================
  // F. Community Members Self-Registration & Verification
  // ==========================================
  members.forEach((m, idx) => {
    newLogs.push({
      userId: m.userId,
      userRole: m.role,
      activityType: 'USER_REGISTERED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: idx % 2 === 0 ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)' : 'Mozilla/5.0 (Linux; Android 14)',
      activityDetails: JSON.stringify({
        actorName: m.name,
        actorEmail: m.email,
        registrationChannel: 'PORTAL_PUBLIC_FORM',
        icMasked: '******-**-****',
      }),
      systemResponse: 'CREATED (201)',
      isArchived: false,
      createdAt: daysAgo(3 + idx * 0.5),
    });

    newLogs.push({
      userId: m.userId,
      userRole: m.role,
      activityType: 'ACCOUNT_ACTIVATED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: idx % 2 === 0 ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)' : 'Mozilla/5.0 (Linux; Android 14)',
      activityDetails: JSON.stringify({
        actorName: m.name,
        actorEmail: m.email,
        tokenType: 'EMAIL_VERIFICATION_TOKEN',
        verifiedAt: new Date(now.getTime() - (3 + idx * 0.5) * 24 * 3600 * 1000 + 15 * 60 * 1000).toISOString(),
      }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: daysAgo(3 + idx * 0.5 - 0.01),
    });
  });

  // ==========================================
  // G. Staff Logins
  // ==========================================
  if (govAdmins[0]) {
    newLogs.push({
      userId: govAdmins[0].userId,
      userRole: govAdmins[0].role,
      activityType: 'USER_LOGIN_SUCCESS',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({
        actorName: govAdmins[0].name,
        actorEmail: govAdmins[0].email,
        userRole: govAdmins[0].role,
        authType: 'CREDENTIALS',
      }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: hoursAgo(3),
    });
  }

  if (govOfficers[0]) {
    newLogs.push({
      userId: govOfficers[0].userId,
      userRole: govOfficers[0].role,
      activityType: 'USER_LOGIN_SUCCESS',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({
        actorName: govOfficers[0].name,
        actorEmail: govOfficers[0].email,
        userRole: govOfficers[0].role,
        authType: 'CREDENTIALS',
      }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: hoursAgo(2),
    });
  }

  if (landValuers[0]) {
    newLogs.push({
      userId: landValuers[0].userId,
      userRole: landValuers[0].role,
      activityType: 'USER_LOGIN_SUCCESS',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      activityDetails: JSON.stringify({
        actorName: landValuers[0].name,
        actorEmail: landValuers[0].email,
        userRole: landValuers[0].role,
        authType: 'CREDENTIALS',
      }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: hoursAgo(1),
    });
  }

  // ==========================================
  // H. Role Permission Governance Matrix
  // ==========================================
  newLogs.push({
    userId: sysAdmin.userId,
    userRole: sysAdmin.role,
    activityType: 'ROLE_PERMISSIONS_UPDATED',
    moduleName: 'USER_MANAGEMENT',
    severity: 'CRITICAL',
    ipAddress: '127.0.0.1',
    deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
    activityDetails: JSON.stringify({
      actorName: sysAdmin.name,
      actorEmail: sysAdmin.email,
      targetRole: 'GOVERNMENT_ADMINISTRATOR',
      updatedByRole: sysAdmin.role,
      permissionCount: 14,
      note: 'Canonical statutory role permission matrix synchronized with FR.MD guidelines',
    }),
    systemResponse: 'SUCCESS (200)',
    isArchived: false,
    createdAt: hoursAgo(5),
  });

  // ==========================================
  // I. User Status Toggle Audit
  // ==========================================
  if (members[4]) {
    newLogs.push({
      userId: sysAdmin.userId,
      userRole: sysAdmin.role,
      activityType: 'USER_STATUS_TOGGLED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'WARNING',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      activityDetails: JSON.stringify({
        actorName: sysAdmin.name,
        actorEmail: sysAdmin.email,
        targetUserId: members[4].userId,
        targetEmail: members[4].email,
        targetName: members[4].name,
        newStatus: 'Active',
        reason: 'Periodic statutory identity document re-verification cleared',
      }),
      systemResponse: 'SUCCESS (200)',
      isArchived: false,
      createdAt: daysAgo(1),
    });
  }

  // ==========================================
  // J. Security Incident / Rate Limit Warning
  // ==========================================
  newLogs.push({
    userId: null,
    userRole: null,
    activityType: 'SECURITY_ALERT_BRUTE_FORCE_THROTTLED',
    moduleName: 'USER_MANAGEMENT',
    severity: 'SECURITY',
    ipAddress: '127.0.0.1',
    deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    activityDetails: JSON.stringify({
      attemptedEmail: sysAdmin.email,
      reason: '3 consecutive invalid password entries detected',
      actionTaken: 'TEMPORARY_RATE_LIMIT_APPLIED',
      gateway: 'Local development gateway',
    }),
    systemResponse: 'FAILED (429)',
    isArchived: false,
    createdAt: hoursAgo(10),
  });

  // ==========================================
  // K. Annual Compliance Archive Record
  // ==========================================
  newLogs.push({
    userId: sysAdmin.userId,
    userRole: sysAdmin.role,
    activityType: 'ANNUAL_COMPLIANCE_ARCHIVE',
    moduleName: 'USER_MANAGEMENT',
    severity: 'WARNING',
    ipAddress: '127.0.0.1',
    deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
    activityDetails: JSON.stringify({
      actorName: sysAdmin.name,
      actorEmail: sysAdmin.email,
      archivedBatchCount: 1420,
      policy: 'STATUTORY_DATA_RETENTION_7_YEARS',
      retentionNotice: 'Prior annual records archived to cold audit vault',
    }),
    systemResponse: 'SUCCESS (200)',
    isArchived: true,
    createdAt: daysAgo(210),
  });

  // Write all new logs into database
  for (const log of newLogs) {
    await prisma.auditLog.create({ data: log });
  }

  console.log(`✅ Successfully created ${newLogs.length} real user management audit logs linked to actual database users!`);
}

main()
  .catch((err) => {
    console.error('❌ Error generating audit logs:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
