import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import type { Role } from '@prisma/client';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

export interface AccessTokenPayload {
  userId: string;
  role: Role;
  permissions: string[];
  tokenVersion: number;
}

export interface RefreshTokenPayload extends AccessTokenPayload {
  jti: string;
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL, algorithm: 'HS256' });
}

export function generateRefreshToken(payload: AccessTokenPayload): { token: string; jti: string } {
  const jti = randomBytes(32).toString('hex');
  const token = jwt.sign({ ...payload, jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
    algorithm: 'HS256',
  });
  return { token, jti };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as RefreshTokenPayload;
}

export function getRefreshTokenExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}
