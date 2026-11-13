import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';

/**
 * Plans: the public price list, a member's own plans and usage, checkout, and
 * the staff side (prices, grants, accounts opened for somebody).
 *
 * Money arrives as strings: the server's amounts are BigInt Toman, which JSON
 * cannot carry as numbers without rounding. Format them with formatToman.
 */

export type PlanSubject = 'USER' | 'BUSINESS' | 'COMPANY';
export type PlanTier = 'FREE' | 'PRO' | 'PREMIUM' | 'VIP';
export type PaidTier = Exclude<PlanTier, 'FREE'>;
export type PlanLimitKind = 'STOCK' | 'MONTHLY' | 'LIFETIME';
export type SubscriptionStatus = 'PENDING_PAYMENT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export const PLAN_SUBJECTS: PlanSubject[] = ['USER', 'BUSINESS', 'COMPANY'];
export const PLAN_TIERS: PlanTier[] = ['FREE', 'PRO', 'PREMIUM', 'VIP'];
export const PAID_TIERS: PaidTier[] = ['PRO', 'PREMIUM', 'VIP'];

export interface CatalogLevel {
  tier: PlanTier;
  kind: PlanLimitKind;
  limit: number | null;
  liveDays: number | null;
  priceIrt: string | null;
  priceUsdt: string | null;
}

export interface CatalogFeature {
  key: string;
  subject: PlanSubject;
  name: string;
  nameEn: string | null;
  levels: CatalogLevel[];
}

export interface PlanCatalog {
  features: CatalogFeature[];
  tiers: Partial<Record<PlanSubject, Array<{ tier: PlanTier; monthlyIrt: string | null; monthlyUsdt: string | null }>>>;
  periods: Array<{ months: number; discountPercent: number }>;
}

export interface PlanSelection {
  subject: PlanSubject;
  months: number;
  tier?: PaidTier;
  items?: Array<{ featureKey: string; tier: PlanTier }>;
}

export interface Quote {
  subject: PlanSubject;
  tier: PlanTier | null;
  months: number;
  discountPercent: number;
  monthlyTotal: string;
  total: string;
  items: Array<{ featureKey: string; tier: PlanTier; limit: number | null; monthlyPrice: string }>;
}

export interface SubscriptionItem {
  featureKey: string;
  tier: PlanTier;
  kind: PlanLimitKind;
  limit: number | null;
  liveDays: number | null;
  monthlyPrice: string;
}

export interface Subscription {
  id: string;
  code: string;
  subject: PlanSubject;
  status: SubscriptionStatus;
  source: 'PURCHASE' | 'STAFF_GRANT';
  tier: PlanTier | null;
  months: number;
  startsAt: string | null;
  endsAt: string | null;
  total: string;
  currency: string;
  createdAt: string;
  items: SubscriptionItem[];
}

export interface FeatureUsage {
  featureKey: string;
  name: string;
  nameEn: string | null;
  tier: PlanTier;
  kind: PlanLimitKind;
  limit: number | null;
  liveDays: number | null;
  used: number;
}

export interface OwnBilling {
  enforced: boolean;
  company: { id: string; name: string } | null;
  plans: Array<{ subject: PlanSubject; usage: FeatureUsage[]; active: Subscription[] }>;
  history: Subscription[];
}

export interface CheckoutResult {
  subscriptionId: string;
  code: string;
  total: string;
  redirectUrl: string | null;
  reference: string;
}

export interface ConfirmResult {
  status: 'CREATED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  subscriptionId: string;
  code: string;
}

/** What a 402 QUOTA_EXCEEDED carries in `data`. */
export interface QuotaExceeded {
  feature: string;
  subject: PlanSubject;
  limit: number;
  used: number;
  kind: PlanLimitKind;
  resetsAt: string | null;
}

/** Dictionary key for a feature: dots are not friendly to object keys. */
export const featureLabelKey = (featureKey: string) => featureKey.replace('.', '_');

const keys = {
  catalog: (subject?: PlanSubject) => ['billing', 'plans', subject ?? 'all'] as const,
  own: ['billing', 'me'] as const,
  adminSubscriptions: ['billing', 'admin', 'subscriptions'] as const,
  adminAccounts: ['billing', 'admin', 'accounts'] as const,
};

export function usePlanCatalog(subject?: PlanSubject) {
  return useQuery({
    queryKey: keys.catalog(subject),
    queryFn: async () => (await api.get<PlanCatalog>('/billing/plans', { params: { subject } })).data,
  });
}

export function useQuote(selection: PlanSelection | null) {
  return useQuery({
    queryKey: ['billing', 'quote', selection],
    queryFn: async () => (await api.post<Quote>('/billing/quote', selection)).data,
    enabled: Boolean(selection),
    retry: false,
  });
}

export function useOwnBilling(enabled = true) {
  return useQuery({
    queryKey: keys.own,
    queryFn: async () => (await api.get<OwnBilling>('/billing/me')).data,
    enabled,
  });
}

export function useCheckout() {
  return useMutation({
    // The locale picks which language the gateway sends the buyer back to.
    mutationFn: async (input: PlanSelection & { locale?: string }) =>
      (await api.post<CheckoutResult>('/billing/checkout', input)).data,
  });
}

export function useConfirmPlanPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string) => (await api.post<ConfirmResult>('/billing/confirm', { reference })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.own }),
  });
}

// --- Staff --------------------------------------------------------------------

export interface PriceUpdate {
  featureKey: string;
  tier: PlanTier;
  priceIrt?: string | null;
  priceUsdt?: string | null;
}

export function useSetPlanPrices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: PriceUpdate[]) => (await api.put('/billing/admin/prices', { updates })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing', 'plans'] }),
  });
}

export interface AdminSubscription extends Subscription {
  note: string | null;
  user: { id: string; email: string; firstName: string; lastName: string } | null;
  company: { id: string; name: string } | null;
}

export interface PageOf<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function useAdminSubscriptions(query: { page: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: [...keys.adminSubscriptions, query],
    queryFn: async () =>
      (await api.get<PageOf<AdminSubscription>>('/billing/admin/subscriptions', { params: { ...query, pageSize: 20 } }))
        .data,
  });
}

/** A member or company a grant can go to, with what it holds now. */
export interface PlanHolder {
  id: string;
  label: string;
  detail: string;
  currentTier: PlanTier | 'CUSTOM';
  activeUntil: string | null;
  subscriptions: Array<{ code: string; tier: PlanTier | 'CUSTOM'; startsAt: string | null; endsAt: string | null }>;
}

export function usePlanHolderSearch(subject: PlanSubject, search: string) {
  const term = search.trim();
  return useQuery({
    queryKey: ['billing', 'admin', 'holders', subject, term],
    queryFn: async () =>
      (await api.get<PlanHolder[]>('/billing/admin/holders', { params: { subject, search: term } })).data,
    enabled: term.length >= 2,
    staleTime: 10_000,
  });
}

/** A member or company a grant can go to, with what it holds now. */
export interface PlanHolder {
  id: string;
  label: string;
  detail: string;
  currentTier: PlanTier | 'CUSTOM';
  activeUntil: string | null;
  subscriptions: Array<{ code: string; tier: PlanTier | 'CUSTOM'; startsAt: string | null; endsAt: string | null }>;
}

export function usePlanHolderSearch(subject: PlanSubject, search: string) {
  const term = search.trim();
  return useQuery({
    queryKey: ['billing', 'admin', 'holders', subject, term],
    queryFn: async () =>
      (await api.get<PlanHolder[]>('/billing/admin/holders', { params: { subject, search: term } })).data,
    enabled: term.length >= 2,
    staleTime: 10_000,
  });
}

export function useGrantPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlanSelection & { userId?: string; companyId?: string; note?: string }) =>
      (await api.post('/billing/admin/grants', input)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.adminSubscriptions });
      void qc.invalidateQueries({ queryKey: ['billing', 'admin', 'holders'] });
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/billing/admin/subscriptions/${id}/cancel`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.adminSubscriptions }),
  });
}

export interface MemberAccountInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  phone?: string;
}

export interface VouchedAccount {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  accountKind: 'INDIVIDUAL' | 'COMPANY';
  staffVouchedAt: string;
  company: { id: string; name: string; slug: string } | null;
  expertProfile: { id: string; slug: string; fullName: string } | null;
}

export function useVouchedAccounts(page: number) {
  return useQuery({
    queryKey: [...keys.adminAccounts, page],
    queryFn: async () =>
      (await api.get<PageOf<VouchedAccount>>('/billing/admin/accounts', { params: { page, pageSize: 20 } })).data,
  });
}

export function useCreateCompanyAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { account: MemberAccountInput; companyName: string; nationalId: string }) =>
      (await api.post('/billing/admin/accounts/company', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.adminAccounts }),
  });
}
