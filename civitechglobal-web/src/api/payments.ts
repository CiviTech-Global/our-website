import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';

/**
 * Staff-issued payment requests: a bill for arranged work (a consultation, a
 * freelance contract) that the payer settles through the gateway. The code is
 * the credential — the payer may not have an account at all, so every
 * endpoint here is code-gated rather than session-gated.
 */

export interface PaymentRequestStatus {
  code: string;
  title: string;
  description: string | null;
  /** BigInt-safe digit string, in Tomans. */
  amount: string;
  currency: string;
  paid: boolean;
  paidAt: string | null;
}

export function usePaymentRequestStatus(code: string | undefined) {
  return useQuery({
    queryKey: ['payment-request', code],
    queryFn: async () =>
      (await api.get<PaymentRequestStatus>(`/payments/requests/${encodeURIComponent(code!)}`)).data,
    enabled: Boolean(code),
    retry: false,
  });
}

export function usePayPaymentRequest() {
  return useMutation({
    mutationFn: async (code: string) =>
      (
        await api.post<{ redirectUrl: string | null; reference: string }>(
          `/payments/requests/${encodeURIComponent(code)}/pay`,
        )
      ).data,
  });
}

export function useConfirmPaymentRequest(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string) =>
      (await api.post<{ status: string; code: string }>('/payments/requests/confirm', { reference })).data,
    // The confirm is idempotent server-side; refreshing the status shows the
    // settled result however the callback and this call raced.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-request', code] }),
  });
}
