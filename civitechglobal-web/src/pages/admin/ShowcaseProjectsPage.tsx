import { PageHeader } from '@/components/app/PageHeader';
import { useState, type FormEvent } from 'react';
import { Code2, Eye, EyeOff, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import {
  PROJECT_STATUSES,
  adminImagePath,
  useAdminOrganizations,
  useAdminProjects,
  useDeleteProject,
  useReorderProjects,
  useSaveProject,
  type AdminShowcaseProject,
  type ProjectPayload,
  type ShowcaseProjectStatus,
} from '@/api/showcase';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { MoveButtons } from '@/components/admin/OrderedList';
import { useOrderedList } from '@/components/admin/useOrderedList';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateField } from '@/components/ui/DateField';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { StaffImage } from '@/components/ui/StaffImage';
import { TextArea } from '@/components/ui/TextArea';

/** An ISO timestamp from the API as the yyyy-mm-dd the date field works in. */
const toDateValue = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

/**
 * The "our projects" page, from the editor's side.
 *
 * A project may name a client from the customers club. The picker offers
 * every customer, published or not, but the public card only shows the name
 * while that customer's own listing is published — the form says so, so an
 * editor is not left wondering why a client they chose does not appear.
 */
export default function ShowcaseProjectsPage() {
  const { t } = useLocale();
  useDocumentTitle(t.showcase.adminProjectsTitle);
  const { showToast } = useToast();
  const onError = (error: unknown) => showToast(apiMessage(error, t.common.error), 'error');

  const { data, isLoading } = useAdminProjects();
  const reorder = useReorderProjects();
  const remove = useDeleteProject();
  const save = useSaveProject();
  const list = useOrderedList(data, reorder.mutateAsync, onError);

  const [editing, setEditing] = useState<AdminShowcaseProject | 'new' | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.showcase.adminProjectsTitle}
        className="mb-2"
        description={
          <>
            {t.showcase.adminProjectsSubtitle} {t.showcase.orderNote}
          </>
        }
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden="true" />
            {t.showcase.addProject}
          </Button>
        }
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && list.order.length === 0 && <EmptyState title={t.showcase.projectsEmpty} />}

      <ul className="flex flex-col gap-3">
        {list.order.map((project, index) => (
          <li key={project.id}>
            <Card className={project.published ? undefined : 'opacity-70'}>
              <div className="flex flex-wrap items-center gap-4">
                <MoveButtons
                  index={index}
                  count={list.order.length}
                  busy={reorder.isPending}
                  onMove={(i, d) => void list.move(i, d)}
                  upLabel={t.showcase.moveUp}
                  downLabel={t.showcase.moveDown}
                />

                <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded border border-app-border-light bg-app-fill">
                  <StaffImage
                    path={adminImagePath(project.coverUrl)}
                    alt=""
                    className="size-full object-cover"
                    fallback={<Code2 className="size-6 text-app-text-4" aria-hidden="true" />}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-app-text">
                    {project.title}
                    {project.featured && (
                      <Star
                        className="size-4 fill-status-warning text-status-warning"
                        aria-label={t.showcase.featuredLabel}
                      />
                    )}
                  </p>
                  <p className="text-label text-app-text-4">
                    {[t.showcase.projectStatuses[project.status], project.category, project.client?.name]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={project.published ? 'success' : 'default'}>
                    {project.published ? t.showcase.published : t.showcase.hidden}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={project.published ? t.showcase.hide : t.showcase.publish}
                    onClick={async () => {
                      try {
                        await save.mutateAsync({ id: project.id, payload: { published: !project.published } });
                      } catch (error) {
                        onError(error);
                      }
                    }}
                  >
                    {project.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(project)}>
                    <Pencil className="size-4" aria-hidden="true" />
                    {t.common.edit}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={t.common.delete}
                    onClick={() => setConfirming(project.id)}
                  >
                    <Trash2 className="size-4 text-status-error" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {confirming === project.id && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-app-border-light pt-3">
                  <p className="text-body text-app-text-3">{t.showcase.deleteProjectConfirm}</p>
                  <Button
                    size="sm"
                    variant="danger"
                    isLoading={remove.isPending}
                    onClick={async () => {
                      try {
                        await remove.mutateAsync(project.id);
                        setConfirming(null);
                      } catch (error) {
                        onError(error);
                      }
                    }}
                  >
                    {t.common.delete}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                    {t.common.cancel}
                  </Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      {editing && (
        <ProjectForm project={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function ProjectForm({ project, onClose }: { project: AdminShowcaseProject | null; onClose: () => void }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const save = useSaveProject();
  const { data: customers } = useAdminOrganizations('CUSTOMER');

  const [values, setValues] = useState({
    title: project?.title ?? '',
    summary: project?.summary ?? '',
    description: project?.description ?? '',
    category: project?.category ?? '',
    status: (project?.status ?? 'IN_PROGRESS') as ShowcaseProjectStatus,
    technologies: project?.technologies.join(', ') ?? '',
    projectUrl: project?.projectUrl ?? '',
    repositoryUrl: project?.repositoryUrl ?? '',
    startedAt: toDateValue(project?.startedAt ?? null),
    completedAt: toDateValue(project?.completedAt ?? null),
    clientId: project?.clientId ?? '',
    featured: project?.featured ?? false,
    published: project?.published ?? true,
  });
  const [cover, setCover] = useState<File | null>(null);

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();

    // Emptied fields go as '' on purpose: the server reads that as "clear it",
    // where a missing key would keep the old value.
    const payload: ProjectPayload = {
      title: values.title.trim(),
      summary: values.summary.trim(),
      description: values.description.trim(),
      category: values.category.trim(),
      status: values.status,
      technologies: values.technologies
        .split(/[,،]/)
        .map((item) => item.trim())
        .filter(Boolean),
      projectUrl: values.projectUrl.trim(),
      repositoryUrl: values.repositoryUrl.trim(),
      startedAt: values.startedAt,
      completedAt: values.completedAt,
      clientId: values.clientId || null,
      featured: values.featured,
      published: values.published,
    };

    try {
      await save.mutateAsync({ id: project?.id, payload, cover });
      showToast(t.showcase.saved, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={project ? t.showcase.editProject : t.showcase.addProject}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <FormField label={t.showcase.projectTitle} htmlFor="project-title">
          <Input id="project-title" required minLength={2} value={values.title} onChange={(e) => set('title', e.target.value)} />
        </FormField>

        <FormField label={t.showcase.summary} htmlFor="project-summary">
          <TextArea
            id="project-summary"
            rows={2}
            required
            minLength={10}
            maxLength={400}
            value={values.summary}
            onChange={(e) => set('summary', e.target.value)}
          />
        </FormField>

        <FormField label={t.showcase.projectDescription} htmlFor="project-description">
          <TextArea id="project-description" rows={4} value={values.description} onChange={(e) => set('description', e.target.value)} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.showcase.status} htmlFor="project-status">
            <Select
              id="project-status"
              value={values.status}
              onChange={(e) => set('status', e.target.value as ShowcaseProjectStatus)}
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t.showcase.projectStatuses[status]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t.showcase.category} htmlFor="project-category">
            <Input id="project-category" value={values.category} onChange={(e) => set('category', e.target.value)} />
          </FormField>
          <FormField label={t.showcase.startedAt} htmlFor="project-started">
            <DateField id="project-started" value={values.startedAt} onChange={(next) => set('startedAt', next)} />
          </FormField>
          <FormField label={t.showcase.completedAt} htmlFor="project-completed">
            <DateField
              id="project-completed"
              value={values.completedAt}
              min={values.startedAt || undefined}
              onChange={(next) => set('completedAt', next)}
            />
          </FormField>
        </div>

        <FormField label={t.showcase.technologies} htmlFor="project-tech" hint={t.showcase.technologiesHint}>
          <Input id="project-tech" dir="ltr" className="ltr" value={values.technologies} onChange={(e) => set('technologies', e.target.value)} />
        </FormField>

        <FormField label={t.showcase.clientLabel} htmlFor="project-client" hint={t.showcase.clientHint}>
          <Select id="project-client" value={values.clientId} onChange={(e) => set('clientId', e.target.value)}>
            <option value="">{t.showcase.noClient}</option>
            {customers?.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
                {customer.published ? '' : ` (${t.showcase.hidden})`}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.showcase.projectUrl} htmlFor="project-url">
            <Input id="project-url" type="url" dir="ltr" className="ltr" placeholder="https://" value={values.projectUrl} onChange={(e) => set('projectUrl', e.target.value)} />
          </FormField>
          <FormField label={t.showcase.repositoryUrl} htmlFor="project-repo">
            <Input id="project-repo" type="url" dir="ltr" className="ltr" placeholder="https://" value={values.repositoryUrl} onChange={(e) => set('repositoryUrl', e.target.value)} />
          </FormField>
        </div>

        <FormField
          label={t.showcase.cover}
          htmlFor="project-cover"
          hint={project?.coverUrl ? t.showcase.imageReplaceHint : t.showcase.imageHint}
        >
          <Input id="project-cover" type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
        </FormField>

        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-2 text-body text-app-text-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-app-border"
              checked={values.featured}
              onChange={(e) => set('featured', e.target.checked)}
            />
            {t.showcase.featuredLabel} — {t.showcase.featuredHint}
          </label>
          <label className="flex items-start gap-2 text-body text-app-text-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-app-border"
              checked={values.published}
              onChange={(e) => set('published', e.target.checked)}
            />
            {t.showcase.publishedHint}
          </label>
        </div>

        <div className="flex gap-2">
          <Button type="submit" isLoading={save.isPending}>
            {t.common.save}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
