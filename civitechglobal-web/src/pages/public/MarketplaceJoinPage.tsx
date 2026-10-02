import { Link } from 'react-router';
import { BadgeCheck, ClipboardCheck, PackagePlus, Store, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { useOwnVerification } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { Spinner } from '@/components/ui/Spinner';
import { MarketplaceNav } from '@/components/trademaster/MarketplaceUi';

/**
 * How a shop gets into the catalogue — and the button that takes the next step.
 *
 * Asking to be listed IS opening a shop: the shop is created as a draft and
 * goes to the same review desk as every other listing on the site. A separate
 * "request" form would be a second intake that staff then re-type into the
 * first, with a gap in between where requests get lost. So this page explains
 * the four steps and the button always points at whichever one the reader is
 * on: sign in, verify, or open the shop form.
 *
 * Verification is asked of everybody, staff included: a shop is a trading
 * identity, and a buyer is entitled to know somebody stood behind it.
 */
export default function MarketplaceJoinPage() {
  const { t } = useLocale();
  const hub = t.trademaster.hub;
  useDocumentTitle(hub.joinTitle, { description: hub.joinSubtitle });

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: verification, isLoading: verificationLoading } = useOwnVerification(isAuthenticated);

  const steps = [
    { icon: UserPlus, title: hub.step1Title, body: hub.step1Body },
    { icon: BadgeCheck, title: hub.step2Title, body: hub.step2Body },
    { icon: Store, title: hub.step3Title, body: hub.step3Body },
    { icon: PackagePlus, title: hub.step4Title, body: hub.step4Body },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <MarketplaceNav className="mb-8" />

      <header className="mb-10 max-w-3xl">
        <h1 className="text-3xl font-bold text-text-primary">{hub.joinTitle}</h1>
        <p className="mt-3 text-lg text-text-secondary">{hub.joinSubtitle}</p>
      </header>

      <ol className="mb-10 grid gap-4 sm:grid-cols-2">
        {steps.map(({ icon: Icon, title, body }, index) => (
          <li key={title} className="flex gap-4 rounded-xl border border-border-default bg-surface-default p-5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-primary"
              aria-hidden="true"
            >
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-text-primary">
                <span className="sr-only">{`${index + 1}. `}</span>
                {title}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">{body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="mb-10 rounded-xl border border-border-default bg-surface-muted p-5">
        <h2 className="mb-2 flex items-center gap-2 font-semibold text-text-primary">
          <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
          {hub.needTitle}
        </h2>
        <ul className="list-disc space-y-1 ps-6 text-sm text-text-secondary">
          <li>{hub.need1}</li>
          <li>{hub.need2}</li>
          <li>{hub.need3}</li>
          <li>{hub.need4}</li>
        </ul>
      </section>

      <NextStep
        loading={authLoading || (isAuthenticated && verificationLoading)}
        signedIn={isAuthenticated}
        verification={verification?.status}
      />
    </div>
  );
}

/** The one button that matters, pointed at the reader's actual next step. */
function NextStep({
  loading,
  signedIn,
  verification,
}: {
  loading: boolean;
  signedIn: boolean;
  verification: string | undefined;
}) {
  const { t } = useLocale();
  const hub = t.trademaster.hub;
  const primary =
    'inline-flex items-center gap-2 rounded-lg bg-surface-inverse px-5 py-3 font-medium text-text-inverse transition hover:opacity-90';
  const secondary =
    'inline-flex items-center gap-2 rounded-lg border border-border-default px-5 py-3 font-medium text-text-primary transition hover:border-border-strong';

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (!signedIn) {
    // Back here after signing in, so the page can offer the next step.
    const returnHere = { from: { pathname: '/marketplace/join', search: '' } };
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/register" state={returnHere} className={primary}>
          {hub.ctaRegister}
        </Link>
        <Link to="/login" state={returnHere} className={secondary}>
          {hub.ctaLogin}
        </Link>
      </div>
    );
  }

  if (verification === 'APPROVED') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/dashboard/shops?new=1" className={primary}>
          <Store className="h-4 w-4" aria-hidden="true" />
          {hub.ctaCreateShop}
        </Link>
        <Link to="/dashboard/shops" className={secondary}>
          {hub.ctaMyShops}
        </Link>
      </div>
    );
  }

  if (verification === 'PENDING') {
    return (
      <p className="rounded-xl border border-border-default p-4 text-text-secondary" role="status">
        {hub.verificationPending}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {verification === 'REJECTED' && (
        <p className="text-sm text-text-secondary" role="status">
          {hub.verificationRejected}
        </p>
      )}
      <Link to="/dashboard/verification" className={primary}>
        <BadgeCheck className="h-4 w-4" aria-hidden="true" />
        {hub.ctaVerify}
      </Link>
    </div>
  );
}
