import { z } from 'zod';
import { paginationQuerySchema } from './common.schema.js';

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export const leadListQuerySchema = paginationQuerySchema.extend({
  status: z
    .preprocess((val) => (Array.isArray(val) ? val[0] : val), z.enum(LEAD_STATUSES))
    .optional(),
});

export type LeadListQuery = z.infer<typeof leadListQuerySchema>;

export const updateLeadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
});

export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;

export const assignLeadSchema = z.object({
  assignedToId: z.string().min(1).nullable(),
});

export type AssignLeadInput = z.infer<typeof assignLeadSchema>;
