import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { UserRole } from '@prisma/client';

/**
 * Get permissions for a specific role
 */
export const getRolePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.params;
    
    if (!Object.values(UserRole).includes(role as UserRole)) {
      res.status(400).json({ success: false, message: 'Invalid role' });
      return;
    }

    // SYSTEM_ADMINISTRATOR theoretically has all access by default
    // We fetch any overridden rules or just standard rows for other roles
    const permissions = await prisma.rolePermission.findMany({
      where: { role: role as UserRole }
    });

    res.status(200).json({
      success: true,
      data: permissions
    });
  } catch (error: any) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * Update multiple permissions for a specific role
 */
export const updateRolePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.params;
    const { permissions } = req.body; // Array of { pagePath: string, canAccess: boolean }

    if (!Object.values(UserRole).includes(role as UserRole)) {
      res.status(400).json({ success: false, message: 'Invalid role' });
      return;
    }

    if (role === UserRole.SYSTEM_ADMINISTRATOR) {
      res.status(403).json({ success: false, message: 'System Administrator permissions cannot be modified.' });
      return;
    }

    if (!Array.isArray(permissions)) {
      res.status(400).json({ success: false, message: 'Permissions must be an array' });
      return;
    }

    const updatedPermissions: any[] = [];

    // Use a transaction to ensure all updates happen safely
    await prisma.$transaction(async (tx) => {
      for (const perm of permissions) {
        if (!perm.pagePath || typeof perm.canAccess !== 'boolean') continue;
        
        const updated = await tx.rolePermission.upsert({
          where: {
            role_pagePath: {
              role: role as UserRole,
              pagePath: perm.pagePath
            }
          },
          update: {
            canAccess: perm.canAccess
          },
          create: {
            role: role as UserRole,
            pagePath: perm.pagePath,
            canAccess: perm.canAccess
          }
        });
        updatedPermissions.push(updated);
      }
    });

    res.status(200).json({
      success: true,
      message: 'Permissions updated successfully',
      data: updatedPermissions
    });
  } catch (error: any) {
    console.error('Error updating role permissions:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};
