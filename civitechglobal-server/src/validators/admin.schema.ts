import { z } from 'zod';
import { paginationQuerySchema } from './common.schema.js';
import { passwordSchema } from './auth.schema.js';
import { isPermission, type Permission } from '../auth/permissions.js';

export const userListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']).optional(),
  /** Deactivated accounts are soft-deleted rows; see getUsers. */
  status: z.enum(['active', 'inactive']).optional(),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;

/**
 * Standing is one value, not two booleans.
 *
 * "Trusted and blocked" has no meaning; making it unrepresentable here is
 * cheaper than deciding which wins somewhere downstream.
 */
export const identityStandingSchema = z.object({
  standing: z.enum(['normal', 'trusted', 'blocked']),
});

/** Every entry must be in the catalogue, so a typo cannot grant nothing quietly. */
const permissionList = z
  .array(z.string())
  .max(20)
  .refine((values) => values.every(isPermission), {
    message: 'دسترسی نامعتبر است',
  })
  .transform((values) => values as Permission[]);

export const createAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email('ایمیل معتبر نیست'),
  password: passwordSchema,
  firstName: z.string().trim().min(1, 'نام الزامی است').max(80),
  lastName: z.string().trim().min(1, 'نام خانوادگی الزامی است').max(80),
  // An admin with nothing granted is a valid starting point: the account
  // exists, signs in, and sees an empty admin area until somebody decides
  // what it should reach.
  permissions: permissionList.default([]),
});

export const setPermissionsSchema = z.object({
  permissions: permissionList,
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const updateUserAdminRoleSchema = z.object({
  adminRoleId: z.string().min(1).nullable(),
});

export type UpdateUserAdminRoleInput = z.infer<typeof updateUserAdminRoleSchema>;
