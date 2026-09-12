import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { resolveI18nKey } from '@/i18n/utils';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { registerSchema, type RegisterFormValues } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { AuthCard } from './AuthCard';

export default function RegisterPage() {
  const { t } = useLocale();
  useDocumentTitle(t.nav.register);
  const { register: registerUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      const user = await registerUser(values);
      const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
      navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
    } catch {
      setServerError(t.auth.registerError);
      showToast(t.auth.registerError, 'error');
    }
  }

  return (
    <AuthCard title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={t.auth.firstName} htmlFor="firstName" error={resolveI18nKey(t, errors.firstName?.message)}>
            <Input id="firstName" autoComplete="given-name" invalid={!!errors.firstName} {...register('firstName')} />
          </FormField>
          <FormField label={t.auth.lastName} htmlFor="lastName" error={resolveI18nKey(t, errors.lastName?.message)}>
            <Input id="lastName" autoComplete="family-name" invalid={!!errors.lastName} {...register('lastName')} />
          </FormField>
        </div>
        <FormField label={t.auth.email} htmlFor="email" error={resolveI18nKey(t, errors.email?.message)}>
          <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
        </FormField>
        <FormField
          label={t.auth.password}
          htmlFor="password"
          hint={!errors.password ? t.auth.passwordHint : undefined}
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
          {t.auth.registerSubmit}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        {t.auth.haveAccount}{' '}
        <Link to="/login" className="font-medium text-brand-green-600 hover:underline dark:text-brand-green-400">
          {t.auth.loginLink}
        </Link>
      </p>
    </AuthCard>
  );
}
