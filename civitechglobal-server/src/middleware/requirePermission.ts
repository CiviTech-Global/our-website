import type { Request, Response, NextFunction } from 'express';
import { userRepository } from '../database/prisma/repositories/user.repository.js';

/**
 * Requires the caller to hold at least one of the given permission strings.
 * SUPER_ADMIN always bypasses the check. Permissions come from the access
 * token first; if that isn't enough (empty, stale, or missing a permission
 * granted since the token was issued — including via an AdminRole bundle,
 * see prisma/schema.prisma), falls back to a fresh DB read that merges the
 * user's own permissions with their AdminRole's, so a newly granted role
 * bundle takes effect without re-login.
 */
export function requirePermission(...perms: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    let userPermissions = req.user.permissions || [];

    if (!userPermissions.some((p) => perms.includes(p))) {
      const user = await userRepository.findUnique({
        where: { id: req.user.userId },
        select: { permissions: true, adminRole: { select: { permissions: true } } },
      });
      if (user) {
        userPermissions = Array.from(new Set([...user.permissions, ...(user.adminRole?.permissions ?? [])]));
        req.user.permissions = userPermissions;
      }
    }

    if (userPermissions.some((p) => perms.includes(p))) {
      next();
      return;
    }

    res.status(403).json({ success: false, message: 'Insufficient permissions' });
  };
}
