import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, UserRound } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { OWN_EXPERT_PHOTO_PATH, useOwnExpert, useSaveOwnExpert } from '@/api/consult';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { StaffImage } from '@/components/ui/StaffImage';
import { TextArea } from '@/components/ui/TextArea';

/** A link that must point at the site it claims to; the server checks the same. */
const hostLink = (host: string) =>
  z.union([
    z.literal(''),
    z
      .string()
      .trim()
      .url()
      .refine((value) => {
        try {
          const name = new URL(value).hostname.toLowerCase().replace(/^www\./, '');
          return name === host || name.endsWith(`.${host}`);
        } catch {
          return false;
        }
      }),
  ]);

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  headline: z.string().trim().min(2).max(160),
  bio: z.string().trim().max(4000),
  specialities: z.string().max(1500),
  languages: z.string().max(500),
  yearsExperience: z.string().trim().regex(/^\d{0,2}$/),
  githubUrl: hostLink('github.com'),
  linkedinUrl: hostLink('linkedin.com'),
  websiteUrl: z.union([z.literal(''), z.string().trim().url()]),
  hourlyFee: z.string().trim().regex(/^\d*$/),
  acceptsConsultations: z.boolean(),
});

type Values = z.infer<typeof schema>;

const split = (value: string) =>
  value
    .split(/[,،]/)
    .map((item) => item.trim())
    .filter(Boolean);

const STATUS_VARIANT = {
  DRAFT: 'default',
  PENDING_REVIEW: 'warning',
  CHANGES_REQUESTED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
} as const;

/**
 * The consultant's own profile: fee, links and what they help with.
 *
 * A first submission waits for staff; once approved, edits go live at once.
 * Staff-opened expert accounts land here with their profile already written.
 */
export default function ExpertSelfPage() {
  const { t } = useLocale();
  const p = t.plans;
  useDocumentTitle(p.expertTitle);
  const { showToast } = useToast();
  const { data: expert, isLoading } = useOwnExpert();
  const save = useSaveOwnExpert();
  const [photo, setPhoto] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      headline: '',
      bio: '',
      specialities: '',
      languages: '',
      yearsExperience: '',
      githubUrl: '',
      linkedinUrl: '',
      websiteUrl: '',
      hourlyFee: '',
      acceptsConsultations: true,
    },
  });

  useEffect(() => {
    if (!expert) return;
    reset({
      fullName: expert.fullName,
      headline: expert.headline,
      bio: expert.bio ?? '',
      specialities: expert.specialities.join('، '),
      languages: expert.languages.join('، '),
      yearsExperience: expert.yearsExperience === null ? '' : String(expert.yearsExperience),
      githubUrl: expert.githubUrl ?? '',
      linkedinUrl: expert.linkedinUrl ?? '',
      websiteUrl: expert.websiteUrl ?? '',
      hourlyFee: expert.hourlyFee ?? '',
      acceptsConsultations: expert.acceptsConsultations,
    });
  }, [expert, reset]);

  const accepts = watch('acceptsConsultations');

  async function onSubmit(values: Values) {
    if (values.acceptsConsultations && !values.githubUrl && !values.linkedinUrl && !values.websiteUrl) {
      showToast(p.linksRequired, 'error');
      return;
    }
    try {
      const result = await save.mutateAsync({
        payload: {
          fullName: values.fullName,
          headline: values.headline,
          bio: values.bio,
          specialities: split(values.specialities),
          languages: split(values.languages),
          yearsExperience: values.yearsExperience ? Number(values.yearsExperience) : null,
          githubUrl: values.githubUrl,
          linkedinUrl: values.linkedinUrl,
          websiteUrl: values.websiteUrl,
          hourlyFee: values.hourlyFee,
          acceptsConsultations: values.acceptsConsultations,
        },
        photo,
      });
      setPhoto(null);
      showToast(result.moderationStatus === 'PENDING_REVIEW' ? p.expertSubmitted : p.expertSaved, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  const live = expert?.published && expert.moderationStatus === 'APPROVED';

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={p.expertTitle}
        description={p.expertIntro}
        className="mb-0"
        actions={
          live ? (
            <Link to={`/experts/${expert!.slug}`}>
              <Button variant="outline" size="sm">
                <ExternalLink aria-hidden="true" />
                {p.viewPublic}
              </Button>
            </Link>
          ) : undefined
        }
      />

      {expert && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_VARIANT[expert.moderationStatus]}>{p.expertStatuses[expert.moderationStatus]}</Badge>
          {expert.reviewNote && (
            <span className="text-label text-app-text-3">
              {p.reviewNote}: {expert.reviewNote}
            </span>
          )}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="size-20 shrink-0 overflow-hidden rounded-full border border-app-border bg-app-well">
              {photo ? (
                <img src={URL.createObjectURL(photo)} alt="" className="size-full object-cover" />
              ) : (
                <StaffImage
                  path={expert?.photoUrl ? OWN_EXPERT_PHOTO_PATH : null}
                  alt=""
                  className="size-full object-cover"
                  fallback={
                    <div className="flex size-full items-center justify-center text-app-text-4">
                      <UserRound className="size-8" aria-hidden="true" />
                    </div>
                  }
                />
              )}
            </div>
            <FormField label={p.expertPhoto} htmlFor="photo">
              <Input id="photo" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t.auth.firstName + ' / ' + t.auth.lastName} htmlFor="fullName" error={errors.fullName && t.common.error}>
              <Input id="fullName" invalid={!!errors.fullName} {...register('fullName')} />
            </FormField>
            <FormField label={p.expertHeadline} htmlFor="headline" error={errors.headline && t.common.error}>
              <Input id="headline" invalid={!!errors.headline} {...register('headline')} />
            </FormField>
          </div>

          <FormField label={p.expertBio} htmlFor="bio">
            <TextArea id="bio" rows={5} {...register('bio')} />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label={p.expertSpecialities} htmlFor="specialities">
              <Input id="specialities" {...register('specialities')} />
            </FormField>
            <FormField label={p.expertLanguages} htmlFor="languages">
              <Input id="languages" {...register('languages')} />
            </FormField>
            <FormField label={p.expertYears} htmlFor="yearsExperience" error={errors.yearsExperience && t.common.error}>
              <Input id="yearsExperience" inputMode="numeric" dir="ltr" className="ltr text-start" {...register('yearsExperience')} />
            </FormField>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-body font-medium text-app-text">{p.linksTitle}</legend>
            <p className="text-label text-app-text-4">{p.linksHint}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label={p.linkedin} htmlFor="linkedinUrl" error={errors.linkedinUrl && t.common.error}>
                <Input id="linkedinUrl" type="url" dir="ltr" className="ltr text-start" placeholder="https://linkedin.com/in/…" invalid={!!errors.linkedinUrl} {...register('linkedinUrl')} />
              </FormField>
              <FormField label={p.github} htmlFor="githubUrl" error={errors.githubUrl && t.common.error}>
                <Input id="githubUrl" type="url" dir="ltr" className="ltr text-start" placeholder="https://github.com/…" invalid={!!errors.githubUrl} {...register('githubUrl')} />
              </FormField>
              <FormField label={p.website} htmlFor="websiteUrl" error={errors.websiteUrl && t.common.error}>
                <Input id="websiteUrl" type="url" dir="ltr" className="ltr text-start" placeholder="https://" invalid={!!errors.websiteUrl} {...register('websiteUrl')} />
              </FormField>
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-body text-app-text">
            <input type="checkbox" className="size-4" {...register('acceptsConsultations')} />
            {p.acceptsConsultations}
          </label>

          {accepts && (
            <FormField label={p.hourlyFee} htmlFor="hourlyFee" hint={p.hourlyFeeHint} error={errors.hourlyFee && t.common.error}>
              <Input id="hourlyFee" inputMode="numeric" dir="ltr" className="ltr w-56 text-start" invalid={!!errors.hourlyFee} {...register('hourlyFee')} />
            </FormField>
          )}

          <Button type="submit" isLoading={save.isPending} className="w-fit">
            {!expert || expert.moderationStatus === 'REJECTED' ? p.submitExpert : p.saveExpert}
          </Button>
        </form>
      </Card>
    </div>
  );
}
