import { z } from 'zod';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_REQUIREMENTS,
  PASSWORD_COMPLEXITY_MESSAGE,
} from '../utils/passwordPolicy.js';

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_COMPLEXITY_MESSAGE)
  .max(PASSWORD_MAX_LENGTH, PASSWORD_COMPLEXITY_MESSAGE)
  .regex(PASSWORD_REQUIREMENTS.lowercase, PASSWORD_COMPLEXITY_MESSAGE)
  .regex(PASSWORD_REQUIREMENTS.uppercase, PASSWORD_COMPLEXITY_MESSAGE)
  .regex(PASSWORD_REQUIREMENTS.digit, PASSWORD_COMPLEXITY_MESSAGE)
  .regex(PASSWORD_REQUIREMENTS.special, PASSWORD_COMPLEXITY_MESSAGE);

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: passwordSchema,
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100).optional(),
  lastName: z.string().trim().min(1, 'Last name is required').max(100).optional(),
  phone: z.string().trim().max(20).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('ایمیل معتبر نیست'),
});

export const resetPasswordSchema = z.object({
  // Not `.uuid()` or a length check: the token format is ours to change, and a
  // shape rule here would be a second place to keep in step for no benefit.
  token: z.string().trim().min(1, 'پیوند نامعتبر است'),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, 'پیوند نامعتبر است'),
});
