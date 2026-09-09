import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { User, UserRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const sessionToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : authHeader.split(' ')[1];

    if (!sessionToken) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const session = await prisma.userSession.findUnique({
      where: { sessionToken },
      include: { user: true }
    });

    if (
      !session ||
      session.expiresAt <= new Date() ||
      !session.user ||
      !session.user.isActive ||
      session.user.deletedAt !== null
    ) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
      return;
    }

    (req as AuthenticatedRequest).user = session.user;
    next();
  } catch (error) {
    console.error('[Authenticate Middleware Error]', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    if (user.role === UserRole.SYSTEM_ADMINISTRATOR && !allowedRoles.includes(UserRole.SYSTEM_ADMINISTRATOR)) {
      res.status(403).json({ error: 'System Administrators have view-only access and cannot perform disbursement mutations.' });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
      return;
    }

    next();
  };
};

export const enforcePageAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionToken = req.headers.authorization?.split(' ')[1];
    const pagePath = req.headers['x-page-path'] as string; // The frontend passes the current page path

    // If no specific page path is being requested for validation, we might just pass
    if (!pagePath) {
      next();
      return;
    }

    if (!sessionToken) {
      res.status(401).json({ error: 'Unauthorized: Missing token' });
      return;
    }

    const session = await prisma.userSession.findUnique({
      where: { sessionToken },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
      return;
    }

    const role = session.user.role;

    // System admins have absolute access
    if (role === 'SYSTEM_ADMINISTRATOR') {
      next();
      return;
    }

    // Check specific role permissions
    const permission = await prisma.rolePermission.findUnique({
      where: {
        role_pagePath: {
          role: role,
          pagePath: pagePath
        }
      }
    });

    // If there is an explicit permission blocking access, or no permission found, deny
    if (!permission || !permission.canAccess) {
      res.status(403).json({ error: 'Forbidden: Role does not have access to this page' });
      return;
    }

    next();
  } catch (error) {
    console.error('[Enforce Page Access Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
