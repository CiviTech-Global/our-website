import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { useLocale } from '@/i18n/LocaleProvider';
import { useTrackRequest } from '@/api/workspace';

/**
 * Beneath a freshly issued tracking code: for a signed-in member the code is
 * kept on their account and they are told so; for anybody else, an invitation
 * to sign in and keep it. Either way the code on screen is still the code —
 * this only saves writing it down.
 */
export function SavedToAccount({ code }: { code: string }) {
  const { t } = useLocale();
  const { user } = useAuth();
  const track = useTrackRequest();
  const [saved, setSaved] = useState(false);
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (!user || attempted.current === code) return;
    attempted.current = code;
    // Silent on failure: the code is on screen, and a toast about a
    // convenience that did not happen would read as the request failing.
    track.mutate({ code }, { onSuccess: () => setSaved(true) });
  }, [user, code, track]);

  if (user) {
    return saved ? (
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-brand-green-600">
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        <Link to="/dashboard/requests" className="hover:underline">
          {t.workspace.savedToAccount}
        </Link>
      </p>
    ) : null;
  }

  return (
    <p className="mt-3 text-xs text-text-muted">
      <Link to="/login" className="text-brand-green-600 hover:underline">
        {t.workspace.signInToKeep}
      </Link>
    </p>
  );
}
