import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const usersById = new Map<string, any>();
  const adminRolesById = new Map<string, any>();

  const userRepository = {
    findMany: vi.fn(async () => []),
    count: vi.fn(async () => 0),
    findUnique: vi.fn(async ({ where }: any) => usersById.get(where.id) ?? null),
    update: vi.fn(async ({ where, data, select }: any) => {
      const user = usersById.get(where.id);
      Object.assign(user, data);
      if (!select) return user;
      const projected: Record<string, unknown> = {};
      for (const key of Object.keys(select)) {
        if (key === 'adminRole') {
          const role = user.adminRoleId ? adminRolesById.get(user.adminRoleId) ?? null : null;
          projected.adminRole = role ? { id: role.id, name: role.name, permissions: role.permissions } : null;
        } else {
          projected[key] = user[key];
        }
      }
      return projected;
    }),
  };

  const prisma = {
    adminRole: {
      findMany: vi.fn(async () => Array.from(adminRolesById.values())),
      findUnique: vi.fn(async ({ where }: any) => adminRolesById.get(where.id) ?? null),
    },
  };

  const revokeAllUserRefreshTokens = vi.fn(async () => {});

  return { usersById, adminRolesById, userRepository, prisma, revokeAllUserRefreshTokens };
});

vi.mock('../database/prisma/repositories/user.repository.js', () => ({
  userRepository: mocks.userRepository,
}));
vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('./auth.service.js', () => ({ revokeAllUserRefreshTokens: mocks.revokeAllUserRefreshTokens }));

import * as adminService from './admin.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.usersById.clear();
  mocks.adminRolesById.clear();
  mocks.usersById.set('user-1', {
    id: 'user-1',
    email: 'user@example.com',
    role: 'USER',
    permissions: [],
    adminRoleId: null,
    deletedAt: null,
  });
  mocks.adminRolesById.set('role-1', {
    id: 'role-1',
    name: 'support',
    permissions: ['leads'],
    deletedAt: null,
  });
});

describe('admin.service privilege-escalation paths', () => {
  it('updateUserRole updates the role and revokes every outstanding session', async () => {
    const result = await adminService.updateUserRole('user-1', 'ADMIN');

    expect(result.role).toBe('ADMIN');
    expect(mocks.revokeAllUserRefreshTokens).toHaveBeenCalledWith('user-1');
  });

  it('updateUserRole 404s for an unknown user', async () => {
    await expect(adminService.updateUserRole('missing', 'ADMIN')).rejects.toThrow('User not found');
    expect(mocks.revokeAllUserRefreshTokens).not.toHaveBeenCalled();
  });

  it('updateUserRole 404s for a soft-deleted user', async () => {
    mocks.usersById.get('user-1').deletedAt = new Date();
    await expect(adminService.updateUserRole('user-1', 'ADMIN')).rejects.toThrow('User not found');
  });

  it('deactivateUser soft-deletes and revokes every outstanding session', async () => {
    const result = await adminService.deactivateUser('user-1');

    expect(result.deletedAt).toBeInstanceOf(Date);
    expect(mocks.revokeAllUserRefreshTokens).toHaveBeenCalledWith('user-1');
  });

  it('updateUserAdminRole assigns an existing role bundle and revokes sessions', async () => {
    const result = await adminService.updateUserAdminRole('user-1', 'role-1');

    expect(result.adminRole).toEqual({ id: 'role-1', name: 'support', permissions: ['leads'] });
    expect(mocks.usersById.get('user-1').adminRoleId).toBe('role-1');
    expect(mocks.revokeAllUserRefreshTokens).toHaveBeenCalledWith('user-1');
  });

  it('updateUserAdminRole rejects a nonexistent role bundle', async () => {
    await expect(adminService.updateUserAdminRole('user-1', 'no-such-role')).rejects.toThrow('Admin role not found');
    expect(mocks.revokeAllUserRefreshTokens).not.toHaveBeenCalled();
  });

  it('updateUserAdminRole rejects a soft-deleted role bundle', async () => {
    mocks.adminRolesById.get('role-1').deletedAt = new Date();
    await expect(adminService.updateUserAdminRole('user-1', 'role-1')).rejects.toThrow('Admin role not found');
  });

  it('updateUserAdminRole clears the bundle when passed null', async () => {
    mocks.usersById.get('user-1').adminRoleId = 'role-1';

    const result = await adminService.updateUserAdminRole('user-1', null);

    expect(result.adminRole).toBeNull();
    expect(mocks.usersById.get('user-1').adminRoleId).toBeNull();
  });
});
