import { z } from 'zod';
import { paginationQuerySchema } from './common.schema.js';

export const userListQuerySchema = paginationQuerySchema;

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

export const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const updateUserAdminRoleSchema = z.object({
  adminRoleId: z.string().min(1).nullable(),
});

export type UpdateUserAdminRoleInput = z.infer<typeof updateUserAdminRoleSchema>;
