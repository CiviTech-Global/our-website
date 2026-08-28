import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale } from '@/i18n/LocaleProvider';
import { resolveI18nKey } from '@/i18n/utils';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { profileSchema, type ProfileFormValues } from '@/lib/validation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

/** NOTE: relies on an assumed `PUT /api/auth/me` endpoint (see AuthProvider.updateProfile). */
export default function ProfilePage() {
  const { t } = useLocale();
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
    },
  });

  async function onSubmit(values: ProfileFormValues) {
    try {
      await updateProfile(values);
      showToast(t.dashboard.profileSaved, 'success');
    } catch {
      showToast(t.errors.endpointUnavailable, 'error');
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <AnimatedSection>
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.profileEditTitle}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label={t.auth.firstName}
                htmlFor="firstName"
                error={resolveI18nKey(t, errors.firstName?.message)}
              >
                <Input id="firstName" invalid={!!errors.firstName} {...register('firstName')} />
              </FormField>
              <FormField
                label={t.auth.lastName}
                htmlFor="lastName"
                error={resolveI18nKey(t, errors.lastName?.message)}
              >
                <Input id="lastName" invalid={!!errors.lastName} {...register('lastName')} />
              </FormField>
            </div>
            <FormField label={t.dashboard.phone} htmlFor="phone">
              <Input id="phone" type="tel" className="ltr text-start" {...register('phone')} />
            </FormField>
            <Button type="submit" isLoading={isSubmitting} className="w-fit">
              {t.common.save}
            </Button>
          </form>
        </Card>
      </AnimatedSection>
    </div>
  );
}
