import { useEffect, useState, type ComponentType } from 'react';
import { ChevronRight, Link2, Mail, MessageCircle, Phone, Send, Share2 } from 'lucide-react';
import { useSocialRail, type SocialRailIcon } from '@/api/site';
import { Github, Instagram, Linkedin, XLogo, Youtube } from '@/components/ui/BrandIcons';
import { useLocale } from '@/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

const RAIL_STORAGE_KEY = 'rtjg-rail';

/** The saved collapsed preference; safe under prerender and private mode. */
function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(RAIL_STORAGE_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

/**
 * The icon each link kind draws. The server's enum is the contract; the
 * brand marks lucide no longer ships live in ui/BrandIcons.
 */
const ICONS: Record<SocialRailIcon, ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  telegram: Send,
  whatsapp: MessageCircle,
  linkedin: Linkedin,
  github: Github,
  youtube: Youtube,
  x: XLogo,
  phone: Phone,
  email: Mail,
  link: Link2,
};

/** mailto: and tel: open the visitor's own apps; only web links leave in a new tab. */
const isExternal = (url: string) => /^https?:\/\//.test(url);

/**
 * The slim social/shortcut rail on the public pages.
 *
 * Decorative by contract: it renders NOTHING when the setting is off, empty,
 * still loading or failed to load — the page never waits on it and never
 * breaks because of it. The collapsed choice is the visitor's, kept in
 * localStorage like the footer's motion toggle.
 */
export function SocialRail() {
  const { t } = useLocale();
  const { data } = useSocialRail();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      window.localStorage.setItem(RAIL_STORAGE_KEY, collapsed ? 'collapsed' : 'open');
    } catch {
      // Private mode: the toggle still works for this visit.
    }
  }, [collapsed]);

  if (!data?.enabled || data.links.length === 0) return null;

  // Vertically centred on the inline-end edge; on small screens it drops to
  // just above the footer area instead, where it collides with nothing.
  const placement =
    'fixed end-3 top-1/2 z-40 -translate-y-1/2 max-sm:top-auto max-sm:bottom-24 max-sm:translate-y-0';

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label={t.socialRail.expand}
        title={t.socialRail.expand}
        className={cn(
          placement,
          'flex size-10 items-center justify-center rounded-full border border-border-default bg-surface-50 text-text-secondary shadow-soft transition-colors hover:text-brand-green-600'
        )}
      >
        <Share2 className="size-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <nav aria-label={t.socialRail.railLabel} className={placement}>
      <div className="flex flex-col items-center gap-1 rounded-full border border-border-default bg-surface-50 p-1.5 shadow-soft">
        {data.links.map((link) => {
          const Icon = ICONS[link.icon] ?? Link2;
          return (
            <a
              key={link.id}
              href={link.url}
              aria-label={link.label}
              title={link.label}
              {...(isExternal(link.url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="flex size-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-100 hover:text-brand-green-600"
            >
              <Icon className="size-4" aria-hidden="true" />
            </a>
          );
        })}
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label={t.socialRail.collapse}
          title={t.socialRail.collapse}
          className="flex size-10 items-center justify-center rounded-full text-text-muted transition-colors hover:text-brand-green-600"
        >
          {/* Toward the edge the rail is tucked against, whichever side RTL puts it on. */}
          <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
