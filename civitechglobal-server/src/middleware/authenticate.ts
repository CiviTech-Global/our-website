import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt.js';
import { userRepository } from '../database/prisma/repositories/user.repository.js';

interface AuthenticatedUser {
  userId: string;
  role: Role;
  permissions: string[];
}

async function loadUserFromToken(token: string): Promise<AuthenticatedUser> {
  const payload = verifyAccessToken(token);

  const user = await userRepository.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, permissions: true, tokenVersion: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    throw new Error('User not found or inactive');
  }

  if (user.tokenVersion !== payload.tokenVersion) {
    throw new Error('Token has been revoked');
  }

  return { userId: user.id, role: user.role, permissions: user.permissions };
}

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
}

/** Requires a valid access token; rejects with 401 otherwise. */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, message: 'Access token required' });
    return;
  }

  loadUserFromToken(token)
    .then((user) => {
      req.user = user;
      next();
    })
    .catch(() => {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
    });
}

/** Attaches req.user when a valid token is present; otherwise continues anonymously. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    next();
    return;
  }

  loadUserFromToken(token)
    .then((user) => {
      req.user = user;
      next();
    })
    .catch(() => next());
}
