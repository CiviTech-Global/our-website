import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router';
import { isAxiosError } from 'axios';
import { useLocale } from '@/i18n/LocaleProvider';
import { resolveI18nKey } from '@/i18n/utils';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { loginSchema, type LoginFormValues } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { AuthCard } from './AuthCard';

export default function LoginPage() {
  const { t } = useLocale();
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const from = (location.state as { from?: Location })?.from?.pathname;

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const user = await login(values);
      const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
      navigate(from ?? (isAdmin ? '/admin' : '/dashboard'), { replace: true });
    } catch (error) {
      const message = isAxiosError(error) && error.response?.status === 401 ? t.auth.loginError : t.common.error;
      setServerError(message);
      showToast(message, 'error');
    }
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
