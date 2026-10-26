import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { privacyPolicies } from '@/content/legal/privacy';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';

/**
 * The privacy policy, for the website and the Android app alike. The stores
 * (Cafe Bazaar, Myket) link here from the app's listing, so the address must
 * stay /privacy. The text lives in content/legal/privacy.ts.
 */
export default function PrivacyPage() {
  const { locale, t } = useLocale();
  const policy = privacyPolicies[locale];
  useDocumentTitle(policy.title, { description: policy.intro });

  return (
    <div className="page-frame page-frame-reading">
      <header className="mb-8">
        <div
          className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-surface-muted text-text-primary"
          aria-hidden="true"
        >
          <ShieldCheck className="size-7" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary">{policy.title}</h1>
        <p className="mt-2 text-sm text-text-tertiary">{policy.updated}</p>
        <p className="mt-4 text-lg leading-relaxed text-text-secondary">{policy.intro}</p>
      </header>

      {policy.sections.map((section, i) => (
        <section key={section.heading} className="mb-8" aria-labelledby={`privacy-${i}`}>
          <h2 id={`privacy-${i}`} className="mb-3 text-xl font-semibold text-text-primary">
            {section.heading}
          </h2>
          {section.body.map((block, j) =>
            Array.isArray(block) ? (
              <ul key={j} className="mb-3 list-disc space-y-2 ps-6 leading-relaxed text-text-secondary">
                {block.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={j} className="mb-3 leading-relaxed text-text-secondary">
                {block}
              </p>
            ),
          )}
        </section>
      ))}

      <p>
        <Link to="/contact" className="font-medium text-brand-green-500 hover:underline">
          {t.nav.contact}
        </Link>
      </p>
    </div>
  );
}
