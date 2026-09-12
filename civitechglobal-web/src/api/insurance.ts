import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/config/api';
import type {
  Answers,
  CategoryWithProducts,
  OtpSendResult,
  OtpVerifyResult,
  ProductDetail,
  ProductSummary,
  SubmitResult,
} from '@/types/insurance';

/** The catalog changes a few times a year; there is no reason to refetch it. */
const CATALOG_STALE_TIME = 30 * 60 * 1000;

export function useInsuranceCatalog() {
  return useQuery({
    queryKey: ['insurance', 'catalog'],
    queryFn: async () => {
      const res = await api.get<CategoryWithProducts[]>('/insurance/catalog');
      return res.data;
    },
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useInsuranceProducts() {
  return useQuery({
    queryKey: ['insurance', 'products'],
    queryFn: async () => {
      const res = await api.get<ProductSummary[]>('/insurance/products');
      return res.data;
    },
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useInsuranceProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ['insurance', 'product', slug],
    queryFn: async () => {
      const res = await api.get<ProductDetail>(`/insurance/products/${slug}`);
      return res.data;
    },
    enabled: Boolean(slug),
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useSendOtp() {
  return useMutation({
    mutationFn: async (phone: string) => {
      const res = await api.post<OtpSendResult>('/insurance/otp/send', { phone });
      return res.data;
    },
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async (input: { phone: string; code: string }) => {
      const res = await api.post<OtpVerifyResult>('/insurance/otp/verify', input);
      return res.data;
    },
  });
}

export interface SubmitRequestInput {
  productSlug: string;
  phoneToken: string;
  answers: Answers;
  email?: string | null;
}

export function useSubmitInsuranceRequest() {
  return useMutation({
    mutationFn: async (input: SubmitRequestInput) => {
      const res = await api.post<SubmitResult>('/insurance/requests', input);
      return res.data;
    },
  });
}

