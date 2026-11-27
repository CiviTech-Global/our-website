import { z } from 'zod';

/**
 * The social/shortcut rail on the public site.
 *
 * The icon is an enum rather than a free string because the web bundle maps
 * each value to a bundled icon component — an unknown value would render a
 * gap, and a URL would be a request to somewhere we did not choose.
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

export const socialLinkSchema = z.object({
  /** Client-generated, stable across edits so React keys do not churn. */
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1, 'عنوان پیوند الزامی است').max(40, 'عنوان پیوند بیش از حد طولانی است'),
  // https? for profiles, mailto:/tel: for the contact shortcuts. Anything
  // else — javascript:, data:, a bare domain — is refused here rather than
  // trusted to the renderer.
  url: z
    .string()
    .trim()
    .max(500, 'نشانی پیوند بیش از حد طولانی است')
    .regex(/^(https?:\/\/\S+|mailto:\S+@\S+|tel:[+\d][\d\s-]*)$/, 'نشانی معتبر نیست'),
  icon: z.enum(SOCIAL_RAIL_ICONS),
});

export const socialRailSchema = z.object({
  enabled: z.boolean(),
  links: z.array(socialLinkSchema).max(8, 'حداکثر ۸ پیوند مجاز است'),
});

export type SocialLink = z.infer<typeof socialLinkSchema>;
export type SocialRailSettings = z.infer<typeof socialRailSchema>;
