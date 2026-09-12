import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';

export interface MfaStatus {
  enabled: boolean;
  recoveryCodesLeft: number;
}

export interface MfaEnrolment {
  secret: string;
  /** otpauth:// URI — pasteable into an authenticator, or encodable as a QR. */
  otpauthUri: string;
}

export function useMfaStatus(enabled = true) {
  return useQuery({
    queryKey: ['auth', 'mfa'],
    queryFn: async () => {
      const res = await api.get<MfaStatus>('/auth/mfa');
      return res.data;
    },
    enabled,
  });
}

export function useBeginMfaEnrolment() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<MfaEnrolment>('/auth/mfa/begin', {});
      return res.data;
    },
  });
}

/** Returns the recovery codes, which the server will never show again. */
export function useConfirmMfaEnrolment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post<{ recoveryCodes: string[] }>('/auth/mfa/confirm', { code });
      return res.data.recoveryCodes;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth', 'mfa'] }),
  });
}

export function useDisableMfa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      await api.post('/auth/mfa/disable', { code });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth', 'mfa'] }),
  });
}
