import { z } from 'zod';

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
  email: z.string().min(1, 'auth.required').email('auth.invalidEmail'),
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
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.passwordMismatch',
    path: ['confirmPassword'],
  });
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
