import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import { MailCheck, MailWarning } from 'lucide-react';
import { z } from 'zod';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { resolveI18nKey } from '@/i18n/utils';
import { useForgotPassword } from '@/api/accountRecovery';
import { isApiError } from '@/config/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { AuthCard } from './AuthCard';

const schema = z.object({
  email: z.string().min(1, 'auth.required').email('auth.invalidEmail'),
});

type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  useDocumentTitle(t.auth.forgotTitle);
  const forgot = useForgotPassword();
  const [sent, setSent] = useState(false);

  /**
   * The one failure worth showing.
   *
   * A deployment with no mail service answers 501 here. Folding that into the
   * "we sent you a link" screen would be the dead end this replaced: a
   * confirmation for a message nobody sent, and a person waiting on it.
   */
  const [emailUnavailable, setEmailUnavailable] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    // Still no error branch on "unknown address": the server answers
    // identically either way, so the page must too — otherwise the screen
    // becomes the way to ask whether somebody has an account here. 501 is
    // different: it does not depend on the address, so showing it leaks
    // nothing.
    try {
      await forgot.mutateAsync(values.email);
    } catch (error) {
      if (isApiError(error) && error.status === 501) {
        setEmailUnavailable(true);
        return;
      }
    }
    setSent(true);
  }

  if (emailUnavailable) {
    return (
      <AuthCard title={t.auth.emailUnavailableTitle} subtitle={t.auth.emailUnavailableBody}>
        <MailWarning className="mx-auto size-12 text-brand-amber-500" aria-hidden="true" />
        <Link to="/contact" className="mt-6 block">
          <Button className="w-full">{t.auth.emailUnavailableCta}</Button>
        </Link>
        <Link to="/login" className="mt-3 block">
          <Button variant="secondary" className="w-full">
            {t.auth.backToLogin}
          </Button>
        </Link>
      </AuthCard>
    );
  }

  if (sent) {
    return (
      <AuthCard title={t.auth.forgotSentTitle} subtitle={t.auth.forgotSentBody}>
        <MailCheck className="mx-auto size-12 text-brand-green-500" aria-hidden="true" />
        <p className="mt-6 text-center text-sm text-text-secondary">{t.auth.forgotSentHint}</p>
        <Link to="/login" className="mt-6 block">
          <Button variant="secondary" className="w-full">
            {t.auth.backToLogin}
          </Button>
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t.auth.forgotTitle} subtitle={t.auth.forgotSubtitle}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormField
          label={t.auth.email}
          htmlFor="email"
          error={resolveI18nKey(t, errors.email?.message)}
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            invalid={!!errors.email}
            {...register('email')}
          />
        </FormField>

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          {t.auth.forgotSubmit}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link
          to="/login"
          className="font-medium text-brand-green-600 hover:underline dark:text-brand-green-400"
        >
          {t.auth.backToLogin}
        </Link>
      </p>
    </AuthCard>
  );
}
