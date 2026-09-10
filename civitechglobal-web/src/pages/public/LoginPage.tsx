import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router';
import { isApiError } from '@/config/api';
import { apiMessage } from '@/lib/apiMessage';
import { isMfaChallenge } from '@/types/auth';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { resolveI18nKey } from '@/i18n/utils';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { loginSchema, type LoginFormValues } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { AuthCard } from './AuthCard';

/**
 * Second step of sign-in, shown only when the account has MFA on.
 *
 * The password is already accepted at this point and no session exists yet, so
 * a wrong code costs an attempt rather than the whole sign-in — the server
 * keeps the challenge alive for five tries.
 */
function MfaStep({ challengeToken, onDone }: { challengeToken: string; onDone: () => void }) {
  const { t } = useLocale();
  const { verifyMfa } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // The whole view has just been replaced, so focus was left on a button that
  // no longer exists and has fallen back to <body>. Moving it to the one field
  // here is what a view change is supposed to do — the autoFocus attribute
  // would look the same and is the thing jsx-a11y warns about, because it also
  // fires on first page load where nothing has changed.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await verifyMfa(challengeToken, code);
      onDone();
    } catch (err) {
      setError(apiMessage(err, t.auth.mfaCodeWrong));
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title={t.auth.mfaTitle} subtitle={t.auth.mfaSubtitle}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormField label={t.auth.mfaCode} htmlFor="mfa-code" hint={t.auth.mfaCodeHint}>
          <Input
            id="mfa-code"
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="one-time-code"
            inputMode="numeric"
            className="ltr text-start font-mono tracking-[0.4em]"
          />
        </FormField>

        {error && (
          <p role="alert" className="text-sm text-brand-red-500">
            {error}
          </p>
        )}

        <Button type="submit" isLoading={busy} className="mt-2 w-full">
          {t.auth.mfaSubmit}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  const { t } = useLocale();
  useDocumentTitle(t.nav.login);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const from = (location.state as { from?: Location })?.from?.pathname;

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const result = await login(values);

      if (isMfaChallenge(result)) {
        setChallengeToken(result.challengeToken);
        return;
      }

      const isAdmin = result.user.role === 'ADMIN' || result.user.role === 'SUPER_ADMIN';
      navigate(from ?? (isAdmin ? '/admin' : '/dashboard'), { replace: true });
    } catch (error) {
      const message = isApiError(error) && error.response?.status === 401 ? t.auth.loginError : t.common.error;
      setServerError(message);
      showToast(message, 'error');
    }
  }

  if (challengeToken) {
    return (
      <MfaStep
        challengeToken={challengeToken}
        // The role is not known until the session exists, so this lands on the
        // user dashboard and ProtectedRoute redirects an admin onward.
        onDone={() => navigate(from ?? '/dashboard', { replace: true })}
      />
    );
  }

  return (
    <AuthCard title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormField label={t.auth.email} htmlFor="email" error={resolveI18nKey(t, errors.email?.message)}>
          <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
        </FormField>
        <FormField label={t.auth.password} htmlFor="password" error={resolveI18nKey(t, errors.password?.message)}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            invalid={!!errors.password}
            {...register('password')}
          />
        </FormField>

        {serverError && (
          <p role="alert" className="text-sm text-brand-red-500">
            {serverError}
          </p>
        )}

        <div className="text-end">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-brand-green-600 hover:underline dark:text-brand-green-400"
          >
            {t.auth.forgotLink}
          </Link>
        </div>

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          {t.auth.loginSubmit}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        {t.auth.noAccount}{' '}
        <Link to="/register" className="font-medium text-brand-green-600 hover:underline dark:text-brand-green-400">
          {t.auth.registerLink}
        </Link>
      </p>
    </AuthCard>
  );
}
