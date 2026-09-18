import { useQuery } from '@tanstack/react-query';
import { api } from '@/config/api';

export interface Capabilities {
  /** Whether the server can actually deliver an email. */
  email: boolean;
  /** Whether it can deliver a text message to a real phone. */
  sms: boolean;
}

/**
 * What this deployment can do, asked once and cached.
 *
 * There is no mail or SMS service here: recovery, address verification and
 * phone OTP all end in a 501 that explains itself. That is the right answer,
 * but it arrives after somebody has already filled in a form. Pages ask this
 * first and simply do not draw the step.
 *
 * Defaults to "can" while loading, so a slow answer never hides a control that
 * does work — the failure the page is avoiding is offering something dead, and
 * briefly offering something live costs nothing.
 */
export function useCapabilities() {
  const query = useQuery({
    queryKey: ['capabilities'],
    queryFn: async () => {
      const res = await api.get<Capabilities>('/capabilities');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return query.data ?? { email: true, sms: true };
}
