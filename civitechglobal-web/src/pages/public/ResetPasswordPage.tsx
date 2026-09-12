import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { apiMessage } from '@/lib/apiMessage';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { resolveI18nKey } from '@/i18n/utils';
import { useToast } from '@/contexts/ToastContext';
import { useResetPassword } from '@/api/accountRecovery';
import { passwordSchema } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { AuthCard } from './AuthCard';

const schema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'auth.required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.passwordMismatch',
    path: ['confirmPassword'],
  });

type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const { t } = useLocale();
  useDocumentTitle(t.auth.resetTitle);
  const [params] = useSearchParams();
  const token = params.get('token');
  const reset = useResetPassword();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  // A link with no token at all is a mangled paste, not a rejected token — say
  // so before asking somebody to type a password that cannot be submitted.
  if (!token) {
    return (
      <AuthCard title={t.auth.resetTitle} subtitle={t.auth.resetLinkBroken}>
        <Link to="/forgot-password" className="block">
          <Button className="w-full">{t.auth.forgotSubmit}</Button>
        </Link>
      </AuthCard>
    );
  }

  async function onSubmit(values: Values) {
    setServerError(null);
    try {
      await reset.mutateAsync({ token: token!, password: values.password });
      showToast(t.auth.resetDone, 'success');
      // Every session was just revoked, this one included, so the only place
      // to go is the login screen.
      navigate('/login', { replace: true });
    } catch (error) {
      setServerError(apiMessage(error, t.auth.resetLinkBroken));
    }
  }

  return (
    <AuthCard title={t.auth.resetTitle} subtitle={t.auth.resetSubtitle}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormField
          label={t.auth.newPassword}
          htmlFor="password"
          hint={t.auth.passwordHint}
          error={resolveI18nKey(t, errors.password?.message)}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.password}
            {...register('password')}
          />
        </FormField>

        <FormField
          label={t.auth.confirmPassword}
          htmlFor="confirmPassword"
          error={resolveI18nKey(t, errors.confirmPassword?.message)}
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
        </FormField>

        {serverError && (
          <p role="alert" className="text-sm text-brand-red-500">
            {serverError}
          </p>
        )}

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          {t.auth.resetSubmit}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        {t.auth.resetRevokesSessions}
      </p>
    </AuthCard>
  );
}
