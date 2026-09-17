import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useOwnProfile, useUpdateProfile } from '@/api/marketplace';
import { apiMessage } from '@/lib/apiMessage';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';

const publicProfileSchema = z.object({
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(1000).optional(),
  website: z
    .union([z.literal(''), z.string().trim().url()])
    .optional(),
});

type PublicProfileValues = z.infer<typeof publicProfileSchema>;

/**
 * The marketplace-facing half of the account: what a stranger sees on the
 * public profile page. Kept apart from the legal identity fields above it —
 * those are who the person is to us, these are who they choose to be to the
 * market. Empty strings clear the field.
 */
export function PublicProfileForm() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const { data: profile } = useOwnProfile();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PublicProfileValues>({
    resolver: zodResolver(publicProfileSchema),
    defaultValues: { headline: '', bio: '', website: '' },
  });

  // The query resolves after mount; adopt its values as the form defaults.
  useEffect(() => {
    if (profile) {
      reset({
        headline: profile.headline ?? '',
        bio: profile.bio ?? '',
        website: profile.website ?? '',
      });
    }
  }, [profile, reset]);

  async function onSubmit(values: PublicProfileValues) {
    try {
      // The form is always seeded from the server, so every field is sent and
      // an empty box means "clear this" — undefined would mean "leave it".
      await updateProfile.mutateAsync({
        headline: values.headline?.trim() ?? '',
        bio: values.bio?.trim() ?? '',
        website: values.website?.trim() ?? '',
      });
      showToast(t.market.publicProfileSaved, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.market.publicProfileTitle}</CardTitle>
        <CardDescription>{t.market.publicProfileHint}</CardDescription>
      </CardHeader>
      {!profile?.username && (
        <p className="mb-4 text-body text-app-text-4">{t.market.usernameMissingHint}</p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormField label={t.market.headlineLabel} htmlFor="headline" error={errors.headline?.message}>
          <Input
            id="headline"
            placeholder={t.market.headlinePlaceholder}
            invalid={!!errors.headline}
            {...register('headline')}
          />
        </FormField>
        <FormField label={t.market.bioLabel} htmlFor="bio" error={errors.bio?.message}>
          <TextArea id="bio" rows={4} invalid={!!errors.bio} {...register('bio')} />
        </FormField>
        <FormField label={t.market.websiteLabel} htmlFor="website" error={errors.website?.message}>
          <Input
            id="website"
            type="url"
            dir="ltr"
            className="ltr text-start"
            placeholder={t.market.websitePlaceholder}
            invalid={!!errors.website}
            {...register('website')}
          />
        </FormField>
        <Button type="submit" isLoading={isSubmitting} className="w-fit">
          {t.common.save}
        </Button>
      </form>
    </Card>
  );
}
