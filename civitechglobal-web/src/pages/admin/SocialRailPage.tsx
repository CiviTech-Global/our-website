import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  SOCIAL_RAIL_ICONS,
  useAdminSocialRail,
  useSaveSocialRail,
  type SocialLink,
  type SocialRailIcon,
} from '@/api/site';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';

const MAX_LINKS = 8;

/** Client-side row identity, stable across edits so inputs keep focus. */
let nextId = 0;
function newLink(): SocialLink {
  nextId += 1;
  return { id: `l${Date.now().toString(36)}-${nextId}`, label: '', url: '', icon: 'link' };
}

/**
 * The social/shortcut rail on the public pages: on or off, and which links.
 *
 * One settings document, saved whole — the list is short enough that a
 * per-row save would be ceremony, and a half-saved rail is not a state
 * anybody wants on the public site.
 */
export default function SocialRailPage() {
  const { t } = useLocale();
  useDocumentTitle(t.socialRail.adminTitle);
  const { showToast } = useToast();

  const { data, isLoading } = useAdminSocialRail();
  const save = useSaveSocialRail();

  const [enabled, setEnabled] = useState(false);
  const [links, setLinks] = useState<SocialLink[]>([]);

  // Seed the form once the stored settings arrive; edits after that are the
  // reader's and must not be overwritten by a background refetch.
  useEffect(() => {
    if (data) {
      setEnabled(data.enabled);
      setLinks(data.links);
    }
  }, [data]);

  const setLink = (id: string, patch: Partial<SocialLink>) =>
    setLinks((current) => current.map((link) => (link.id === id ? { ...link, ...patch } : link)));

  const removeLink = (id: string) => setLinks((current) => current.filter((link) => link.id !== id));

  async function submit() {
    try {
      await save.mutateAsync({ enabled, links });
      showToast(t.socialRail.saved, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t.socialRail.adminTitle} description={t.socialRail.adminIntro} className="mb-0" />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      ) : (
        <>
          <Card>
            <label className="flex items-center gap-2 text-body text-app-text">
              <input
                type="checkbox"
                className="size-4 rounded border-app-border"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              {t.socialRail.enabledLabel}
            </label>
            <p className="mt-1 text-caption text-app-text-3">{t.socialRail.enabledHint}</p>
          </Card>

          <section className="flex flex-col gap-3" aria-labelledby="social-rail-links">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="max-w-2xl">
                <h2 id="social-rail-links" className="text-title-sm font-semibold text-app-text">
                  {t.socialRail.linksTitle}
                </h2>
                <p className="mt-1 text-body text-app-text-3">{t.socialRail.linksHint}</p>
              </div>
              <Button
                variant="secondary"
                disabled={links.length >= MAX_LINKS}
                onClick={() => setLinks((current) => [...current, newLink()])}
              >
                <Plus className="size-4" aria-hidden="true" />
                {t.socialRail.addLink}
              </Button>
            </div>

            {links.length === 0 && <p className="text-body text-app-text-4">{t.socialRail.linksEmpty}</p>}

            <ul className="flex flex-col gap-2">
              {links.map((link) => (
                <li key={link.id}>
                  <Card className="py-3">
                    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_2fr_10rem_auto]">
                      <FormField label={t.socialRail.labelField} htmlFor={`rail-label-${link.id}`}>
                        <Input
                          id={`rail-label-${link.id}`}
                          value={link.label}
                          maxLength={40}
                          onChange={(e) => setLink(link.id, { label: e.target.value })}
                        />
                      </FormField>
                      <FormField label={t.socialRail.urlField} hint={t.socialRail.urlHint} htmlFor={`rail-url-${link.id}`}>
                        <Input
                          id={`rail-url-${link.id}`}
                          value={link.url}
                          dir="ltr"
                          placeholder="https://"
                          onChange={(e) => setLink(link.id, { url: e.target.value })}
                        />
                      </FormField>
                      <FormField label={t.socialRail.iconField} htmlFor={`rail-icon-${link.id}`}>
                        <Select
                          id={`rail-icon-${link.id}`}
                          value={link.icon}
                          onChange={(e) => setLink(link.id, { icon: e.target.value as SocialRailIcon })}
                        >
                          {SOCIAL_RAIL_ICONS.map((icon) => (
                            <option key={icon} value={icon}>
                              {t.socialRail.icons[icon]}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={t.socialRail.removeLink}
                        title={t.socialRail.removeLink}
                        onClick={() => removeLink(link.id)}
                      >
                        <Trash2 className="size-4 text-status-error" aria-hidden="true" />
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>

          <div>
            <Button onClick={() => void submit()} disabled={save.isPending}>
              {save.isPending ? t.common.loading : t.socialRail.save}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
