import { z } from 'zod';
import { paginationQuerySchema } from './common.schema.js';

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export const REQUEST_SOURCES = ['WEB', 'TELEGRAM'] as const;

/** Express gives repeated query params as arrays; collapse to the first. */
const single = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => (Array.isArray(val) ? val[0] : val), schema);

export const requestListQuerySchema = paginationQuerySchema.extend({
  status: single(z.enum(LEAD_STATUSES)).optional(),
  source: single(z.enum(REQUEST_SOURCES)).optional(),
  productSlug: single(z.string().min(1).max(100)).optional(),
  search: single(z.string().trim().max(120)).optional(),
});

export type RequestListQuery = z.infer<typeof requestListQuerySchema>;

export const updateRequestStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
});

export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusSchema>;

export const assignRequestSchema = z.object({
  assignedToId: z.string().min(1).nullable(),
});

export type AssignRequestInput = z.infer<typeof assignRequestSchema>;

export const scheduleCallbackSchema = z.object({
  /** ISO 8601 instant, or null to clear a previously scheduled call. */
  scheduledAt: z.string().datetime().nullable(),
});

export type ScheduleCallbackInput = z.infer<typeof scheduleCallbackSchema>;
