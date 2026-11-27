import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    siteSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(async () => ({})),
    },
  },
}));

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));

import { getSocialRail, saveSocialRail } from './site.service.js';
import { socialRailSchema } from '../validators/site.schema.js';

const link = { id: 'l1', label: 'Instagram', url: 'https://instagram.com/civitech', icon: 'instagram' as const };
const settings = { enabled: true, links: [link] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reading the social rail', () => {
  it('is off when nothing was ever saved', async () => {
    mocks.prisma.siteSetting.findUnique.mockResolvedValue(null);

    await expect(getSocialRail()).resolves.toEqual({ enabled: false, links: [] });
  });

  it('returns what was saved', async () => {
    mocks.prisma.siteSetting.findUnique.mockResolvedValue({ key: 'social_rail', value: settings });

    await expect(getSocialRail()).resolves.toEqual(settings);
  });

  it('degrades to off when the stored value is not a valid rail', async () => {
    // The column is JSON; a hand edit must not break every public page.
    mocks.prisma.siteSetting.findUnique.mockResolvedValue({
      key: 'social_rail',
      value: { enabled: true, links: [{ url: 'javascript:alert(1)' }] },
    });

    await expect(getSocialRail()).resolves.toEqual({ enabled: false, links: [] });
  });
});

describe('saving the social rail', () => {
  it('upserts the one row, recording who saved it', async () => {
    await saveSocialRail(settings, 'admin-1');

    const call = mocks.prisma.siteSetting.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ key: 'social_rail' });
    expect(call.create).toMatchObject({ key: 'social_rail', value: settings, updatedById: 'admin-1' });
    expect(call.update).toMatchObject({ value: settings, updatedById: 'admin-1' });
  });

  it('round-trips: what was saved is what is read back', async () => {
    let stored: unknown = null;
    mocks.prisma.siteSetting.upsert.mockImplementation(async (args: { create: { value: unknown } }) => {
      stored = args.create.value;
      return {};
    });
    mocks.prisma.siteSetting.findUnique.mockImplementation(async () => ({ key: 'social_rail', value: stored }));

    await saveSocialRail(settings, 'admin-1');

    await expect(getSocialRail()).resolves.toEqual(settings);
  });
});

describe('the settings schema', () => {
  it('accepts the allowed link kinds', () => {
    for (const url of ['https://t.me/civitech', 'http://example.com', 'mailto:hi@civitech.ir', 'tel:+989121234567']) {
      expect(socialRailSchema.safeParse({ enabled: true, links: [{ ...link, url }] }).success, url).toBe(true);
    }
  });

  it('rejects a url that is not http(s), mailto: or tel:', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x', 'civitech.ir', '//evil.example']) {
      expect(socialRailSchema.safeParse({ enabled: true, links: [{ ...link, url }] }).success, url).toBe(false);
    }
  });

  it('rejects an icon outside the enum', () => {
    const result = socialRailSchema.safeParse({ enabled: true, links: [{ ...link, icon: 'myspace' }] });
    expect(result.success).toBe(false);
  });

  it('rejects more than eight links', () => {
    const links = Array.from({ length: 9 }, (_, i) => ({ ...link, id: `l${i}` }));
    expect(socialRailSchema.safeParse({ enabled: true, links }).success).toBe(false);
  });

  it('rejects an empty label', () => {
    expect(socialRailSchema.safeParse({ enabled: true, links: [{ ...link, label: ' ' }] }).success).toBe(false);
  });
});
