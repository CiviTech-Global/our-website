import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { UserPlus } from 'lucide-react';
import { useInviteFreelancer, useOwnProjectsV2 } from '@/api/work';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { apiMessage } from '@/lib/apiMessage';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';

/** Invite one freelancer to one of the reader's open projects. */
export function InviteModal({
  username,
  projectId,
  onClose,
}: {
  username?: string;
  projectId?: string;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { user } = useAuth();
  const location = useLocation();
  const { showToast } = useToast();
  const invite = useInviteFreelancer();
  const { data: projects } = useOwnProjectsV2(Boolean(user) && !projectId);
  const open = (projects ?? []).filter((project) => project.moderationStatus === 'APPROVED' && project.state === 'OPEN');
  const [chosen, setChosen] = useState(projectId ?? '');
  const [handle, setHandle] = useState(username ?? '');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await invite.mutateAsync({ projectId: chosen, username: handle.trim().replace(/^@/, ''), message: message.trim() || undefined });
      showToast(t.work.inviteSent, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t.work.inviteToProject}>
      {!user ? (
        <Link to="/login" state={{ from: { pathname: location.pathname } }}>
          <Button>{t.nav.login}</Button>
        </Link>
      ) : !projectId && open.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-text-secondary">{t.work.noOpenProjects}</p>
          <Link to="/dashboard/projects/new">
            <Button>{t.work.postProject}</Button>
          </Link>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          {!projectId && (
            <FormField label={t.work.chooseProject} htmlFor="invite-project">
              <Select id="invite-project" required value={chosen} onChange={(e) => setChosen(e.target.value)}>
                <option value="">—</option>
                {open.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          {!username && (
            <FormField label={t.work.inviteByUsername} htmlFor="invite-username">
              <Input id="invite-username" required className="ltr" value={handle} onChange={(e) => setHandle(e.target.value)} />
            </FormField>
          )}
          <FormField label={t.work.inviteMessage} htmlFor="invite-message">
            <TextArea id="invite-message" rows={4} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
          </FormField>
          <Button type="submit" isLoading={invite.isPending} disabled={!chosen || !handle.trim()}>
            <UserPlus className="size-4" aria-hidden="true" />
            {t.work.invite}
          </Button>
        </form>
      )}
    </Modal>
  );
}
