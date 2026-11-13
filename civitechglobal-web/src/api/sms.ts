import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';

/**
 * The account's phone, password reset by SMS, and the staff SMS report.
 * Server: routes/phone.routes.ts (under /auth) and billing.routes.ts (/admin/sms).
 */

export interface PhoneSettings {
  phone: string | null;
  phoneVerifiedAt: string | null;
  smsOptOut: boolean;
  /** The number given at identity verification, offered as the one to verify. */
  suggestedPhone: string | null;
  smsAvailable: boolean;
}

const PHONE_KEY = ['auth', 'me', 'phone'] as const;

export function usePhoneSettings(enabled = true) {
  return useQuery({
    queryKey: PHONE_KEY,
    queryFn: async () => (await api.get<PhoneSettings>('/auth/me/phone')).data,
    enabled,
  });
}

export function useRequestPhoneCode() {
  return useMutation({
    mutationFn: async (phone: string) =>
      (await api.post<{ expiresInSeconds: number }>('/auth/me/phone/code', { phone })).data,
  });
}

export function useConfirmPhoneCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => (await api.post('/auth/me/phone/verify', { code })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: PHONE_KEY }),
  });
}

export function useSetSmsOptOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (optOut: boolean) => (await api.patch('/auth/me/sms', { optOut })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: PHONE_KEY }),
  });
}

export function useRequestResetSms() {
  return useMutation({
    mutationFn: async (identifier: string) => (await api.post('/auth/password/sms', { identifier })).data,
  });
}

export function useResetPasswordSms() {
  return useMutation({
    mutationFn: async (input: { identifier: string; code: string; password: string }) =>
      (await api.post('/auth/password/sms/reset', input)).data,
  });
}

export type SmsStatus = 'SENT' | 'FAILED' | 'SKIPPED';

export interface SmsReport {
  days: number;
  provider: string;
  canSend: boolean;
  memberAlerts: boolean;
  dailyCap: number;
  totalCostRials: number;
  kinds: Array<{ kind: string; template: string; sent: number; failed: number; skipped: number; costRials: number }>;
  recent: Array<{ id: string; kind: string; status: SmsStatus; reason: string | null; cost: number | null; createdAt: string }>;
}

export function useSmsReport(days: number) {
  return useQuery({
    queryKey: ['billing', 'admin', 'sms', days],
    queryFn: async () => (await api.get<SmsReport>('/billing/admin/sms', { params: { days } })).data,
  });
}
