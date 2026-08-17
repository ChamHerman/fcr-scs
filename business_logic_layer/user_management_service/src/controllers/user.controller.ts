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
      res.status(401).json({ error: 'Invalid credentials or inactive account' });
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
