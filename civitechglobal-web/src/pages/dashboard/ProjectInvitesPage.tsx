import { Link } from 'react-router';
import { Send, XCircle } from 'lucide-react';
import { useDeclineInvite, useMyInvites } from '@/api/work';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { agoText } from '@/lib/workFormat';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { ProjectCard } from '@/components/work/WorkUi';

/** Invitations to bid: each project's card, the client's message, and the two answers. */
export default function ProjectInvitesPage() {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const { data, isLoading } = useMyInvites();
  const decline = useDeclineInvite();
  useDocumentTitle(t.work.navInvites);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.work.navInvites} description={t.work.invitesIntro} />
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}
      {!isLoading && data?.length === 0 && <EmptyState title={t.work.invitesEmpty} />}
      <ul className="flex flex-col gap-3">
        {data?.map((invite) => (
          <ProjectCard
            key={invite.id}
            project={invite.project}
            footer={
              <div className="flex flex-col gap-2">
                {invite.message && <p className="whitespace-pre-line text-text-secondary">“{invite.message}”</p>}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs text-text-tertiary">
                    <Badge variant={invite.status === 'ACCEPTED' ? 'success' : invite.status === 'DECLINED' ? 'danger' : 'info'}>
                      {t.work.inviteStatus[invite.status]}
                    </Badge>
                    {agoText(invite.createdAt, locale, t)}
                  </span>
                  {invite.status === 'PENDING' && invite.project.state === 'OPEN' && (
                    <div className="flex gap-2">
                      <Link to={`/projects/${invite.project.code}#proposal`}>
                        <Button size="sm">
                          <Send className="size-4" aria-hidden="true" />
                          {t.work.sendProposal}
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        isLoading={decline.isPending}
                        onClick={() =>
                          decline.mutate(invite.id, {
                            onSuccess: () => showToast(t.work.inviteDeclined, 'success'),
                            onError: (error) => showToast(apiMessage(error, t.common.error), 'error'),
                          })
                        }
                      >
                        <XCircle className="size-4" aria-hidden="true" />
                        {t.work.declineInvite}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            }
          />
        ))}
      </ul>
    </div>
  );
}
