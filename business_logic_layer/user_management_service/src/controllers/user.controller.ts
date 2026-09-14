import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { sendTemplatedEmail } from '../utils/email.service';

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

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials or inactive account' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ error: 'Account not activated. Please check your email to activate.' });
      return;
    }

    // System Administrators require 2FA OTP verification
    if (user.role === 'SYSTEM_ADMINISTRATOR') {
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

    const session = await prisma.userSession.create({
      data: {
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

    res.json({
      message: 'Login successful',
      token: sessionToken,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        identificationNumber: user.identificationNumber,
        contactNumber: user.contactNumber,
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

    await prisma.userSession.create({
      data: {
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

    res.json({
      message: 'Login successful',
      token: sessionToken,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        identificationNumber: user.identificationNumber,
        contactNumber: user.contactNumber,
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

    await prisma.passwordReset.create({
      data: {
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
    const { name, email, contactNumber, identificationNumber, password } = req.body;

    if (!name || !email || !contactNumber || !identificationNumber || !password) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

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
          { identificationNumber },
        ]
      }
    });

    if (existingRoleUser) {
      if (existingRoleUser.contactNumber === contactNumber) {
        res.status(400).json({ error: 'Contact number is already in use' });
        return;
      }
      if (existingRoleUser.identificationNumber === identificationNumber) {
        res.status(400).json({ error: 'Identification number is already in use' });
        return;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        contactNumber,
        identificationNumber,
        passwordHash: hashedPassword,
        role: 'DISPLACED_COMMUNITY_MEMBER',
        isActive: false, // Must verify email
      },
    });

    // Generate activation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await prisma.accountActivation.create({
      data: {
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
  } catch (error) {
    console.error('[Registration Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminCreateUser(req: Request, res: Response): Promise<void> {
  try {
    console.log('[adminCreateUser] Request body:', req.body);
    const { name, email, contactNumber, identificationNumber, role } = req.body;
    const password = req.body.password || 'Password$123';

    if (!name || !email || !contactNumber || !identificationNumber || !role) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    if (role === 'SYSTEM_ADMINISTRATOR') {
      res.status(403).json({ error: 'Cannot create system administrator account' });
      return;
    }

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
          { identificationNumber },
        ]
      }
    });

    if (existingRoleUser) {
      if (existingRoleUser.contactNumber === contactNumber) {
        res.status(400).json({ error: 'Contact number is already in use for this role' });
        return;
      }
      if (existingRoleUser.identificationNumber === identificationNumber) {
        res.status(400).json({ error: 'Identification number is already in use for this role' });
        return;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        contactNumber,
        identificationNumber,
        passwordHash: hashedPassword,
        role: role,
        isActive: true, // admin created users are active by default
      },
    });

    res.status(201).json({ success: true, message: 'User created successfully', data: { id: user.userId, email: user.email } });
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
      },
    });

    const formattedUsers = users.map(u => ({
      id: u.userId,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.isActive ? 'Active' : 'Inactive',
      sensitive: u.email,
      identificationNumber: u.identificationNumber,
      contactNumber: u.contactNumber,
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

    res.json({ success: true, data: updatedUser, message: `User successfully ${isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    console.error('[toggleUserStatus Error]', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

