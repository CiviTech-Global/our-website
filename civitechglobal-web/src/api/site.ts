import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';

/**
 * Runtime settings of the public site — the social/shortcut rail today.
 * Server: routes/site.routes.ts.
 */

export const SOCIAL_RAIL_ICONS = [
  'instagram',
  'telegram',
  'whatsapp',
  'linkedin',
  'github',
  'youtube',
  'x',
  'phone',
  'email',
  'link',
] as const;

export type SocialRailIcon = (typeof SOCIAL_RAIL_ICONS)[number];

export interface SocialLink {
  id: string;
  label: string;
  url: string;
  icon: SocialRailIcon;
}

export interface SocialRailSettings {
  enabled: boolean;
  links: SocialLink[];
}

const keys = {
  public: ['site', 'social-rail'] as const,
  admin: ['site', 'social-rail', 'admin'] as const,
};

/**
 * The rail's settings, for every public page.
 *
 * `retry: false` and a long staleTime on purpose: this decorates the page, it
 * is not the page. A slow or failing settings endpoint must never hold up or
 * repeat itself against the render — the component shows nothing instead.
 */
export function useSocialRail() {
  return useQuery({
    queryKey: keys.public,
    queryFn: async () => (await api.get<SocialRailSettings>('/site/social-rail')).data,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useAdminSocialRail() {
  return useQuery({
    queryKey: keys.admin,
    queryFn: async () => (await api.get<SocialRailSettings>('/site/admin/social-rail')).data,
  });
}

export function useSaveSocialRail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SocialRailSettings) =>
      (await api.put<SocialRailSettings>('/site/admin/social-rail', input)).data,
    // Both lists: the public rail reflects the save without a reload.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site'] }),
  });
}
