import { z } from 'zod';
import { paginationQuerySchema } from './common.schema.js';

export const userListQuerySchema = paginationQuerySchema;

export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const updateUserAdminRoleSchema = z.object({
  adminRoleId: z.string().min(1).nullable(),
});

export type UpdateUserAdminRoleInput = z.infer<typeof updateUserAdminRoleSchema>;
