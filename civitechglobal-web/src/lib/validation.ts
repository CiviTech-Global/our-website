import { z } from 'zod';
import { toLatinDigits } from '@/i18n/utils';

/**
 * Matches the backend password policy: 12+ chars, at least one uppercase, one
 * lowercase, one digit, and one special character.
 */
export const passwordSchema = z
  .string()
  .min(12, 'auth.passwordHint')
  .regex(/[A-Z]/, 'auth.passwordHint')
  .regex(/[a-z]/, 'auth.passwordHint')
  .regex(/[0-9]/, 'auth.passwordHint')
  .regex(/[^A-Za-z0-9]/, 'auth.passwordHint');

export const loginSchema = z.object({
  // An email address or a username: accounts staff open are often handed a
  // username. The server tells them apart by the @.
  email: z.string().trim().min(1, 'auth.required'),
  password: z.string().min(1, 'auth.required'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'auth.required'),
    lastName: z.string().min(1, 'auth.required'),
    email: z.string().min(1, 'auth.required').email('auth.invalidEmail'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'auth.required'),
    accountKind: z.enum(['INDIVIDUAL', 'COMPANY']),
    companyName: z.string().trim().optional(),
    companyNationalId: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.passwordMismatch',
    path: ['confirmPassword'],
  })
  .refine((data) => data.accountKind !== 'COMPANY' || (data.companyName ?? '').length >= 2, {
    message: 'auth.required',
    path: ['companyName'],
  })
  .refine(
    (data) => data.accountKind !== 'COMPANY' || /^\d{11}$/.test(toLatinDigits(data.companyNationalId ?? '')),
    { message: 'auth.required', path: ['companyNationalId'] },
  );
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const profileSchema = z.object({
  firstName: z.string().min(1, 'auth.required'),
  lastName: z.string().min(1, 'auth.required'),
  phone: z.string().optional().or(z.literal('')),
});
export type ProfileFormValues = z.infer<typeof profileSchema>;

export function isPasswordValid(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}
