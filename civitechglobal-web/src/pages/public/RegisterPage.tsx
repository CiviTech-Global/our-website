import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { resolveI18nKey, toLatinDigits } from '@/i18n/utils';
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
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  // Where the visitor was heading — "Add your shop", say — so a new account
  // continues that journey instead of dropping them on the dashboard to find
  // their way back. Router state only, and an in-app path only: one leading
  // slash, never two, which would be another site.
  const fromLocation = (location.state as { from?: { pathname?: string; search?: string } })?.from;
  const from =
    fromLocation?.pathname && /^\/(?!\/)/.test(fromLocation.pathname)
      ? `${fromLocation.pathname}${fromLocation.search ?? ''}`
      : undefined;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { accountKind: 'INDIVIDUAL' },
  });
  const isCompany = watch('accountKind') === 'COMPANY';

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      const { confirmPassword: _confirm, ...payload } = values;
      const user = await registerUser(
        payload.accountKind === 'COMPANY'
          ? { ...payload, companyNationalId: toLatinDigits(payload.companyNationalId ?? '') }
          : { ...payload, companyName: undefined, companyNationalId: undefined },
      );
      const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
      navigate(from ?? (isAdmin ? '/admin' : '/dashboard'), { replace: true });
    } catch {
      setServerError(t.auth.registerError);
      showToast(t.auth.registerError, 'error');
    }
  }

  return (
    <AuthCard title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <fieldset className="flex flex-wrap gap-4">
          <legend className="mb-2 text-sm font-medium text-text-primary">{t.plans.accountKind}</legend>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="radio" value="INDIVIDUAL" {...register('accountKind')} />
            {t.plans.kindIndividual}
          </label>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="radio" value="COMPANY" {...register('accountKind')} />
            {t.plans.kindCompany}
          </label>
        </fieldset>
        {isCompany && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label={t.plans.companyName} htmlFor="companyName" error={resolveI18nKey(t, errors.companyName?.message)}>
              <Input id="companyName" autoComplete="organization" invalid={!!errors.companyName} {...register('companyName')} />
            </FormField>
            <FormField
              label={t.plans.companyNationalId}
              htmlFor="companyNationalId"
              hint={!errors.companyNationalId ? t.plans.companyNationalIdHint : undefined}
              error={resolveI18nKey(t, errors.companyNationalId?.message)}
            >
              <Input id="companyNationalId" inputMode="numeric" dir="ltr" className="ltr text-start" invalid={!!errors.companyNationalId} {...register('companyNationalId')} />
            </FormField>
          </div>
        )}
        {isCompany && <p className="text-xs text-text-secondary">{t.plans.representativeHint}</p>}
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
