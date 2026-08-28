import type { Role } from '@prisma/client';
import { prisma } from '../config/database.js';
import { userRepository } from '../database/prisma/repositories/user.repository.js';
import { getPaginationParams } from '../utils/pagination.js';
import { AppError } from '../middleware/errorHandler.js';
import { revokeAllUserRefreshTokens } from './auth.service.js';

export async function getUsers(query: { page?: number | string; limit?: number | string }) {
  const { page, limit, skip } = getPaginationParams(query);

  const [users, total] = await Promise.all([
    userRepository.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        deletedAt: true,
      },
    }),
    userRepository.count(),
  ]);

  return {
    users: users.map(({ deletedAt, ...user }) => ({ ...user, isActive: !deletedAt })),
    total,
    page,
    limit,
  };
}

export async function getRoles() {
  return prisma.adminRole.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, permissions: true },
  });
}

/** Updates a user's role, then revokes every outstanding refresh token /
 * bumps tokenVersion so previously issued access tokens (which embed the
 * old role/permissions) stop being trusted immediately. */
export async function updateUserRole(userId: string, role: Role) {
  const existing = await userRepository.findUnique({ where: { id: userId } });
  if (!existing || existing.deletedAt) throw new AppError('User not found', 404);

  const user = await userRepository.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, role: true, permissions: true, updatedAt: true },
  });

  await revokeAllUserRefreshTokens(userId);
  return user;
}

/** Assigns (or clears, if null) a user's AdminRole bundle, then revokes
 * every outstanding refresh token / bumps tokenVersion so previously issued
 * access tokens (which embed the old permission set) stop being trusted
 * immediately — same rationale as updateUserRole above. */
export async function updateUserAdminRole(userId: string, adminRoleId: string | null) {
  const existing = await userRepository.findUnique({ where: { id: userId } });
  if (!existing || existing.deletedAt) throw new AppError('User not found', 404);

  if (adminRoleId !== null) {
    const role = await prisma.adminRole.findUnique({ where: { id: adminRoleId } });
    if (!role || role.deletedAt) throw new AppError('Admin role not found', 404);
  }

  const user = await userRepository.update({
    where: { id: userId },
    data: { adminRoleId },
    select: {
      id: true,
      email: true,
      role: true,
      permissions: true,
      updatedAt: true,
      adminRole: { select: { id: true, name: true, permissions: true } },
    },
  });

  await revokeAllUserRefreshTokens(userId);
  return user;
}

/** Soft-deletes a user and revokes every outstanding refresh token /
 * bumps tokenVersion so any live access tokens are rejected on next use. */
export async function deactivateUser(userId: string) {
  const existing = await userRepository.findUnique({ where: { id: userId } });
  if (!existing || existing.deletedAt) throw new AppError('User not found', 404);

  const user = await userRepository.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
    select: { id: true, email: true, deletedAt: true },
  });

  await revokeAllUserRefreshTokens(userId);
  return user;
}
