import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { sendTemplatedEmail } from '../utils/email.service';

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
      },
    });
  } catch (error) {
    console.error('[Login Error]', error);
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
      },
    });

    const formattedUsers = users.map(u => ({
      id: u.userId,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.isActive ? 'Active' : 'Inactive',
      sensitive: u.email,
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

