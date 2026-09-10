import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle2, XCircle } from 'lucide-react';
import { apiMessage } from '@/lib/apiMessage';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useAuth } from '@/contexts/AuthProvider';
import { useVerifyEmail } from '@/api/accountRecovery';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { AuthCard } from './AuthCard';

/**
 * Landing page for the link in a verification email.
 *
 * It redeems on arrival rather than asking for a click: whoever opened the link
 * has already expressed the intent, and a second button here is a step that
 * only loses people.
 */
export default function VerifyEmailPage() {
  const { t } = useLocale();
  useDocumentTitle(t.auth.verifyTitle);
  const [params] = useSearchParams();
  const token = params.get('token');
  const verify = useVerifyEmail();
  const { isAuthenticated, refreshUser } = useAuth();

  const [state, setState] = useState<'pending' | 'ok' | 'failed'>(token ? 'pending' : 'failed');
  const [message, setMessage] = useState<string | null>(null);

  // React 18+ mounts effects twice in development. Without this the second run
  // redeems an already-spent token and reports failure on a success.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    verify
      .mutateAsync(token)
      .then(async () => {
        setState('ok');
        // Someone verifying while signed in should see the banner go, not have
        // to reload to find out it worked.
        if (isAuthenticated) await refreshUser().catch(() => {});
      })
      .catch((error: unknown) => {
        setMessage(apiMessage(error, t.auth.resetLinkBroken));
        setState('failed');
      });
  }, [token, verify, isAuthenticated, refreshUser, t.auth.resetLinkBroken]);

  if (state === 'pending') {
    return (
      <AuthCard title={t.auth.verifyTitle} subtitle={t.auth.verifyChecking}>
        <div className="flex justify-center py-6">
          <Spinner label={t.common.loading} />
        </div>
      </AuthCard>
    );
  }

  if (state === 'ok') {
    return (
      <AuthCard title={t.auth.verifyDoneTitle} subtitle={t.auth.verifyDoneBody}>
        <CheckCircle2 className="mx-auto size-12 text-brand-green-500" aria-hidden="true" />
        <Link to={isAuthenticated ? '/dashboard' : '/login'} className="mt-6 block">
          <Button className="w-full">
            {isAuthenticated ? t.nav.dashboard : t.auth.backToLogin}
          </Button>
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t.auth.verifyFailedTitle} subtitle={message ?? t.auth.resetLinkBroken}>
      <XCircle className="mx-auto size-12 text-brand-red-500" aria-hidden="true" />
      <p className="mt-6 text-center text-sm text-text-secondary">{t.auth.verifyFailedHint}</p>
      <Link to={isAuthenticated ? '/dashboard' : '/login'} className="mt-6 block">
        <Button variant="secondary" className="w-full">
          {isAuthenticated ? t.nav.dashboard : t.auth.backToLogin}
        </Button>
      </Link>
    </AuthCard>
  );
}
