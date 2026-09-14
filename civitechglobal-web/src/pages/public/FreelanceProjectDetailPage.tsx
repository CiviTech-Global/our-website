import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Building2, Paperclip, ShieldCheck, Users } from 'lucide-react';
import { useOwnVerification, usePlaceBid, usePublicProject } from '@/api/marketplace';
import { useAuth } from '@/contexts/AuthProvider';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { formatRange } from '@/lib/marketplace';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { AuthorCard } from '@/components/marketplace/AuthorCard';
import { ListingStats } from '@/components/marketplace/ListingStats';
import { SimilarListings } from '@/components/marketplace/SimilarListings';

/**
 * One project, and the form to bid on it.
 *
 * The bid form says plainly that offers are sealed, because otherwise the
 * absence of other numbers reads as "nobody has bid" rather than as a rule.
 */
export default function FreelanceProjectDetailPage() {
  const { code } = useParams<{ code: string }>();
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const { showToast } = useToast();

  const { data: project, isLoading, isError } = usePublicProject(code);
  const { data: verification } = useOwnVerification(Boolean(user));
  const placeBid = usePlaceBid();

  const [amount, setAmount] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  useDocumentTitle(project?.title ?? t.market.projectsTitle);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <p className="text-text-secondary">{t.errors.notFoundBody}</p>
        <Link to="/projects" className="mt-4 inline-block text-brand-green-600 hover:underline">
          {t.market.backToProjects}
        </Link>
      </div>
    );
  }

  const budget = project.budgetUnknown
    ? t.market.budgetUnknown
    : formatRange(project.budgetMin, project.budgetMax, locale, t);
  const isVerified = verification?.status === 'APPROVED';
  const bidCount = locale === 'fa' ? toPersianDigits(project._count.bids) : project._count.bids;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!project) return;

    try {
      await placeBid.mutateAsync({
        projectId: project.id,
        payload: {
          amount: amount.replace(/[^0-9]/g, ''),
          deliveryDays: deliveryDays ? Number(deliveryDays) : undefined,
          message: message.trim(),
        },
      });
      setDone(true);
      showToast(t.market.bidPlaced, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        to="/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t.market.backToProjects}
      </Link>

      <Card>
        <h1 className="text-2xl font-bold text-text-primary">{project.title}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
          {project.companyName && <span>{project.companyName}</span>}
          <span className="flex items-center gap-1.5 text-text-muted">
            <Users className="size-3.5" aria-hidden="true" />
            {bidCount} {t.market.bidCount}
          </span>
          <span className="ltr font-mono text-xs text-text-muted">{project.code}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.category && <Badge>{project.category}</Badge>}
          {budget && <Badge variant="success">{budget}</Badge>}
        </div>

        <div className="mt-3">
          <ListingStats
            views={project.viewCount}
            responses={project._count.bids}
            variant="bids"
            responsesLabel={t.market.bidCount}
          />
        </div>

        <p className="mt-6 whitespace-pre-line leading-7 text-text-primary">{project.description}</p>

        {project.skills.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-medium text-text-secondary">{t.market.skills}</h2>
            <div className="flex flex-wrap gap-1.5">
              {project.skills.map((skill) => (
                <Badge key={skill}>{skill}</Badge>
              ))}
            </div>
          </div>
        )}

        {project.attachments.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-medium text-text-secondary">{t.market.attachments}</h2>
            <ul className="flex flex-col gap-1">
              {project.attachments.map((file) => (
                <li key={file.id} className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <Paperclip className="size-3.5" aria-hidden="true" />
                  {file.originalName}
                </li>
              ))}
            </ul>
          </div>
        )}

        {project.deliverBy && (
          <p className="mt-6 text-sm text-text-muted">
            {t.market.deliverBy}: {formatDate(project.deliverBy, locale)}
          </p>
        )}

        {project.openToCompanyOffer && (
          <p className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
            <Building2 className="size-4 shrink-0" aria-hidden="true" />
            {t.market.openToCompanyOffer}
          </p>
        )}
      </Card>

      {project.authorProfile && (
        <div className="mt-6">
          <AuthorCard profile={project.authorProfile} />
        </div>
      )}

      {project.similar.length > 0 && (
        <div className="mt-6">
          <SimilarListings
            title={t.market.similarProjects}
            basePath="/projects"
            items={project.similar}
          />
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t.market.placeBid}</CardTitle>
        </CardHeader>

        <p className="mb-4 text-sm text-text-muted">{t.market.sealedHint}</p>

        {!user && (
          <Link to="/login">
            <Button variant="outline">{t.market.loginToBid}</Button>
          </Link>
        )}

        {user && !isVerified && (
          <div className="flex flex-col items-start gap-3">
            <p className="flex items-start gap-2 text-sm text-text-secondary">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t.market.verificationRequired}
            </p>
            <Link to="/dashboard/verification">
              <Button variant="outline">{t.market.goToVerification}</Button>
            </Link>
          </div>
        )}

        {user && isVerified && done && (
          <p className="text-sm text-brand-green-600">{t.market.bidPlaced}</p>
        )}

        {user && isVerified && !done && (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={`${t.market.amount} (${t.market.currency})`} htmlFor="amount">
                <Input
                  id="amount"
                  required
                  inputMode="numeric"
                  className="ltr"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </FormField>

              <FormField label={t.market.deliveryDays} htmlFor="deliveryDays">
                <Input
                  id="deliveryDays"
                  type="number"
                  min={1}
                  className="ltr"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                />
              </FormField>
            </div>

            <FormField label={t.market.bidMessage} htmlFor="bidMessage">
              <TextArea
                id="bidMessage"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </FormField>

            <div>
              <Button type="submit" isLoading={placeBid.isPending}>
                {t.market.placeBid}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
