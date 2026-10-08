import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileLock2,
  FileText,
  Hourglass,
  Lock,
  Mail,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Share2,
  Trash2,
  Wallet,
  XCircle,
  Zap,
  Star,
} from 'lucide-react';
import {
  useDeclineInvite,
  usePlaceBidV2,
  usePriceGuide,
  useProjectPublic,
  useProjectView,
  useReviseBidV2,
  useSignNda,
  useWithdrawBid,
} from '@/api/work';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate, toLatinDigits } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { categoryName, daysUntil, fill, formatNumber } from '@/lib/jobFormat';
import { agoText, amountText, budgetText, money } from '@/lib/workFormat';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FilePreview } from '@/components/ui/FilePreview';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea as Textarea } from '@/components/ui/TextArea';
import {
  ActivityPanel,
  ClientPanel,
  ProjectTerms,
  SaveProjectButton,
} from '@/components/work/WorkUi';
import type { BidPayloadV2, PriceGuide, ProjectDetail, ProposedMilestone } from '@/types/work';

/**
 * One project, second generation.
 *
 * Signed out it reads the public, cached copy; signed in it reads the copy
 * that knows who is asking — members-only and invite-only briefs, the NDA,
 * an invitation, the reader's own proposal and how well they match.
 *
 * Laid out like Upwork's job page: the brief and its terms on the left, the
 * action and the two trust panels (about the client, activity) on the right.
 */
export default function ProjectPage() {
  const { code } = useParams<{ code: string }>();
  const { t } = useLocale();
  const { user } = useAuth();
  const location = useLocation();
  const signedIn = Boolean(user);
  const view = useProjectView(code, signedIn);
  const publicRead = useProjectPublic(code, !signedIn);
  const query = signedIn ? view : publicRead;
  const project = query.data;

  useDocumentTitle(project?.title ?? t.work.boardTitle, {
    description: project ? (project.excerpt ?? project.description.slice(0, 160)) : t.work.boardSubtitle,
  });

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <p className="text-text-secondary">{t.errors.notFoundBody}</p>
        {/* A members-only brief answers 404 to the public read: offer the sign-in that may open it. */}
        {!signedIn && (
          <Link to="/login" state={{ from: { pathname: location.pathname } }} className="mt-4 inline-block">
            <Button>{t.nav.login}</Button>
          </Link>
        )}
        <Link to="/projects" className="mt-4 block text-brand-green-600 hover:underline">
          {t.work.boardTitle}
        </Link>
      </div>
    );
  }

  return <ProjectBody project={project} />;
}

function ProjectBody({ project }: { project: ProjectDetail }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const viewer = project.viewer;
  const [preview, setPreview] = useState<{ id: string; name: string } | null>(null);
  const left = daysUntil(project.closesAt);
  const closed = project.closesAt ? new Date(project.closesAt).getTime() <= Date.now() : false;
  const matched = new Set((viewer?.match.matched ?? []).map((skill) => skill.toLowerCase()));

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: project.title, url });
      else {
        await navigator.clipboard.writeText(url);
        showToast(t.work.linkCopied, 'success');
      }
    } catch {
      // Dismissed share sheets are not errors.
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-text-tertiary" aria-label={t.common.back}>
        <Link to="/projects" className="hover:text-text-primary hover:underline">
          {t.work.boardTitle}
        </Link>
        {project.workCategory && (
          <>
            {' / '}
            <span>{categoryName(project.workCategory, locale)}</span>
          </>
        )}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="flex min-w-0 flex-col gap-6">
          <header className="rounded-2xl border border-border-default bg-surface-default p-5">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {project.urgent && (
                <Badge variant="danger">
                  <Zap className="size-3" aria-hidden="true" />
                  {t.work.urgent}
                </Badge>
              )}
              {project.featured && (
                <Badge variant="warning">
                  <Star className="size-3" aria-hidden="true" />
                  {t.work.featured}
                </Badge>
              )}
              {project.nda && (
                <Badge>
                  <FileLock2 className="size-3" aria-hidden="true" />
                  {t.work.nda}
                </Badge>
              )}
              {project.contractToHire && <Badge variant="success">{t.work.contractToHire}</Badge>}
              {project.visibility && project.visibility !== 'PUBLIC' && <Badge variant="info">{t.work.visibility[project.visibility]}</Badge>}
            </div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-text-primary">{project.title}</h1>
              <div className="flex shrink-0 gap-1">
                <SaveProjectButton projectId={project.id} />
                <button
                  type="button"
                  onClick={() => void share()}
                  className="rounded-lg p-2 text-text-secondary hover:bg-surface-muted"
                  aria-label={t.work.share}
                  title={t.work.share}
                >
                  <Share2 className="size-5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
              <span className="flex items-center gap-1 text-base font-semibold text-text-primary">
                <Wallet className="size-4 text-text-tertiary" aria-hidden="true" />
                {budgetText(project, locale, t)}
              </span>
              {project.publishedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="size-4 text-text-tertiary" aria-hidden="true" />
                  {fill(t.work.postedAgo, { ago: agoText(project.publishedAt, locale, t) })}
                </span>
              )}
              {project.closesAt && (
                <span className={cn('flex items-center gap-1', (closed || (left ?? 99) <= 2) && 'text-brand-red-600')}>
                  <Hourglass className="size-4" aria-hidden="true" />
                  {closed
                    ? t.work.closed
                    : left === 0
                      ? t.work.closesToday
                      : fill(t.work.closesIn, { days: formatNumber(left ?? 0, locale) })}
                </span>
              )}
              <span className="text-text-tertiary">{fill(t.work.views, { count: formatNumber(project.viewCount, locale) })}</span>
              <span className="text-text-tertiary">#{project.code}</span>
            </p>
          </header>

          <section className="rounded-2xl border border-border-default bg-surface-default p-5">
            <ProjectTerms project={project} />
          </section>

          <section className="rounded-2xl border border-border-default bg-surface-default p-5" aria-labelledby="brief">
            <h2 id="brief" className="mb-3 text-lg font-semibold text-text-primary">
              {t.market.description}
            </h2>
            {project.description ? (
              <div className="whitespace-pre-line leading-relaxed text-text-secondary">{project.description}</div>
            ) : (
              <NdaGate project={project} />
            )}

            {project.attachmentCount > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-medium text-text-primary">{t.market.attachments}</h3>
                {project.attachments.length > 0 ? (
                  viewer ? (
                    <ul className="flex flex-wrap gap-2">
                      {project.attachments.map((file) => (
                        <li key={file.id}>
                          <button
                            type="button"
                            onClick={() => setPreview({ id: file.id, name: file.originalName })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-muted"
                          >
                            <Paperclip className="size-4" aria-hidden="true" />
                            {file.originalName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-text-tertiary">
                      <Paperclip className="me-1 inline size-4" aria-hidden="true" />
                      {formatNumber(project.attachmentCount, locale)} · {t.work.signInToBid}
                    </p>
                  )
                ) : (
                  <p className="flex items-center gap-1.5 text-sm text-text-tertiary">
                    <Lock className="size-4" aria-hidden="true" />
                    {fill(t.work.attachmentsLocked, { count: formatNumber(project.attachmentCount, locale) })}
                  </p>
                )}
              </div>
            )}
          </section>

          {project.skills.length > 0 && (
            <section className="rounded-2xl border border-border-default bg-surface-default p-5" aria-labelledby="skills">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="skills" className="text-lg font-semibold text-text-primary">
                  {t.work.skillsRequired}
                </h2>
                {viewer && viewer.match.matched.length > 0 && !viewer.isAuthor && (
                  <span className="flex items-center gap-1 text-sm text-brand-green-700 dark:text-brand-green-400">
                    <BadgeCheck className="size-4" aria-hidden="true" />
                    {fill(t.work.yourMatch, {
                      matched: formatNumber(viewer.match.matched.length, locale),
                      total: formatNumber(viewer.match.total, locale),
                    })}
                  </span>
                )}
              </div>
              <ul className="flex flex-wrap gap-2">
                {project.skills.map((skill) => (
                  <li
                    key={skill}
                    className={cn(
                      'rounded-full px-3 py-1 text-sm',
                      matched.has(skill.toLowerCase())
                        ? 'bg-brand-green-50 text-brand-green-800 ring-1 ring-brand-green-200 dark:bg-brand-green-900/30 dark:text-brand-green-300 dark:ring-brand-green-800'
                        : 'bg-surface-muted text-text-secondary',
                    )}
                  >
                    {matched.has(skill.toLowerCase()) && <CheckCircle2 className="me-1 inline size-3.5" aria-hidden="true" />}
                    {skill}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {project.screeningQuestions.length > 0 && (
            <section className="rounded-2xl border border-border-default bg-surface-default p-5" aria-labelledby="questions">
              <h2 id="questions" className="mb-3 text-lg font-semibold text-text-primary">
                {t.work.screeningQuestions}
              </h2>
              <ol className="flex list-decimal flex-col gap-1.5 ps-5 text-sm text-text-secondary">
                {project.screeningQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ol>
            </section>
          )}

          {viewer && !viewer.isAuthor && (viewer.canBid || viewer.myBid) && (
            <ProposalSection project={project} />
          )}

          {project.similar && project.similar.length > 0 && (
            <section aria-labelledby="similar">
              <h2 id="similar" className="mb-3 text-lg font-semibold text-text-primary">
                {t.work.similarProjects}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {project.similar.map((item) => (
                  <li key={item.code}>
                    <Link
                      to={`/projects/${item.code}`}
                      className="flex h-full flex-col gap-1 rounded-xl border border-border-default bg-surface-default p-3 hover:border-border-strong"
                    >
                      <span className="font-medium text-text-primary">{item.title}</span>
                      <span className="text-sm text-text-secondary">{budgetText(item, locale, t)}</span>
                      <span className="text-xs text-text-tertiary">
                        {fill(t.work.proposalsCount, { count: formatNumber(item._count.bids, locale) })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <ActionBox project={project} />
          {project.client && <ClientPanel client={project.client} companyName={project.companyName} />}
          {project.activity && <ActivityPanel activity={project.activity} currency={project.currency} />}
        </aside>
      </div>

      {preview && (
        <FilePreview
          url={`/work/me/project-attachments/${preview.id}`}
          filename={preview.name}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

/** The one thing to do next, whoever is reading. */
function ActionBox({ project }: { project: ProjectDetail }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const location = useLocation();
  const viewer = project.viewer;
  const decline = useDeclineInvite();

  const box = 'rounded-2xl border border-border-default bg-surface-default p-4';

  if (!viewer) {
    return (
      <div className={box}>
        <Link to="/login" state={{ from: { pathname: location.pathname } }}>
          <Button className="w-full">
            <Send className="size-4" aria-hidden="true" />
            {t.work.signInToBid}
          </Button>
        </Link>
      </div>
    );
  }

  if (viewer.isAuthor) {
    return (
      <div className={box}>
        <p className="mb-3 text-sm text-text-secondary">{t.work.ownProjectNote}</p>
        <Link to={`/dashboard/projects?open=${project.id}`}>
          <Button className="w-full">
            <MessageSquare className="size-4" aria-hidden="true" />
            {t.work.manageProposals}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={cn(box, 'flex flex-col gap-3')}>
      {viewer.invite && viewer.invite.status === 'PENDING' && !viewer.myBid && (
        <div className="rounded-xl bg-brand-green-50 p-3 text-sm text-brand-green-900 dark:bg-brand-green-900/30 dark:text-brand-green-200">
          <p className="flex items-center gap-1.5 font-medium">
            <Mail className="size-4" aria-hidden="true" />
            {t.work.invitedToBid}
          </p>
          {viewer.invite.message && <p className="mt-1 whitespace-pre-line">{viewer.invite.message}</p>}
          <button
            type="button"
            className="mt-2 text-xs underline"
            onClick={() =>
              decline.mutate(viewer.invite!.id, {
                onSuccess: () => showToast(t.work.inviteDeclined, 'success'),
                onError: (error) => showToast(apiMessage(error, t.common.error), 'error'),
              })
            }
          >
            {t.work.declineInvite}
          </button>
        </div>
      )}

      {viewer.myBid ? (
        <div className="flex flex-col gap-1.5 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-text-primary">
            <CheckCircle2 className="size-4 text-brand-green-600" aria-hidden="true" />
            {t.work.bidSentBadge} · {t.work.bidStage[viewer.myBid.outcome]}
          </p>
          <p className="text-text-secondary">
            {amountText(viewer.myBid.amount, viewer.myBid.currency, project.pricingType, locale, t)}
            {viewer.myBid.deliveryDays && ` · ${fill(t.work.daysCount, { count: formatNumber(viewer.myBid.deliveryDays, locale) })}`}
          </p>
          <p className="text-xs text-text-tertiary">{viewer.myBid.clientSeenAt ? t.work.seenByClient : t.work.notSeenYet}</p>
          <a href="#proposal" className="text-brand-green-600 hover:underline">
            {t.work.editProposal}
          </a>
        </div>
      ) : viewer.canBid ? (
        project.nda && !viewer.briefOpen ? (
          <a href="#brief">
            <Button className="w-full">
              <FileLock2 className="size-4" aria-hidden="true" />
              {t.work.ndaSign}
            </Button>
          </a>
        ) : (
          <a href="#proposal">
            <Button className="w-full">
              <Send className="size-4" aria-hidden="true" />
              {t.work.sendProposal}
            </Button>
          </a>
        )
      ) : (
        <p className="flex items-center gap-1.5 text-sm text-text-secondary">
          <XCircle className="size-4" aria-hidden="true" />
          {t.work.biddingUnavailable}
        </p>
      )}

      <SaveProjectButton projectId={project.id} withLabel className="justify-center border border-border-default" />
    </div>
  );
}

/** The NDA in place of the brief, with the form to sign it. */
function NdaGate({ project }: { project: ProjectDetail }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const location = useLocation();
  const sign = useSignNda();
  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await sign.mutateAsync({ projectId: project.id, signedName: name.trim() });
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-border-default p-4">
      <p className="mb-2 flex items-center gap-2 font-medium text-text-primary">
        <Lock className="size-4" aria-hidden="true" />
        {t.work.briefLocked}
      </p>
      {!project.viewer ? (
        <Link to="/login" state={{ from: { pathname: location.pathname } }}>
          <Button size="sm">{t.work.signInToBid}</Button>
        </Link>
      ) : project.viewer.ndaSigned ? (
        <p className="text-sm text-text-secondary">
          {fill(t.work.ndaSigned, { date: formatDate(project.viewer.ndaSigned.signedAt, locale) })}
        </p>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <h3 className="font-semibold text-text-primary">{t.work.ndaTitle}</h3>
          <p className="text-sm leading-relaxed text-text-secondary">{t.work.ndaBody}</p>
          <FormField label={t.work.ndaSignedName} htmlFor="nda-name">
            <Input id="nda-name" required minLength={3} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" className="size-4 rounded border-border-default" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            {t.work.ndaAccept}
          </label>
          <Button type="submit" disabled={!accepted || name.trim().length < 3} isLoading={sign.isPending} className="self-start">
            <FileText className="size-4" aria-hidden="true" />
            {t.work.ndaSign}
          </Button>
        </form>
      )}
    </div>
  );
}

const digits = (value: string) => toLatinDigits(value).replace(/[^0-9]/g, '');

/**
 * Writing or revising a proposal: price, delivery, letter, a milestone plan on
 * fixed-price work, the client's screening questions — and the price guide
 * beside it, which is where the platform says "this looks low" while the
 * number can still change.
 */
function ProposalSection({ project }: { project: ProjectDetail }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const viewer = project.viewer!;
  const existing = viewer.myBid;
  const hourly = project.pricingType === 'HOURLY';
  const place = usePlaceBidV2();
  const revise = useReviseBidV2();
  const withdraw = useWithdrawBid();
  const guide = usePriceGuide(project.id, viewer.briefOpen);
  const editable = !existing || ['PENDING', 'SHORTLISTED', 'INTERVIEW'].includes(existing.outcome);

  const [amount, setAmount] = useState(existing?.amount ?? '');
  const [days, setDays] = useState(existing?.deliveryDays ? String(existing.deliveryDays) : '');
  const [message, setMessage] = useState(existing?.message ?? '');
  const [planMode, setPlanMode] = useState<'whole' | 'milestones'>(existing?.milestones?.length ? 'milestones' : 'whole');
  const [plan, setPlan] = useState<ProposedMilestone[]>(existing?.milestones ?? [{ title: '', amount: '', days: 7 }]);
  const [answers, setAnswers] = useState<string[]>(
    project.screeningQuestions.map((_, index) => existing?.screeningAnswers[index] ?? ''),
  );
  const [file, setFile] = useState<File | null>(null);

  // Keep the form in step with a proposal that arrives after first render.
  useEffect(() => {
    if (!existing) return;
    setAmount(existing.amount);
    setMessage(existing.message);
  }, [existing]);

  const planTotal = plan.reduce((sum, step) => sum + BigInt(digits(step.amount) || '0'), 0n);
  const amountValue = digits(amount);
  const mismatch = planMode === 'milestones' && amountValue !== '' && planTotal !== BigInt(amountValue);

  if (!viewer.briefOpen) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (project.screeningQuestions.length > 0 && answers.some((answer) => !answer.trim())) {
      showToast(t.work.answerAll, 'error');
      return;
    }
    const payload: BidPayloadV2 = {
      amount: amountValue,
      deliveryDays: hourly || !days ? undefined : Number(digits(days)),
      message: message.trim(),
      milestones:
        !hourly && planMode === 'milestones'
          ? plan.map((step) => ({ title: step.title.trim(), amount: digits(step.amount), days: Number(step.days) }))
          : undefined,
      screeningAnswers: project.screeningQuestions.length > 0 ? answers.map((answer) => answer.trim()) : undefined,
    };
    try {
      if (existing) {
        await revise.mutateAsync({ id: existing.id, payload });
        showToast(t.work.proposalUpdated, 'success');
      } else {
        await place.mutateAsync({ projectId: project.id, payload, attachment: file });
        showToast(t.work.proposalSent, 'success');
      }
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <section id="proposal" className="scroll-mt-24 rounded-2xl border border-border-default bg-surface-default p-5" aria-labelledby="proposal-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="proposal-heading" className="text-lg font-semibold text-text-primary">
          {existing ? t.work.yourProposal : t.work.sendProposal}
        </h2>
        {existing && <Badge variant="info">{t.work.bidStage[existing.outcome]}</Badge>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <fieldset disabled={!editable} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={hourly ? t.work.bidAmountHourly : t.work.bidAmountFixed} htmlFor="bid-amount">
                <div className="flex items-center gap-2">
                  <Input
                    id="bid-amount"
                    required
                    inputMode="numeric"
                    className="ltr"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span className="shrink-0 text-sm text-text-tertiary">
                    {project.currency === 'IRT' ? t.market.currency : project.currency}
                    {hourly && ` ${t.work.perHour}`}
                  </span>
                </div>
                {amountValue && (
                  <p className="mt-1 text-xs text-text-tertiary">{money(amountValue, project.currency, locale, t)}</p>
                )}
              </FormField>
              {!hourly && (
                <FormField label={t.work.deliveryDays} htmlFor="bid-days">
                  <Input id="bid-days" inputMode="numeric" className="ltr" value={days} onChange={(e) => setDays(e.target.value)} />
                </FormField>
              )}
            </div>

            {!hourly && (
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-sm font-medium text-text-primary">{t.work.milestonePlan}</legend>
                <div className="flex gap-4 text-sm text-text-secondary">
                  {(['whole', 'milestones'] as const).map((mode) => (
                    <label key={mode} className="flex items-center gap-2">
                      <input type="radio" name="plan-mode" checked={planMode === mode} onChange={() => setPlanMode(mode)} />
                      {mode === 'whole' ? t.work.wholeProject : t.work.byMilestone}
                    </label>
                  ))}
                </div>
                {planMode === 'milestones' && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-text-tertiary">{t.work.milestonePlanHint}</p>
                    {plan.map((step, index) => (
                      <div key={index} className="grid grid-cols-[1fr_8rem_5rem_auto] items-end gap-2">
                        <Input
                          aria-label={`${t.work.milestoneTitle} ${index + 1}`}
                          placeholder={`${t.work.milestoneTitle} ${formatNumber(index + 1, locale)}`}
                          required
                          value={step.title}
                          onChange={(e) => setPlan(plan.map((row, i) => (i === index ? { ...row, title: e.target.value } : row)))}
                        />
                        <Input
                          aria-label={t.work.milestoneAmount}
                          placeholder={t.work.milestoneAmount}
                          inputMode="numeric"
                          className="ltr"
                          required
                          value={step.amount}
                          onChange={(e) => setPlan(plan.map((row, i) => (i === index ? { ...row, amount: e.target.value } : row)))}
                        />
                        <Input
                          aria-label={t.work.milestoneDays}
                          placeholder={t.work.milestoneDays}
                          type="number"
                          min={1}
                          className="ltr"
                          value={step.days}
                          onChange={(e) => setPlan(plan.map((row, i) => (i === index ? { ...row, days: Number(e.target.value) } : row)))}
                        />
                        <button
                          type="button"
                          className="rounded-lg p-2 text-text-tertiary hover:bg-surface-muted disabled:opacity-40"
                          disabled={plan.length === 1}
                          aria-label={t.common.delete}
                          onClick={() => setPlan(plan.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={plan.length >= 10}
                        onClick={() => setPlan([...plan, { title: '', amount: '', days: 7 }])}
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        {t.work.addMilestone}
                      </Button>
                      <span className={cn('text-xs', mismatch ? 'text-brand-red-600' : 'text-text-tertiary')}>
                        {mismatch
                          ? fill(t.work.milestoneMismatch, {
                              total: money(planTotal.toString(), project.currency, locale, t) ?? '0',
                              amount: money(amountValue, project.currency, locale, t) ?? '0',
                            })
                          : fill(t.work.milestoneTotal, { total: money(planTotal.toString(), project.currency, locale, t) ?? '0' })}
                      </span>
                    </div>
                  </div>
                )}
              </fieldset>
            )}

            <FormField label={t.work.coverLetter} htmlFor="bid-message" hint={t.work.coverLetterHint}>
              <Textarea id="bid-message" required minLength={20} maxLength={5000} rows={8} value={message} onChange={(e) => setMessage(e.target.value)} />
            </FormField>

            {project.screeningQuestions.length > 0 && (
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-sm font-medium text-text-primary">{t.work.screeningQuestions}</legend>
                {project.screeningQuestions.map((question, index) => (
                  <FormField key={question} label={`${formatNumber(index + 1, locale)}. ${question}`} htmlFor={`answer-${index}`}>
                    <Textarea
                      id={`answer-${index}`}
                      required
                      rows={3}
                      maxLength={2000}
                      value={answers[index]}
                      onChange={(e) => setAnswers(answers.map((answer, i) => (i === index ? e.target.value : answer)))}
                    />
                  </FormField>
                ))}
              </fieldset>
            )}

            {!existing && (
              <FormField label={t.work.attachment} htmlFor="bid-file">
                <input
                  id="bid-file"
                  type="file"
                  className="text-sm text-text-secondary file:me-3 file:rounded-lg file:border-0 file:bg-surface-muted file:px-3 file:py-1.5"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </FormField>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" isLoading={place.isPending || revise.isPending} disabled={mismatch}>
                <Send className="size-4" aria-hidden="true" />
                {existing ? t.common.save : t.work.sendProposal}
              </Button>
              {existing && (
                <Button
                  type="button"
                  variant="ghost"
                  isLoading={withdraw.isPending}
                  onClick={() => {
                    if (!window.confirm(t.work.withdrawConfirm)) return;
                    withdraw.mutate(existing.id, {
                      onSuccess: () => showToast(t.work.proposalWithdrawn, 'success'),
                      onError: (error) => showToast(apiMessage(error, t.common.error), 'error'),
                    });
                  }}
                >
                  {t.work.withdraw}
                </Button>
              )}
            </div>
          </fieldset>
        </form>

        {guide.data && (
          <div className="self-start">
            <PriceGuidePanel guide={guide.data} amount={amountValue} />
          </div>
        )}
      </div>
    </section>
  );
}

function PriceGuidePanel({ guide, amount }: { guide: PriceGuide; amount: string }) {
  const { t, locale } = useLocale();
  const value = amount ? BigInt(amount) : null;
  const hourly = guide.pricingType === 'HOURLY';
  const show = (text: string | null) => (text ? (hourly ? `${text} ${t.work.perHour}` : text) : '—');
  const budgetMin = guide.budget?.min ? BigInt(guide.budget.min) : null;
  const budgetMax = guide.budget?.max ? BigInt(guide.budget.max) : null;
  const low = guide.market ? BigInt(guide.market.low) : null;

  const hint = useMemo(() => {
    if (value === null) return null;
    if (low !== null && value < low) return { tone: 'warning' as const, text: t.work.lowForMarket };
    if (budgetMax !== null && value > budgetMax) return { tone: 'warning' as const, text: t.work.aboveBudget };
    if (budgetMin !== null && value < budgetMin) return { tone: 'info' as const, text: t.work.belowBudget };
    return null;
  }, [value, low, budgetMin, budgetMax, t]);

  return (
    <aside className="flex flex-col gap-3 rounded-xl bg-surface-muted p-4 text-sm" aria-label={t.work.priceGuide}>
      <h3 className="flex items-center gap-1.5 font-semibold text-text-primary">
        <Wallet className="size-4" aria-hidden="true" />
        {t.work.priceGuide}
      </h3>
      <div>
        <p className="text-text-tertiary">{t.work.clientBudget}</p>
        <p className="font-medium text-text-primary">
          {guide.budget
            ? [money(guide.budget.min, guide.currency, locale, t), money(guide.budget.max, guide.currency, locale, t)]
                .filter(Boolean)
                .map((part) => show(part))
                .join(` ${t.market.to} `)
            : t.work.budgetUnknown}
        </p>
      </div>
      <div>
        <p className="text-text-tertiary">{t.work.marketRange}</p>
        {guide.market ? (
          <>
            <p className="font-medium text-text-primary">
              {show(money(guide.market.low, guide.currency, locale, t))} {t.market.to}{' '}
              {show(money(guide.market.high, guide.currency, locale, t))}
            </p>
            <p className="text-xs text-text-tertiary">
              {fill(t.work.marketMedian, { amount: show(money(guide.market.median, guide.currency, locale, t)) })} ·{' '}
              {fill(t.work.marketSample, { count: formatNumber(guide.market.sample, locale) })}
            </p>
          </>
        ) : (
          <p className="text-xs text-text-tertiary">{t.work.noMarketData}</p>
        )}
      </div>
      {hint && (
        <p
          className={cn(
            'rounded-lg p-2 text-xs',
            hint.tone === 'warning'
              ? 'bg-brand-amber-50 text-brand-amber-900 dark:bg-brand-amber-900/30 dark:text-brand-amber-200'
              : 'bg-brand-green-50 text-brand-green-900 dark:bg-brand-green-900/30 dark:text-brand-green-200',
          )}
        >
          {hint.text}
        </p>
      )}
      <Link to="/freelancers" className="inline-flex items-center gap-1 text-xs text-brand-green-600 hover:underline">
        {t.work.talentTitle}
        <ArrowRight className="size-3 rtl:rotate-180" aria-hidden="true" />
      </Link>
    </aside>
  );
}

