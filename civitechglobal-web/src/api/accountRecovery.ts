import { useMutation } from '@tanstack/react-query';
import { api } from '@/config/api';

/**
 * Password reset and email verification.
 *
 * Nothing here reads anything back: the server answers a reset request the same
 * way whether or not the address has an account, so there is no state for the
 * page to reflect beyond "we have sent it if there was anything to send".
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      await api.post('/auth/forgot-password', { email });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (input: { token: string; password: string }) => {
      await api.post('/auth/reset-password', input);
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (token: string) => {
      await api.post('/auth/verify-email', { token });
    },
  });
}

export function useSendVerificationEmail() {
  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/send-verification', {});
    },
  });
}
