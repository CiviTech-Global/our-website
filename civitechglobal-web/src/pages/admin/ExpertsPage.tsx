import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, UserRound } from 'lucide-react';
import {
  adminPhotoPath,
  useAdminExperts,
  useDeleteExpert,
  useReorderExperts,
  useSaveExpert,
  type AdminExpert,
  type ExpertPayload,
} from '@/api/consult';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { toPersianDigits } from '@/i18n/utils';
import { useUploadFeedback } from '@/lib/useUploadFeedback';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { StaffImage } from '@/components/ui/StaffImage';
import { TextArea } from '@/components/ui/TextArea';
import { UploadStatus } from '@/components/ui/UploadStatus';

const EMPTY = {
  fullName: '',
  headline: '',
  slug: '',
  bio: '',
  specialities: '',
  languages: '',
  yearsExperience: '',
  linkedinUrl: '',
  githubUrl: '',
  websiteUrl: '',
  acceptsConsultations: true,
  featured: false,
  published: true,
};

/**
 * The club of experts, from the editor's side.
 *
 * Ordering is explicit rather than alphabetical: the club is a statement, and
 * who appears first is part of it. The slug is editable because a generated
 * one from a Persian name is a random suffix — readable URLs need a person.
 */
export default function AdminExpertsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.experts.adminTitle);
  const { showToast } = useToast();

  const { data: experts, isLoading } = useAdminExperts();
  const save = useSaveExpert();
  const remove = useDeleteExpert();
  const reorder = useReorderExperts();

  const [editing, setEditing] = useState<'new' | AdminExpert | null>(null);
  const [values, setValues] = useState(EMPTY);
  const [photo, setPhoto] = useState<File | null>(null);
  const upload = useUploadFeedback('expert-photo');

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));
  const set = (name: keyof typeof values) => (value: string | boolean) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  function openNew() {
    setValues(EMPTY);
    setPhoto(null);
    setEditing('new');
  }

  function openEdit(expert: AdminExpert) {
    setValues({
      fullName: expert.fullName,
      headline: expert.headline,
      slug: expert.slug,
      bio: expert.bio ?? '',
      specialities: expert.specialities.join('، '),
      languages: expert.languages.join('، '),
      yearsExperience: expert.yearsExperience === null ? '' : String(expert.yearsExperience),
      linkedinUrl: expert.linkedinUrl ?? '',
      githubUrl: expert.githubUrl ?? '',
      websiteUrl: expert.websiteUrl ?? '',
      acceptsConsultations: expert.acceptsConsultations,
      featured: expert.featured,
      published: expert.published,
    });
    setPhoto(null);
    setEditing(expert);
  }

  const list = (value: string) =>
    value
      .split(/[,،]/)
      .map((item) => item.trim())
      .filter(Boolean);

  // The event is absent when this is a retry of a failed upload.
  async function submit(event?: FormEvent) {
    event?.preventDefault();

    const payload: ExpertPayload = {
      fullName: values.fullName.trim(),
      headline: values.headline.trim(),
      slug: values.slug.trim() || undefined,
      bio: values.bio.trim() || undefined,
      specialities: list(values.specialities),
      languages: list(values.languages),
      yearsExperience: values.yearsExperience ? Number(values.yearsExperience) : null,
      linkedinUrl: values.linkedinUrl.trim() || undefined,
      githubUrl: values.githubUrl.trim() || undefined,
      websiteUrl: values.websiteUrl.trim() || undefined,
      acceptsConsultations: values.acceptsConsultations,
      featured: values.featured,
      published: values.published,
    };

    upload.start(photo);
    try {
      await save.mutateAsync({
        id: editing !== null && editing !== 'new' ? editing.id : undefined,
        payload,
        photo,
        onProgress: upload.onProgress,
      });
      upload.done();
      showToast(t.consult.saved, 'success');
      setEditing(null);
    } catch (error) {
      showToast(upload.fail(error).message, 'error');
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!experts) return;
    const next = [...experts];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    try {
      await reorder.mutateAsync(next.map((expert) => expert.id));
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.experts.adminTitle}
        description={t.experts.adminSubtitle}
        className="mb-2"
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" aria-hidden="true" />
            {t.experts.addExpert}
          </Button>
        }
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && experts?.length === 0 && (
        <EmptyState
          title={t.experts.adminEmpty}
          description={t.experts.adminEmptyBody}
          icon={<UserRound aria-hidden="true" />}
          action={
            <Button onClick={openNew}>
              <Plus className="size-4" aria-hidden="true" />
              {t.experts.addExpert}
            </Button>
          }
        />
      )}

      <ul className="flex flex-col gap-3">
        {experts?.map((expert, index) => (
          <li key={expert.id}>
            <Card className={expert.published ? undefined : 'opacity-70'}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    aria-label={t.showcase?.moveUp ?? 'Up'}
                    disabled={index === 0 || reorder.isPending}
                    className="rounded border border-app-border-light p-1 text-app-text-3 disabled:opacity-40"
                    onClick={() => void move(index, -1)}
                  >
                    <ArrowUp className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={t.showcase?.moveDown ?? 'Down'}
                    disabled={index === (experts?.length ?? 0) - 1 || reorder.isPending}
                    className="rounded border border-app-border-light p-1 text-app-text-3 disabled:opacity-40"
                    onClick={() => void move(index, 1)}
                  >
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </button>
                </div>

                <div className="size-14 shrink-0 overflow-hidden rounded-full border border-app-border-light bg-app-subtle">
                  <StaffImage
                    path={adminPhotoPath(expert.id, expert.photoUrl)}
                    alt=""
                    className="size-full object-cover"
                    fallback={
                      <div className="flex size-full items-center justify-center text-app-text-4">
                        <UserRound className="size-5" aria-hidden="true" />
                      </div>
                    }
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-app-text">{expert.fullName}</p>
                    {expert.featured && <Badge variant="warning">{t.experts.fieldFeatured}</Badge>}
                    {expert.acceptsConsultations ? (
                      <Badge variant="success">{t.experts.takesConsultations}</Badge>
                    ) : (
                      <Badge>{t.experts.listedOnly}</Badge>
                    )}
                    {!expert.published && <Badge variant="danger">{t.experts.fieldPublished}</Badge>}
                  </div>
                  <p className="mt-0.5 text-body text-app-text-3">{expert.headline}</p>
                  <p className="mt-0.5 text-label text-app-text-4">
                    <span className="ltr font-mono">/experts/{expert.slug}</span>
                    {' · '}
                    {t.experts.requestCount.replace('{count}', number(expert._count.requests))}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(expert)}>
                    {t.common.edit}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!window.confirm(t.experts.deleteConfirm)) return;
                      void remove
                        .mutateAsync(expert.id)
                        .then(() => showToast(t.experts.deleted, 'success'))
                        .catch((error: unknown) => showToast(apiMessage(error, t.common.error), 'error'));
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t.experts.addExpert : t.experts.editExpert}
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t.experts.fieldName} htmlFor="expert-name">
              <Input
                id="expert-name"
                required
                value={values.fullName}
                onChange={(e) => set('fullName')(e.target.value)}
              />
            </FormField>

            <FormField label={t.experts.fieldSlug} htmlFor="expert-slug" hint={t.experts.fieldSlugHint}>
              <Input
                id="expert-slug"
                dir="ltr"
                value={values.slug}
                onChange={(e) => set('slug')(e.target.value)}
              />
            </FormField>
          </div>

          <FormField
            label={t.experts.fieldHeadline}
            htmlFor="expert-headline"
            hint={t.experts.fieldHeadlineHint}
          >
            <Input
              id="expert-headline"
              required
              value={values.headline}
              onChange={(e) => set('headline')(e.target.value)}
            />
          </FormField>

          <FormField label={t.experts.fieldBio} htmlFor="expert-bio">
            <TextArea
              id="expert-bio"
              rows={4}
              value={values.bio}
              onChange={(e) => set('bio')(e.target.value)}
            />
          </FormField>

          <FormField label={t.experts.fieldPhoto} htmlFor="expert-photo">
            <Input
              id="expert-photo"
              type="file"
              accept="image/*"
              onChange={(e) => void upload.pickImage(e.target.files?.[0] ?? null).then(setPhoto)}
            />
          </FormField>

          {upload.state.phase !== 'idle' && (
            <UploadStatus state={upload.state} onRetry={() => void submit()} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t.experts.fieldSpecialities}
              htmlFor="expert-specialities"
              hint={t.experts.fieldSpecialitiesHint}
            >
              <Input
                id="expert-specialities"
                value={values.specialities}
                onChange={(e) => set('specialities')(e.target.value)}
              />
            </FormField>

            <FormField label={t.experts.fieldLanguages} htmlFor="expert-languages">
              <Input
                id="expert-languages"
                value={values.languages}
                onChange={(e) => set('languages')(e.target.value)}
              />
            </FormField>

            <FormField label={t.experts.fieldYears} htmlFor="expert-years">
              <Input
                id="expert-years"
                inputMode="numeric"
                value={values.yearsExperience}
                onChange={(e) => set('yearsExperience')(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </FormField>

            <FormField label="LinkedIn" htmlFor="expert-linkedin">
              <Input
                id="expert-linkedin"
                dir="ltr"
                value={values.linkedinUrl}
                onChange={(e) => set('linkedinUrl')(e.target.value)}
              />
            </FormField>

            <FormField label="GitHub" htmlFor="expert-github">
              <Input
                id="expert-github"
                dir="ltr"
                value={values.githubUrl}
                onChange={(e) => set('githubUrl')(e.target.value)}
              />
            </FormField>

            <FormField label="Website" htmlFor="expert-website">
              <Input
                id="expert-website"
                dir="ltr"
                value={values.websiteUrl}
                onChange={(e) => set('websiteUrl')(e.target.value)}
              />
            </FormField>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-body text-app-text">
              <input
                type="checkbox"
                className="size-4 rounded border-app-border"
                checked={values.acceptsConsultations}
                onChange={(e) => set('acceptsConsultations')(e.target.checked)}
              />
              {t.experts.fieldAccepts}
            </label>

            <label className="flex items-center gap-2 text-body text-app-text">
              <input
                type="checkbox"
                className="size-4 rounded border-app-border"
                checked={values.featured}
                onChange={(e) => set('featured')(e.target.checked)}
              />
              {t.experts.fieldFeatured}
            </label>

            <label className="flex items-center gap-2 text-body text-app-text">
              <input
                type="checkbox"
                className="size-4 rounded border-app-border"
                checked={values.published}
                onChange={(e) => set('published')(e.target.checked)}
              />
              {t.experts.fieldPublished}
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              isLoading={save.isPending}
              disabled={upload.state.phase === 'shrinking'}
            >
              {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
