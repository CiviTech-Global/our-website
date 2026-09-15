import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import {
  photoSrc,
  useAdminTeam,
  useCreateMember,
  useDeleteMember,
  useReorderTeam,
  useUpdateMember,
  type AdminTeamMember,
  type TeamMemberPayload,
} from '@/api/team';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';

const EMPTY: TeamMemberPayload = {
  name: '',
  title: '',
  bio: '',
  team: '',
  email: '',
  linkedin: '',
  github: '',
  website: '',
  published: true,
};

/**
 * Who appears on "تیم ما", and in what order.
 *
 * Reordering is by arrows rather than drag-and-drop on purpose: this list is
 * short, edited rarely, and a drag target that must also work on a phone and
 * with a keyboard is a great deal of machinery for moving somebody up one
 * place. The arrows are reachable by tab and announce themselves.
 */
export default function AdminTeamPage() {
  const { t } = useLocale();
  useDocumentTitle(t.team.adminTitle);
  const { showToast } = useToast();

  const { data, isLoading } = useAdminTeam();
  const reorder = useReorderTeam();
  const remove = useDeleteMember();
  const update = useUpdateMember();

  const [editing, setEditing] = useState<AdminTeamMember | 'new' | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  /**
   * A local copy, so a move is visible immediately rather than after a
   * round trip. It follows the server whenever the server speaks.
   */
  const [order, setOrder] = useState<AdminTeamMember[]>([]);
  useEffect(() => {
    if (data) setOrder(data);
  }, [data]);

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;

    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);

    try {
      await reorder.mutateAsync(next.map((m) => m.id));
    } catch (error) {
      // Put it back: leaving the optimistic order on screen would show an
      // arrangement the page does not actually have.
      setOrder(order);
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t.team.adminTitle}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t.team.adminSubtitle}</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden="true" />
          {t.team.addMember}
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && order.length === 0 && <EmptyState title={t.team.empty} />}

      <ul className="flex flex-col gap-3">
        {order.map((member, index) => {
          const src = photoSrc(member.photoUrl);
          return (
            <li key={member.id}>
              <Card className={member.published ? undefined : 'opacity-70'}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={t.team.moveUp}
                      disabled={index === 0 || reorder.isPending}
                      onClick={() => void move(index, -1)}
                    >
                      <ArrowUp className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={t.team.moveDown}
                      disabled={index === order.length - 1 || reorder.isPending}
                      onClick={() => void move(index, 1)}
                    >
                      <ArrowDown className="size-4" aria-hidden="true" />
                    </Button>
                  </div>

                  {src ? (
                    <img
                      src={src}
                      alt={member.name}
                      className="size-14 shrink-0 rounded-full border border-border-default object-cover"
                    />
                  ) : (
                    <div
                      className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border-default bg-surface-200"
                      aria-hidden="true"
                    >
                      <UserRound className="size-6 text-text-muted" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-primary">{member.name}</p>
                    <p className="text-sm text-text-secondary">{member.title}</p>
                    {member.team && <p className="mt-0.5 text-xs text-text-muted">{member.team}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={member.published ? 'success' : 'default'}>
                      {member.published ? t.team.published : t.team.hidden}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={member.published ? t.team.hide : t.team.publish}
                      onClick={() =>
                        void (async () => {
                          try {
                            // Only the flag: sending the whole member would
                            // resubmit every field, and a partial PATCH is
                            // what the route expects.
                            await update.mutateAsync({
                              id: member.id,
                              payload: { published: !member.published },
                            });
                          } catch (error) {
                            showToast(apiMessage(error, t.common.error), 'error');
                          }
                        })()
                      }
                    >
                      {member.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(member)}>
                      <Pencil className="size-4" aria-hidden="true" />
                      {t.common.edit}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={t.common.delete}
                      onClick={() => setConfirming(member.id)}
                    >
                      <Trash2 className="size-4 text-brand-red-500" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                {confirming === member.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-default pt-3">
                    <p className="text-sm text-text-secondary">{t.team.deleteConfirm}</p>
                    <Button
                      size="sm"
                      variant="danger"
                      isLoading={remove.isPending}
                      onClick={() =>
                        void (async () => {
                          try {
                            await remove.mutateAsync(member.id);
                            setConfirming(null);
                          } catch (error) {
                            showToast(apiMessage(error, t.common.error), 'error');
                          }
                        })()
                      }
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
          );
        })}
      </ul>

      {editing && (
        <MemberForm
          member={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function MemberForm({ member, onClose }: { member: AdminTeamMember | null; onClose: () => void }) {
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
          team: member.team ?? '',
          email: member.email ?? '',
          linkedin: member.linkedin ?? '',
          github: member.github ?? '',
          website: member.website ?? '',
          published: member.published,
        }
      : EMPTY,
  );
  const [photo, setPhoto] = useState<File | null>(null);

  const set = (key: keyof TeamMemberPayload) => (value: string | boolean) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();

    // Blank is not the same as absent to the server's schema — an empty string
    // fails the url() check on the social fields, where undefined passes.
    const payload: TeamMemberPayload = {
      ...values,
      bio: values.bio?.trim() || undefined,
      team: values.team?.trim() || undefined,
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

        <FormField label={t.team.group} htmlFor="team" hint={t.team.groupHint}>
          <Input id="team" value={values.team} onChange={(e) => set('team')(e.target.value)} />
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

        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            className="size-4 rounded border-border-strong"
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
