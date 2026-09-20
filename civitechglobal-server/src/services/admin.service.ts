import type { Role } from '@prisma/client';
import { prisma } from '../config/database.js';
import { userRepository } from '../database/prisma/repositories/user.repository.js';
import { getPaginationParams } from '../utils/pagination.js';
import { searchWhere } from './list-search.js';
import { toPage } from '../utils/page.js';
import { AppError } from '../middleware/errorHandler.js';
import { emailLookupHash, revokeAllUserRefreshTokens } from './auth.service.js';
import { hashPassword } from '../utils/password.js';
import type { Permission } from '../auth/permissions.js';

export async function getUsers(query: {
  page?: number | string;
  limit?: number | string;
  search?: string;
  role?: string;
  status?: string;
}) {
  const { page, limit, skip } = getPaginationParams(query);

  const where = {
    ...searchWhere(query.search, ['email', 'firstName', 'lastName']),
    ...(query.role ? { role: query.role as Role } : {}),
    // Deactivation is a deletedAt stamp, not a column anybody would think to
    // filter on, so the query says "active" or "inactive" and this translates.
    ...(query.status === 'active' ? { deletedAt: null } : {}),
    ...(query.status === 'inactive' ? { deletedAt: { not: null } } : {}),
  };

  const [users, total] = await Promise.all([
    userRepository.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        // The admin screen edits these in place, so the list has to carry
        // them; fetching each account again to render a row would be silly.
        permissions: true,
        createdAt: true,
        deletedAt: true,
      },
    }),
    userRepository.count({ where }),
  ]);

  return toPage(
    users.map(({ deletedAt, ...user }) => ({ ...user, isActive: !deletedAt })),
    total,
    page,
    limit,
  );
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

// ---------------------------------------------------------------------------
// Staff accounts
// ---------------------------------------------------------------------------

/**
 * Creates an admin, with exactly the modules it is meant to reach.
 *
 * Until now the only way to get an admin was to let somebody register as a
 * customer and then promote them, which meant every staff account began life
 * as a self-service signup with a password nobody had chosen deliberately.
 *
 * SUPER_ADMIN cannot be created here on purpose. There is one, it comes from
 * the seed, and an endpoint that mints unlimited super admins is a much larger
 * blast radius than this feature is worth.
 */
export async function createAdmin(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  permissions: Permission[];
}) {
  const emailHash = emailLookupHash(input.email);

  const existing = await userRepository.findFirst({ where: { emailHash } });
  if (existing && !existing.deletedAt) {
    throw new AppError('حسابی با این نشانی ایمیل از پیش وجود دارد.', 409);
  }

  const data = {
    email: input.email.trim().toLowerCase(),
    emailHash,
    password: await hashPassword(input.password),
    firstName: input.firstName,
    lastName: input.lastName,
    role: 'ADMIN' as const,
    permissions: input.permissions,
    // Created by a person who typed the address, not claimed by whoever
    // controls the inbox — so there is nothing for a verification link to add.
    emailVerified: true,
  };

  // A soft-deleted row still holds the unique emailHash, so reactivate it
  // rather than leaving the address permanently unusable.
  const user = existing
    ? await userRepository.update({
        where: { id: existing.id },
        data: { ...data, deletedAt: null, tokenVersion: { increment: 1 } },
        select: staffFields(),
      })
    : await userRepository.create({ data, select: staffFields() });

  return user;
}

/**
 * Replaces which modules a staff account can reach.
 *
 * The whole set is sent, not a delta: "add X" and "the set is now X" differ
 * only when two people edit at once, and the second is the one an admin screen
 * with checkboxes actually means.
 *
 * Sessions are cut afterwards because the access token embeds permissions —
 * without that, revoking a module leaves it working until the token expires,
 * which is the opposite of what somebody revoking access expects.
 */
export async function setUserPermissions(userId: string, permissions: Permission[]) {
  const existing = await userRepository.findUnique({ where: { id: userId } });
  if (!existing || existing.deletedAt) throw new AppError('User not found', 404);

  if (existing.role === 'SUPER_ADMIN') {
    // A super admin holds everything implicitly; storing a narrower list would
    // read as a restriction that requirePermission does not honour.
    throw new AppError('دسترسی مدیر ارشد قابل محدود کردن نیست.', 400);
  }

  const user = await userRepository.update({
    where: { id: userId },
    data: { permissions, tokenVersion: { increment: 1 } },
    select: staffFields(),
  });

  await revokeAllUserRefreshTokens(userId);
  return user;
}

function staffFields() {
  return {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    permissions: true,
    createdAt: true,
  } as const;
}
