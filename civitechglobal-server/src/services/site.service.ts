import { prisma } from '../config/database.js';
import { socialRailSchema, type SocialRailSettings } from '../validators/site.schema.js';

/**
 * Runtime settings for the public site, stored in `site_settings`.
 *
 * The first (and so far only) one is the social/shortcut rail: a slim column
 * of icon links the super admin can switch on and edit from the panel, with
 * no deploy and no environment change. Off is the default — a deployment
 * that has never saved the setting shows nothing.
 */

const SOCIAL_RAIL_KEY = 'social_rail';

/** What a deployment that never saved the setting serves. */
const SOCIAL_RAIL_DEFAULT: SocialRailSettings = { enabled: false, links: [] };

export async function getSocialRail(): Promise<SocialRailSettings> {
  const row = await prisma.siteSetting.findUnique({ where: { key: SOCIAL_RAIL_KEY } });
  if (!row) return SOCIAL_RAIL_DEFAULT;

  // Re-validated on the way out, not just on the way in: the row is JSON, and
  // a hand edit or an older shape must degrade to "off" rather than break
  // every public page that renders the rail.
  const parsed = socialRailSchema.safeParse(row.value);
  return parsed.success ? parsed.data : SOCIAL_RAIL_DEFAULT;
}

export async function saveSocialRail(
  input: SocialRailSettings,
  updatedById: string,
): Promise<SocialRailSettings> {
  await prisma.siteSetting.upsert({
    where: { key: SOCIAL_RAIL_KEY },
    create: { key: SOCIAL_RAIL_KEY, value: input, updatedById },
    update: { value: input, updatedById },
  });
  return input;
}
