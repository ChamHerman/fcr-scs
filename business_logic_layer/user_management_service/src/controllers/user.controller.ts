import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { sendTemplatedEmail } from '../utils/email.service';
import { logAudit } from '../services/audit.service';
import { generateCustomId } from '../utils/idGenerator';
import { resolveMalaysianIdentity } from '../utils/malaysianIdentity';

interface OtpSession {
  userId: string;
  email: string;
  user: any;
  otp: string;
  expiresAt: Date;
  lastSentAt: Date;
}

const otpStore = new Map<string, OtpSession>();

// Periodically clean expired OTP sessions
setInterval(() => {
  const now = new Date();
  for (const [key, entry] of otpStore.entries()) {
    if (entry.expiresAt < now) {
      otpStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Generate a compliant temporary password satisfying policy (8+ chars, upper, lower, number, special)
function generateTemporaryPassword(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const smalls = 'abcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const specials = '@$!%*?&';
  
  let result = '';
  result += letters[crypto.randomInt(0, letters.length)];
  result += smalls[crypto.randomInt(0, smalls.length)];
  result += numbers[crypto.randomInt(0, numbers.length)];
  result += specials[crypto.randomInt(0, specials.length)];
  
  const all = letters + smalls + numbers + specials;
  for (let i = 0; i < 8; i++) {
    result += all[crypto.randomInt(0, all.length)];
  }
  return result;
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      logAudit({
        activityType: 'USER_LOGIN_FAILED',
        moduleName: 'USER_MANAGEMENT',
        severity: 'WARNING',
        ipAddress: req.ip || '127.0.0.1',
        deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
        activityDetails: { email, reason: 'Invalid credentials or inactive account' },
        systemResponse: 'FAILED (401)',
      });
      res.status(401).json({ error: 'Invalid credentials or inactive account' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      logAudit({
        userId: user.userId,
        userRole: user.role,
        actorName: user.name,
        actorEmail: user.email,
        activityType: 'USER_LOGIN_FAILED',
        moduleName: 'USER_MANAGEMENT',
        severity: 'WARNING',
        ipAddress: req.ip || '127.0.0.1',
        deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
        activityDetails: { email, reason: 'Incorrect password' },
        systemResponse: 'FAILED (401)',
      });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ error: 'Account not activated. Please check your email to activate.' });
      return;
    }

    // 2FA OTP verification: required for System Administrators or accounts with mfaEnabled = true
    if (user.role === 'SYSTEM_ADMINISTRATOR' || user.mfaEnabled) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const tempToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      otpStore.set(tempToken, {
        userId: user.userId,
        email: user.email,
        user,
        otp,
        expiresAt,
        lastSentAt: new Date(),
      });

      // Dispatch OTP email
      try {
        await sendTemplatedEmail(user.email, 'SYSTEM_ADMIN_OTP', {
          name: user.name,
          otp,
          expiresMinutes: '5',
        });
      } catch (mailErr) {
        console.error('[MFA Error] Failed to send OTP email:', mailErr);
      }

      console.log(`\n========================================`);
      console.log(`[MFA] System Admin OTP for ${user.email}: ${otp}`);
      console.log(`========================================\n`);

      logAudit({
        userId: user.userId,
        userRole: user.role,
        actorName: user.name,
        actorEmail: user.email,
        activityType: 'SYSTEM_ADMIN_OTP_SENT',
        moduleName: 'USER_MANAGEMENT',
        severity: 'INFO',
        ipAddress: req.ip || '127.0.0.1',
        deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
        activityDetails: { email: user.email, method: 'EMAIL_OTP' },
        systemResponse: 'SUCCESS (200)',
      });

      const atIdx = user.email.indexOf('@');
      const maskedEmail = atIdx > 2
        ? user.email.substring(0, 2) + '*'.repeat(atIdx - 2) + user.email.substring(atIdx)
        : user.email;

      res.json({
        requiresOtp: true,
        tempToken,
        email: maskedEmail,
        message: 'System Administrator login requires 6-digit OTP verification.',
      });
      return;
    }

    // Create session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // 1 day expiration

    const sessionId = await generateCustomId('userSession');
    const session = await prisma.userSession.create({
      data: {
        sessionId,
        userId: user.userId,
        sessionToken,
        ipAddress: req.ip || '0.0.0.0',
        deviceInfo: req.headers['user-agent'] || 'Unknown',
        expiresAt,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { userId: user.userId },
      data: { lastLoginAt: new Date() },
    });

    logAudit({
      userId: user.userId,
      userRole: user.role,
      actorName: user.name,
      actorEmail: user.email,
      activityType: 'USER_LOGIN_SUCCESS',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { email: user.email, role: user.role },
      systemResponse: 'SUCCESS (200)',
    });

    res.json({
      message: 'Login successful',
      token: sessionToken,
      user: {
        userId: user.userId,
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        identificationNumber: user.identificationNumber,
        contactNumber: user.contactNumber,
        address: user.address,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const { tempToken, otp } = req.body;

    if (!tempToken || !otp) {
      res.status(400).json({ error: 'Temporary token and OTP are required' });
      return;
    }

    const sessionData = otpStore.get(tempToken);
    if (!sessionData) {
      res.status(400).json({ error: 'Invalid or expired OTP session. Please sign in again.' });
      return;
    }

    if (sessionData.expiresAt < new Date()) {
      otpStore.delete(tempToken);
      res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
      return;
    }

    if (sessionData.otp !== String(otp).trim()) {
      logAudit({
        userId: sessionData.userId,
        userRole: sessionData.user.role,
        actorName: sessionData.user.name,
        actorEmail: sessionData.email,
        activityType: 'SYSTEM_ADMIN_OTP_FAILED',
        moduleName: 'USER_MANAGEMENT',
        severity: 'SECURITY',
        ipAddress: req.ip || '127.0.0.1',
        deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
        activityDetails: { email: sessionData.email, reason: 'Invalid OTP code entered' },
        systemResponse: 'FAILED (401)',
      });
      res.status(401).json({ error: 'Invalid verification code. Please try again.' });
      return;
    }

    // OTP is valid - consume it
    otpStore.delete(tempToken);
    const user = sessionData.user;

    // Create session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // 1 day expiration

    const sessionId = await generateCustomId('userSession');
    await prisma.userSession.create({
      data: {
        sessionId,
        userId: user.userId,
        sessionToken,
        ipAddress: req.ip || '0.0.0.0',
        deviceInfo: req.headers['user-agent'] || 'Unknown',
        expiresAt,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { userId: user.userId },
      data: { lastLoginAt: new Date() },
    });

    logAudit({
      userId: user.userId,
      userRole: user.role,
      actorName: user.name,
      actorEmail: user.email,
      activityType: 'SYSTEM_ADMIN_OTP_VERIFIED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { email: user.email, role: user.role, authMethod: '2FA_OTP' },
      systemResponse: 'SUCCESS (200)',
    });

    res.json({
      message: 'Login successful',
      token: sessionToken,
      user: {
        userId: user.userId,
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        identificationNumber: user.identificationNumber,
        contactNumber: user.contactNumber,
        address: user.address,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    console.error('[Verify OTP Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function resendOtp(req: Request, res: Response): Promise<void> {
  try {
    const { tempToken } = req.body;

    if (!tempToken) {
      res.status(400).json({ error: 'Temporary token is required' });
      return;
    }

    const sessionData = otpStore.get(tempToken);
    if (!sessionData) {
      res.status(400).json({ error: 'Session not found or expired. Please sign in again.' });
      return;
    }

    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - sessionData.lastSentAt.getTime()) / 1000);
    const cooldownSeconds = 60;

    if (elapsedSeconds < cooldownSeconds) {
      const remaining = cooldownSeconds - elapsedSeconds;
      res.status(429).json({
        error: `Please wait ${remaining} seconds before requesting a new OTP.`,
        remainingSeconds: remaining,
      });
      return;
    }

    // Generate new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    sessionData.otp = newOtp;
    sessionData.lastSentAt = now;
    sessionData.expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 mins fresh

    // Dispatch OTP email
    try {
      await sendTemplatedEmail(sessionData.email, 'SYSTEM_ADMIN_OTP', {
        name: sessionData.user.name,
        otp: newOtp,
        expiresMinutes: '5',
      });
    } catch (mailErr) {
      console.error('[MFA Error] Failed to resend OTP email:', mailErr);
    }

    console.log(`\n========================================`);
    console.log(`[MFA RESEND] New OTP for ${sessionData.email}: ${newOtp}`);
    console.log(`========================================\n`);

    res.json({
      message: 'A new 6-digit OTP has been sent to your email.',
      resendCooldownSeconds: 60,
    });
  } catch (error) {
    console.error('[Resend OTP Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function resolveIc(req: Request, res: Response): Promise<void> {
  try {
    const ic = req.params.ic as string;
    if (!ic) {
      res.status(400).json({ error: 'IC is required' });
      return;
    }
    const identity = resolveMalaysianIdentity(ic);
    res.json({ success: true, data: identity });
  } catch (error) {
    console.error('[Resolve IC Error]', error);
    res.status(500).json({ error: 'Failed to resolve IC identity' });
  }
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({
      where: { userId: id },
      select: {
        userId: true,
        name: true,
        email: true,
        contactNumber: true,
        identificationNumber: true,
        address: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('[Get User By Id Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists or not
      res.json({ message: 'If that email exists, a password reset link has been sent.' });
      return;
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

    const resetId = await generateCustomId('passwordReset');
    await prisma.passwordReset.create({
      data: {
        resetId,
        userId: user.userId,
        resetToken,
        expiresAt,
      },
    });

    // Generate reset link (assuming frontend runs on port 5173 or an environment variable)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send email
    await sendTemplatedEmail(user.email, 'PASSWORD_RESET', {
      name: user.name,
      resetLink,
    });

    res.json({ message: 'If that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('[Forgot Password Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token and new password are required' });
      return;
    }

    const resetRequest = await prisma.passwordReset.findUnique({
      where: { resetToken: token },
      include: { user: true },
    });

    if (!resetRequest || resetRequest.isUsed || resetRequest.expiresAt < new Date()) {
      res.status(400).json({ error: 'Invalid or expired password reset token' });
      return;
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { userId: resetRequest.userId },
        data: { passwordHash: hashedPassword },
      }),
      prisma.passwordReset.update({
        where: { resetId: resetRequest.resetId },
        data: { isUsed: true },
      }),
    ]);

    res.json({ message: 'Password has been successfully reset' });
  } catch (error) {
    console.error('[Reset Password Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, contactNumber, identificationNumber, password, address } = req.body;

    if (!email || !contactNumber || !identificationNumber || !password) {
      res.status(400).json({ error: 'Email, contact number, identification number, and password are required' });
      return;
    }

    // Resolve identity strictly from Malaysian IC (no manual override allowed)
    const identity = resolveMalaysianIdentity(identificationNumber);
    if (!identity.isValid) {
      res.status(400).json({ error: 'Invalid Malaysian Identification Number (IC). Name and address could not be verified.' });
      return;
    }
    const resolvedName = identity.name;
    const resolvedAddress = identity.address;

    // Check for duplicates
    // Email is globally unique
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(400).json({ error: 'Email is already in use' });
      return;
    }

    // Contact number and IC are unique per role (which is hardcoded to DISPLACED_COMMUNITY_MEMBER here)
    const existingRoleUser = await prisma.user.findFirst({
      where: {
        role: 'DISPLACED_COMMUNITY_MEMBER',
        OR: [
          { contactNumber },
          { identificationNumber: identity.rawDigits || identificationNumber },
        ]
      }
    });

    if (existingRoleUser) {
      if (existingRoleUser.contactNumber === contactNumber) {
        res.status(400).json({ error: 'Contact number is already in use' });
        return;
      }
      if (existingRoleUser.identificationNumber === (identity.rawDigits || identificationNumber)) {
        res.status(400).json({ error: 'Identification number is already in use' });
        return;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = await generateCustomId('user');
    const user = await prisma.user.create({
      data: {
        userId,
        name: resolvedName,
        email,
        contactNumber,
        identificationNumber: identity.rawDigits || identificationNumber,
        address: resolvedAddress,
        passwordHash: hashedPassword,
        role: 'DISPLACED_COMMUNITY_MEMBER',
        isActive: false, // Must verify email
      },
    });

    // Generate activation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    const activationId = await generateCustomId('accountActivation');
    await prisma.accountActivation.create({
      data: {
        activationId,
        userId: user.userId,
        token,
        expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const activationLink = `${frontendUrl}/activate?token=${token}`;

    try {
      await sendTemplatedEmail(user.email, 'ACCOUNT_ACTIVATION', {
        name: user.name,
        activationLink,
      });
    } catch (emailError) {
      console.error('[Registration] Failed to send activation email, but account was created.');
      console.log(`\n=== DEVELOPMENT ACTIVATION LINK ===\n${activationLink}\n===================================\n`);
    }

    res.status(201).json({ message: 'Registration successful. Please check your email (or server console) to activate your account.' });

    logAudit({
      userId: user.userId,
      userRole: user.role,
      actorName: user.name,
      actorEmail: user.email,
      activityType: 'CITIZEN_REGISTRATION_SUBMITTED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { name: user.name, email, contactNumber, role: 'DISPLACED_COMMUNITY_MEMBER', address: user.address },
      systemResponse: 'CREATED (201)',
    });
  } catch (error) {
    console.error('[Registration Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminCreateUser(req: Request, res: Response): Promise<void> {
  try {
    console.log('[adminCreateUser] Request body:', req.body);
    const { name, email, contactNumber, identificationNumber, role, address } = req.body;
    const password = req.body.password || 'Password$123';

    if (!email || !contactNumber || !identificationNumber || !role) {
      res.status(400).json({ error: 'Email, contact number, identification number, and role are required' });
      return;
    }

    if (role === 'SYSTEM_ADMINISTRATOR') {
      res.status(403).json({ error: 'Cannot create system administrator account' });
      return;
    }

    // Resolve identity strictly from Malaysian IC (no manual override allowed)
    const identity = resolveMalaysianIdentity(identificationNumber);
    if (!identity.isValid) {
      res.status(400).json({ error: 'Invalid Malaysian Identification Number (IC). Name and address could not be verified.' });
      return;
    }
    const resolvedName = identity.name;
    const resolvedAddress = identity.address;

    // Check for duplicates
    // Email is globally unique
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(400).json({ error: 'Email is already in use' });
      return;
    }

    // Contact number and IC are unique per role
    const existingRoleUser = await prisma.user.findFirst({
      where: {
        role,
        OR: [
          { contactNumber },
          { identificationNumber: identity.rawDigits || identificationNumber },
        ]
      }
    });

    if (existingRoleUser) {
      if (existingRoleUser.contactNumber === contactNumber) {
        res.status(400).json({ error: 'Contact number is already in use for this role' });
        return;
      }
      if (existingRoleUser.identificationNumber === (identity.rawDigits || identificationNumber)) {
        res.status(400).json({ error: 'Identification number is already in use for this role' });
        return;
      }
    }

    // Generate compliant temporary password satisfying policy
    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const userId = await generateCustomId('user');
    const user = await prisma.user.create({
      data: {
        userId,
        name: resolvedName,
        email,
        contactNumber,
        identificationNumber: identity.rawDigits || identificationNumber,
        address: resolvedAddress,
        passwordHash: hashedPassword,
        role: role,
        isActive: true, // admin created users are active by default
        mustChangePassword: true, // MUST change password on first login
      },
    });

    // Send credentials email to user
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      await sendTemplatedEmail(user.email, 'TEMPORARY_CREDENTIALS', {
        name: user.name,
        role: user.role.replace(/_/g, ' '),
        email: user.email,
        temporaryPassword,
        loginUrl: `${frontendUrl}/login`,
      });
    } catch (emailErr) {
      console.error('[Admin Create User] Failed to send credentials email:', emailErr);
    }

    res.status(201).json({ 
      success: true, 
      message: 'User created successfully! Temporary credentials have been dispatched to their email.', 
      data: { 
        id: user.userId, 
        userId: user.userId, 
        email: user.email, 
        name: user.name, 
        address: user.address,
        temporaryPassword 
      } 
    });

    logAudit({
      userId: user.userId,
      userRole: user.role,
      actorName: user.name,
      actorEmail: user.email,
      activityType: 'ADMIN_USER_PROVISIONED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { createdUser: user.name, targetEmail: user.email, targetRole: user.role, address: user.address },
      systemResponse: 'CREATED (201)',
    });
  } catch (error) {
    console.error('[Admin Create User Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        identificationNumber: true,
        contactNumber: true,
        address: true,
      },
    });

    const formattedUsers = users.map(u => ({
      id: u.userId,
      userId: u.userId,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.isActive ? 'Active' : 'Inactive',
      sensitive: u.email,
      identificationNumber: u.identificationNumber,
      contactNumber: u.contactNumber,
      address: u.address,
    }));

    res.json({ success: true, data: formattedUsers });
  } catch (error) {
    console.error('[Get All Users Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function activateAccount(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const activation = await prisma.accountActivation.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!activation || activation.isUsed || activation.expiresAt < new Date()) {
      res.status(400).json({ error: 'Invalid or expired activation token' });
      return;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { userId: activation.userId },
        data: { isActive: true },
      }),
      prisma.accountActivation.update({
        where: { activationId: activation.activationId },
        data: { isUsed: true },
      }),
    ]);

    logAudit({
      userId: activation.userId,
      userRole: activation.user.role,
      actorName: activation.user.name,
      actorEmail: activation.user.email,
      activityType: 'ACCOUNT_ACTIVATED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { email: activation.user.email },
      systemResponse: 'SUCCESS (200)',
    });

    res.json({ message: 'Account successfully activated' });
  } catch (error) {
    console.error('[Account Activation Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function toggleUserStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({ success: false, error: 'isActive must be a boolean' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { userId: id } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (user.role === 'SYSTEM_ADMINISTRATOR' && !isActive) {
      res.status(403).json({ success: false, error: 'Cannot deactivate a System Administrator account.' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { userId: id },
      data: { isActive },
      select: { userId: true, isActive: true }
    });

    logAudit({
      userId: user.userId,
      userRole: user.role,
      actorName: user.name,
      actorEmail: user.email,
      activityType: isActive ? 'USER_STATUS_ACTIVATED' : 'USER_STATUS_DEACTIVATED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'CRITICAL',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { targetUser: user.name, targetEmail: user.email, status: isActive ? 'Active' : 'Inactive' },
      systemResponse: 'SUCCESS (200)',
    });

    res.json({ success: true, data: updatedUser, message: `User successfully ${isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    console.error('[toggleUserStatus Error]', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function changeInitialPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      res.status(400).json({ error: 'Email, current password, and new password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Current temporary password does not match' });
      return;
    }

    // Validate password policy: min 8 chars, 1 upper, 1 lower, 1 digit, 1 special char
    const policyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!policyRegex.test(newPassword)) {
      res.status(400).json({ error: 'New password must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        passwordHash: hashedPassword,
        mustChangePassword: false,
      },
    });

    logAudit({
      userId: user.userId,
      userRole: user.role,
      actorName: user.name,
      actorEmail: user.email,
      activityType: 'USER_INITIAL_PASSWORD_CHANGED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { email: user.email, reason: 'First-time temporary password changed to permanent' },
      systemResponse: 'SUCCESS (200)',
    });

    res.json({ success: true, message: 'Password has been set successfully. You can now access your account.' });
  } catch (error) {
    console.error('[Change Initial Password Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({
      where: { userId: id },
      select: {
        userId: true,
        name: true,
        email: true,
        pendingEmail: true,
        contactNumber: true,
        identificationNumber: true,
        address: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        ...user,
        id: user.userId,
        status: user.isActive ? 'Active' : 'Inactive',
      },
    });
  } catch (error) {
    console.error('[Get Profile Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { contactNumber, email } = req.body;

    const user = await prisma.user.findUnique({ where: { userId: id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updateData: any = {};

    if (contactNumber && contactNumber.trim() !== '') {
      updateData.contactNumber = contactNumber.trim();
    }

    let emailVerificationDispatched = false;
    let pendingEmailValue = user.pendingEmail;

    if (email && email.trim().toLowerCase() !== user.email.toLowerCase()) {
      const normalizedNewEmail = email.trim().toLowerCase();
      // Check if new email is taken by another account
      const emailExists = await prisma.user.findUnique({ where: { email: normalizedNewEmail } });
      if (emailExists && emailExists.userId !== user.userId) {
        res.status(400).json({ error: 'Email address is already in use by another account' });
        return;
      }

      // Generate email change token
      const emailChangeToken = crypto.randomBytes(32).toString('hex');
      const emailChangeExpiresAt = new Date();
      emailChangeExpiresAt.setHours(emailChangeExpiresAt.getHours() + 24);

      updateData.pendingEmail = normalizedNewEmail;
      updateData.emailChangeToken = emailChangeToken;
      updateData.emailChangeExpiresAt = emailChangeExpiresAt;
      pendingEmailValue = normalizedNewEmail;

      // Send verification email to the NEW email address
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verificationLink = `${frontendUrl}/verify-email-change?token=${emailChangeToken}`;

      try {
        await sendTemplatedEmail(normalizedNewEmail, 'EMAIL_CHANGE_VERIFICATION', {
          name: user.name,
          newEmail: normalizedNewEmail,
          verificationLink,
        });
        emailVerificationDispatched = true;
      } catch (e) {
        console.error('[Update Profile] Failed to send email change verification:', e);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { userId: id },
      data: updateData,
      select: {
        userId: true,
        name: true,
        email: true,
        pendingEmail: true,
        contactNumber: true,
        identificationNumber: true,
        address: true,
        role: true,
      },
    });

    logAudit({
      userId: user.userId,
      userRole: user.role,
      actorName: user.name,
      actorEmail: user.email,
      activityType: 'USER_PROFILE_UPDATED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { 
        contactNumber: updateData.contactNumber, 
        pendingEmail: updateData.pendingEmail || null,
        emailVerificationDispatched 
      },
      systemResponse: 'SUCCESS (200)',
    });

    let message = 'Profile updated successfully.';
    if (emailVerificationDispatched) {
      message = `Profile updated. A verification link has been sent to ${pendingEmailValue}. Your active login email remains ${user.email} until verified.`;
    }

    res.json({
      success: true,
      message,
      data: updatedUser,
      pendingEmailDispatched: emailVerificationDispatched,
    });
  } catch (error) {
    console.error('[Update Profile Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyEmailChange(req: Request, res: Response): Promise<void> {
  try {
    const token = (req.query.token || req.body.token) as string;
    if (!token) {
      res.status(400).json({ error: 'Verification token is required' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        emailChangeToken: token,
        emailChangeExpiresAt: { gt: new Date() },
      },
    });

    if (!user || !user.pendingEmail) {
      res.status(400).json({ error: 'Invalid or expired email verification token' });
      return;
    }

    const newEmail = user.pendingEmail;
    // Check if new email was claimed by another account in the meantime
    const taken = await prisma.user.findUnique({ where: { email: newEmail } });
    if (taken && taken.userId !== user.userId) {
      res.status(400).json({ error: 'This email address has already been claimed by another account' });
      return;
    }

    // Commit email change
    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        email: newEmail,
        pendingEmail: null,
        emailChangeToken: null,
        emailChangeExpiresAt: null,
      },
    });

    logAudit({
      userId: user.userId,
      userRole: user.role,
      actorName: user.name,
      actorEmail: newEmail,
      activityType: 'USER_EMAIL_VERIFIED_AND_UPDATED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { oldEmail: user.email, newEmail },
      systemResponse: 'SUCCESS (200)',
    });

    res.json({
      success: true,
      message: `Your email address has been successfully verified and updated to ${newEmail}. Please use this new email for future logins.`,
      email: newEmail,
    });
  } catch (error) {
    console.error('[Verify Email Change Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      res.status(400).json({ error: 'User ID, current password, and new password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    const policyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!policyRegex.test(newPassword)) {
      res.status(400).json({ error: 'New password must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        passwordHash: hashedPassword,
        mustChangePassword: false,
      },
    });

    logAudit({
      userId: user.userId,
      userRole: user.role,
      actorName: user.name,
      actorEmail: user.email,
      activityType: 'USER_PASSWORD_UPDATED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { email: user.email },
      systemResponse: 'SUCCESS (200)',
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('[Change Password Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

