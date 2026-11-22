import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';
import type { Paged } from '@/types/api';

/**
 * Staff-issued payment requests and the gateway configuration, for the admin
 * payments page. The payer-side hooks (status / pay / confirm) live below the
 * public /pay page; these are the staff side.
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

/**
 * How this deployment takes money. Metadata only: the merchant id is a
 * credential and never leaves the server — the page shows whether it is set.
 */
export interface PaymentConfig {
  driver: string;
  merchantConfigured: boolean;
  /** True while the public Zibal test merchant is in use. */
  testMerchant: boolean;
  commissionPercent: number;
  callbackUrl: string;
}

export function usePaymentConfig() {
  return useQuery({
    queryKey: ['payment-config'],
    queryFn: async () => (await api.get<PaymentConfig>('/payments/config')).data,
    retry: false,
  });
}

export interface PaymentRequestListItem {
  id: string;
  code: string;
  title: string;
  amount: string;
  currency: string;
  beneficiaryName: string | null;
  /** Masked by the server to the last four digits. */
  beneficiaryIban: string | null;
  paidAt: string | null;
  createdAt: string;
  payerName: string | null;
}

export function usePaymentRequestList(page: number) {
  return useQuery({
    queryKey: ['payment-requests', page],
    queryFn: async () =>
      (await api.get<Paged<PaymentRequestListItem>>(`/payments/requests?page=${page}&pageSize=20`)).data,
  });
}

/** One row of the transactions ledger: a payment attempt, whatever it paid for. */
export interface TransactionItem {
  id: string;
  purpose: 'ORDER' | 'SUBSCRIPTION' | 'PAYMENT_REQUEST';
  status: 'CREATED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  amount: string;
  currency: string;
  reference: string | null;
  driver: string;
  failureReason: string | null;
  settledAt: string | null;
  createdAt: string;
  orderCode: string | null;
  subscriptionCode: string | null;
  requestCode: string | null;
  requestTitle: string | null;
}

export function useTransactions(page: number, status: string | undefined, search: string) {
  const params = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (status) params.set('status', status);
  if (search.trim()) params.set('search', search.trim());
  return useQuery({
    queryKey: ['payment-transactions', page, status, search],
    queryFn: async () =>
      (await api.get<Paged<TransactionItem>>(`/payments/transactions?${params.toString()}`)).data,
  });
}

export interface CreatePaymentRequestInput {
  title: string;
  /** Whole Toman, digits only. */
  amount: string;
  description?: string;
  beneficiaryIban?: string;
  beneficiaryName?: string;
}

export function useCreatePaymentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePaymentRequestInput) =>
      (await api.post<{ id: string; code: string; payUrl: string }>('/payments/requests', input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-requests'] }),
  });
}
