import { PageHeader } from '@/components/app/PageHeader';
import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, FolderPlus, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import {
  adminPhotoPath,
  useAdminTeam,
  useCreateMember,
  useCreateSection,
  useDeleteMember,
  useDeleteSection,
  useReorderSections,
  useReorderTeam,
  useUpdateMember,
  useUpdateSection,
  type AdminTeamMember,
  type AdminTeamSection,
  type TeamMemberPayload,
  type TeamSectionPayload,
} from '@/api/team';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { MoveButtons } from '@/components/admin/OrderedList';
import { useOrderedList } from '@/components/admin/useOrderedList';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { StaffImage } from '@/components/ui/StaffImage';
import { TextArea } from '@/components/ui/TextArea';

const EMPTY: TeamMemberPayload = {
  name: '',
  title: '',
  bio: '',
  sectionId: null,
  email: '',
  linkedin: '',
  github: '',
  website: '',
  published: true,
};

/**
 * Who appears on "تیم ما", under which heading, and in what order.
 *
 * Two lists on one screen, sections first: the structure of the page is
 * decided before the people are placed in it, and a member's section is picked
 * from the sections that exist rather than typed — which is what stopped
 * "Engineering" and "engineering " being two departments.
 */
export default function AdminTeamPage() {
  const { t } = useLocale();
  useDocumentTitle(t.team.adminTitle);
  const { showToast } = useToast();
  const onError = (error: unknown) => showToast(apiMessage(error, t.common.error), 'error');

  const { data, isLoading } = useAdminTeam();
  const reorderMembers = useReorderTeam();
  const reorderSections = useReorderSections();
  const removeMember = useDeleteMember();
  const removeSection = useDeleteSection();
  const updateMember = useUpdateMember();

  const members = useOrderedList(data?.members, reorderMembers.mutateAsync, onError);
  const sections = useOrderedList(data?.sections, reorderSections.mutateAsync, onError);

  const [editingMember, setEditingMember] = useState<AdminTeamMember | 'new' | null>(null);
  const [editingSection, setEditingSection] = useState<AdminTeamSection | 'new' | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const sectionName = (id: string | null) =>
    data?.sections.find((section) => section.id === id)?.name ?? null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t.team.adminTitle} description={t.team.adminSubtitle} className="mb-0" />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {/* Sections ------------------------------------------------------------ */}
      <section className="flex flex-col gap-3" aria-labelledby="sections-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <h2 id="sections-heading" className="text-title-sm font-semibold text-app-text">
              {t.team.sectionsTitle}
            </h2>
            <p className="mt-1 text-body text-app-text-3">{t.team.sectionsHint}</p>
          </div>
          <Button variant="secondary" onClick={() => setEditingSection('new')}>
            <FolderPlus className="size-4" aria-hidden="true" />
            {t.team.addSection}
          </Button>
        </div>

        {!isLoading && sections.order.length === 0 && (
          <p className="text-body text-app-text-4">{t.team.sectionsEmpty}</p>
        )}

        <ul className="flex flex-col gap-2">
          {sections.order.map((section, index) => (
            <li key={section.id}>
              <Card className="py-3">
                <div className="flex flex-wrap items-center gap-4">
                  <MoveButtons
                    index={index}
                    count={sections.order.length}
                    busy={reorderSections.isPending}
                    onMove={(i, d) => void sections.move(i, d)}
                    upLabel={t.team.moveUp}
                    downLabel={t.team.moveDown}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-app-text">{section.name}</p>
                    {section.description && (
                      <p className="text-body text-app-text-3">{section.description}</p>
                    )}
                  </div>
                  <Badge>
                    {section._count.members}{' '}
                    {section._count.members === 1 ? t.team.sectionMembersOne : t.team.sectionMembers}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setEditingSection(section)}>
                    <Pencil className="size-4" aria-hidden="true" />
                    {t.common.edit}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={t.common.delete}
                    onClick={() => setConfirming(`section:${section.id}`)}
                  >
                    <Trash2 className="size-4 text-status-error" aria-hidden="true" />
                  </Button>
                </div>

                {confirming === `section:${section.id}` && (
                  <ConfirmRow
                    message={t.team.sectionDeleteConfirm}
                    busy={removeSection.isPending}
                    onCancel={() => setConfirming(null)}
                    onConfirm={async () => {
                      try {
                        await removeSection.mutateAsync(section.id);
                        setConfirming(null);
                      } catch (error) {
                        onError(error);
                      }
                    }}
                  />
                )}
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* Members ------------------------------------------------------------- */}
      <section className="flex flex-col gap-3" aria-labelledby="members-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="members-heading" className="text-title-sm font-semibold text-app-text">
            {t.team.membersTitle}
          </h2>
          <Button onClick={() => setEditingMember('new')}>
            <Plus className="size-4" aria-hidden="true" />
            {t.team.addMember}
          </Button>
        </div>

        {!isLoading && members.order.length === 0 && <EmptyState title={t.team.empty} />}

        <ul className="flex flex-col gap-3">
          {members.order.map((member, index) => (
            <li key={member.id}>
              <Card className={member.published ? undefined : 'opacity-70'}>
                <div className="flex flex-wrap items-center gap-4">
                  <MoveButtons
                    index={index}
                    count={members.order.length}
                    busy={reorderMembers.isPending}
                    onMove={(i, d) => void members.move(i, d)}
                    upLabel={t.team.moveUp}
                    downLabel={t.team.moveDown}
                  />

                  <StaffImage
                    path={adminPhotoPath(member.photoUrl)}
                    alt={member.name}
                    className="size-14 shrink-0 rounded-full border border-app-border-light object-cover"
                    fallback={
                      <div
                        className="flex size-14 shrink-0 items-center justify-center rounded-full border border-app-border-light bg-app-fill"
                        aria-hidden="true"
                      >
                        <UserRound className="size-6 text-app-text-4" />
                      </div>
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-app-text">{member.name}</p>
                    <p className="text-body text-app-text-3">{member.title}</p>
                    <p className="mt-0.5 text-label text-app-text-4">
                      {sectionName(member.sectionId) ?? t.team.noSection}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={member.published ? 'success' : 'default'}>
                      {member.published ? t.team.published : t.team.hidden}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={member.published ? t.team.hide : t.team.publish}
                      onClick={async () => {
                        try {
                          // Only the flag: a partial PATCH is what the route
                          // expects, and resubmitting every field is not.
                          await updateMember.mutateAsync({
                            id: member.id,
                            payload: { published: !member.published },
                          });
                        } catch (error) {
                          onError(error);
                        }
                      }}
                    >
                      {member.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingMember(member)}>
                      <Pencil className="size-4" aria-hidden="true" />
                      {t.common.edit}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={t.common.delete}
                      onClick={() => setConfirming(`member:${member.id}`)}
                    >
                      <Trash2 className="size-4 text-status-error" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                {confirming === `member:${member.id}` && (
                  <ConfirmRow
                    message={t.team.deleteConfirm}
                    busy={removeMember.isPending}
                    onCancel={() => setConfirming(null)}
                    onConfirm={async () => {
                      try {
                        await removeMember.mutateAsync(member.id);
                        setConfirming(null);
                      } catch (error) {
                        onError(error);
                      }
                    }}
                  />
                )}
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {editingMember && (
        <MemberForm
          member={editingMember === 'new' ? null : editingMember}
          sections={data?.sections ?? []}
          onClose={() => setEditingMember(null)}
        />
      )}

      {editingSection && (
        <SectionForm
          section={editingSection === 'new' ? null : editingSection}
          onClose={() => setEditingSection(null)}
        />
      )}
    </div>
  );
}

function ConfirmRow({
  message,
  busy,
  onConfirm,
  onCancel,
}: {
  message: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-app-border-light pt-3">
      <p className="text-body text-app-text-3">{message}</p>
      <Button size="sm" variant="danger" isLoading={busy} onClick={onConfirm}>
        {t.common.delete}
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        {t.common.cancel}
      </Button>
    </div>
  );
}

function SectionForm({ section, onClose }: { section: AdminTeamSection | null; onClose: () => void }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const create = useCreateSection();
  const update = useUpdateSection();
  const [values, setValues] = useState<TeamSectionPayload>({
    name: section?.name ?? '',
    description: section?.description ?? '',
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = { name: values.name.trim(), description: values.description?.trim() || undefined };
    try {
      if (section) await update.mutateAsync({ id: section.id, payload });
      else await create.mutateAsync(payload);
      showToast(t.team.saved, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={section ? t.team.editSection : t.team.addSection}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <FormField label={t.team.sectionName} htmlFor="section-name">
          <Input
            id="section-name"
            required
            minLength={2}
            value={values.name}
            onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
          />
        </FormField>
        <FormField label={t.team.sectionDescription} htmlFor="section-description">
          <Input
            id="section-description"
            value={values.description}
            onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
          />
        </FormField>
        <div className="flex gap-2">
          <Button type="submit" isLoading={create.isPending || update.isPending}>
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

function MemberForm({
  member,
  sections,
  onClose,
}: {
  member: AdminTeamMember | null;
  sections: AdminTeamSection[];
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const create = useCreateMember();
  const update = useUpdateMember();

  const [values, setValues] = useState<TeamMemberPayload>(
    member
      ? {
          name: member.name,
          title: member.title,
          bio: member.bio ?? '',
          sectionId: member.sectionId,
          email: member.email ?? '',
          linkedin: member.linkedin ?? '',
          github: member.github ?? '',
          website: member.website ?? '',
          published: member.published,
        }
      : EMPTY
  );
  const [photo, setPhoto] = useState<File | null>(null);

  const set = <K extends keyof TeamMemberPayload>(key: K) => (value: TeamMemberPayload[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();

    // Blank is not the same as absent to the server's schema — an empty string
    // fails the url() check on the social fields, where undefined passes.
    const payload: TeamMemberPayload = {
      ...values,
      bio: values.bio?.trim() || undefined,
      // Explicit null, not undefined: "no section" is a choice, and on an
      // update undefined would leave the member where they were.
      sectionId: values.sectionId || null,
      email: values.email?.trim() || undefined,
      linkedin: values.linkedin?.trim() || undefined,
      github: values.github?.trim() || undefined,
      website: values.website?.trim() || undefined,
    };

    try {
      if (member) await update.mutateAsync({ id: member.id, payload, photo });
      else await create.mutateAsync({ payload, photo });
      showToast(t.team.saved, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={member ? t.team.editMember : t.team.addMember}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.team.name} htmlFor="name">
            <Input id="name" required value={values.name} onChange={(e) => set('name')(e.target.value)} />
          </FormField>
          <FormField label={t.team.role} htmlFor="title">
            <Input id="title" required value={values.title} onChange={(e) => set('title')(e.target.value)} />
          </FormField>
        </div>

        <FormField label={t.team.group} htmlFor="section">
          <Select
            id="section"
            value={values.sectionId ?? ''}
            onChange={(e) => set('sectionId')(e.target.value || null)}
          >
            <option value="">{t.team.noSection}</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t.team.bio} htmlFor="bio">
          <TextArea id="bio" rows={4} value={values.bio} onChange={(e) => set('bio')(e.target.value)} />
        </FormField>

        <FormField
          label={t.team.photo}
          htmlFor="photo"
          hint={member?.photoUrl ? t.team.photoReplaceHint : t.team.photoHint}
        >
          <Input
            id="photo"
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.team.emailLabel} htmlFor="email">
            <Input id="email" type="email" className="ltr" value={values.email} onChange={(e) => set('email')(e.target.value)} />
          </FormField>
          <FormField label="LinkedIn" htmlFor="linkedin">
            <Input id="linkedin" className="ltr" placeholder="https://" value={values.linkedin} onChange={(e) => set('linkedin')(e.target.value)} />
          </FormField>
          <FormField label="GitHub" htmlFor="github">
            <Input id="github" className="ltr" placeholder="https://" value={values.github} onChange={(e) => set('github')(e.target.value)} />
          </FormField>
          <FormField label={t.team.websiteLabel} htmlFor="website">
            <Input id="website" className="ltr" placeholder="https://" value={values.website} onChange={(e) => set('website')(e.target.value)} />
          </FormField>
        </div>

        <label className="flex items-center gap-2 text-body text-app-text-3">
          <input
            type="checkbox"
            className="size-4 rounded border-app-border"
            checked={values.published ?? true}
            onChange={(e) => set('published')(e.target.checked)}
          />
          {t.team.publishedHint}
        </label>

        <div className="flex gap-2">
          <Button type="submit" isLoading={create.isPending || update.isPending}>
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
