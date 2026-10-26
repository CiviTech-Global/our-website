import { Download, Smartphone, Store } from 'lucide-react';
import { useAppDownloads } from '@/api/capabilities';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';

/**
 * Where the Android app can be had: the stores, and the signed APKs on this
 * site for anybody who does not use one.
 *
 * The links come from the server (capabilities → mobile.downloads), set in
 * its environment at release time, so a release puts its files and store
 * pages live without rebuilding the site. Until one is set the page says the
 * app is coming rather than offering a dead link. The app's update screen
 * sends people here when no store answers.
 */
export default function AppDownloadPage() {
  const { t } = useLocale();
  const d = t.appDownload;
  useDocumentTitle(d.title, { description: d.subtitle });
  const links = useAppDownloads();

  const stores = links
    ? (
        [
          [links.bazaar, d.bazaar],
          [links.myket, d.myket],
        ] as const
      ).filter(([href]) => href)
    : [];
  const apks = links
    ? (
        [
          [links.apkArm64, d.apkArm64, d.apkArm64Hint],
          [links.apkArmV7, d.apkArmV7, d.apkArmV7Hint],
        ] as const
      ).filter(([href]) => href)
    : [];

  const button =
    'inline-flex items-center gap-2 rounded-lg bg-surface-inverse px-5 py-3 font-medium text-text-inverse transition hover:opacity-90';

  return (
    <div className="page-frame page-frame-reading">
      <header className="mb-8">
        <div
          className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-surface-muted text-text-primary"
          aria-hidden="true"
        >
          <Smartphone className="size-7" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary">{d.title}</h1>
        <p className="mt-3 text-lg text-text-secondary">{d.subtitle}</p>
        <p className="mt-2 text-sm text-text-tertiary">{d.androidOnly}</p>
      </header>

      {!links && (
        <div className="flex justify-center py-12">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {links && stores.length === 0 && apks.length === 0 && (
        <Card>
          <p className="text-text-secondary" role="status">
            {d.comingSoon}
          </p>
        </Card>
      )}

      {stores.length > 0 && (
        <section className="mb-8" aria-labelledby="app-stores">
          <h2
            id="app-stores"
            className="mb-3 text-xl font-semibold text-text-primary"
          >
            {d.storesTitle}
          </h2>
          <div className="flex flex-wrap gap-3">
            {stores.map(([href, label]) => (
              <a
                key={label}
                href={href!}
                target="_blank"
                rel="noopener noreferrer"
                className={button}
              >
                <Store className="size-4" aria-hidden="true" />
                {label}
              </a>
            ))}
          </div>
        </section>
      )}

      {apks.length > 0 && (
        <section className="mb-8" aria-labelledby="app-apk">
          <h2
            id="app-apk"
            className="mb-1 text-xl font-semibold text-text-primary"
          >
            {d.apkTitle}
          </h2>
          <p className="mb-4 text-text-secondary">{d.apkIntro}</p>
          <ul className="flex flex-col gap-3">
            {apks.map(([href, label, hint]) => (
              <li key={label}>
                <a href={href!} download className={button}>
                  <Download className="size-4" aria-hidden="true" />
                  {label}
                </a>
                <p className="mt-1 text-sm text-text-tertiary">{hint}</p>
              </li>
            ))}
          </ul>

          <h3 className="mb-2 mt-6 font-semibold text-text-primary">
            {d.installTitle}
          </h3>
          <ol className="list-decimal space-y-1 ps-6 text-text-secondary">
            <li>{d.install1}</li>
            <li>{d.install2}</li>
            <li>{d.install3}</li>
          </ol>
        </section>
      )}
    </div>
  );
}
