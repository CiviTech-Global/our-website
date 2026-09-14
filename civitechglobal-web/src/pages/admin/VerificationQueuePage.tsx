import { useState } from 'react';
import { Eye } from 'lucide-react';
import {
  reviewFileUrls,
  useReviewVerification,
  useVerificationDetail,
  useVerificationQueue,
} from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate } from '@/i18n/utils';
import { verificationVariant } from '@/lib/marketplace';
import { ReviewActions } from '@/components/marketplace/ReviewActions';
import { UserPauseControl } from '@/components/admin/UserPauseControl';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilePreview } from '@/components/ui/FilePreview';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import type { VerificationStatus } from '@/types/marketplace';

const PAGE_SIZE = 20;
const STATUSES: VerificationStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

/**
 * The identity queue.
 *
 * A row is only a name; the decision needs the documents, so the detail is
 * fetched when a row is opened rather than loading every applicant's personal
 * data into a list nobody has asked to see yet.
 */
export default function VerificationQueuePage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.queueVerifications);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<VerificationStatus>('PENDING');
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useVerificationQueue({ page, pageSize: PAGE_SIZE, status });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-primary">{t.market.queueVerifications}</h1>
        <Select
          className="w-auto"
          value={status}
          aria-label={t.market.verificationStatus}
          onChange={(e) => {
            setStatus(e.target.value as VerificationStatus);
            setPage(1);
            setOpenId(null);
          }}
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {t.market[value]}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && <EmptyState title={t.market.emptyQueue} />}

      <ul className="flex flex-col gap-3">
        {data?.items.map((row) => (
          <li key={row.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">
                    {row.legalFirstName} {row.legalLastName}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    <span className="ltr">{row.user.email}</span>
                    {' · '}
                    {formatDate(row.submittedAt, locale)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge>{t.market[row.kind]}</Badge>
                  <Badge variant={verificationVariant(row.status)}>{t.market[row.status]}</Badge>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenId(openId === row.id ? null : row.id)}
                >
                  {openId === row.id ? t.common.close : t.market.review}
                </Button>
                <UserPauseControl userId={row.user.id} paused={row.user.marketplacePaused ?? false} />
              </div>

              {openId === row.id && <VerificationDetailPanel id={row.id} />}
            </Card>
          </li>
        ))}
      </ul>

      {data && data.total > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={Math.ceil(data.total / PAGE_SIZE)}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function VerificationDetailPanel({ id }: { id: string }) {
  const { t, locale } = useLocale();
  const { data, isLoading } = useVerificationDetail(id);
  const review = useReviewVerification();
  const [previewing, setPreviewing] = useState<{ url: string; filename: string } | null>(null);

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-6">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  const rows: Array<[string, string | null]> = [
    [t.market.nationalId, data.nationalId],
    [t.market.phone, data.phone],
    [t.market.birthDate, data.birthDate ? formatDate(data.birthDate, locale) : null],
    [t.market.residenceProvince, data.province],
    [t.market.residenceCity, data.city],
    [t.market.address, data.addressLine],
    [t.market.companyName, data.companyName],
    [t.market.companyRegistrationNo, data.companyRegistrationNo],
    [t.market.companyEconomicCode, data.companyEconomicCode],
    [t.market.companyRole, data.companyRole],
    [t.market.companyWebsite, data.companyWebsite],
  ];

  return (
    <div className="mt-4 border-t border-border-default pt-4">
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows
          .filter(([, value]) => Boolean(value))
          .map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-text-muted">{label}</dt>
              <dd className="text-sm text-text-primary">{value}</dd>
            </div>
          ))}
      </dl>

      {data.documents.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-text-secondary">{t.market.documents}</p>
          <ul className="flex flex-col gap-1.5">
            {data.documents.map((doc) => (
              <li key={doc.id}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setPreviewing({
                      url: reviewFileUrls.verificationDocument(doc.id),
                      filename: doc.originalName,
                    })
                  }
                >
                  <Eye className="size-4" aria-hidden="true" />
                  {t.market[doc.kind]} — {doc.originalName}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ReviewActions
        isPending={review.isPending}
        onReview={(input) => review.mutateAsync({ id, ...input })}
      />

      {previewing && (
        <FilePreview
          url={previewing.url}
          filename={previewing.filename}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  );
}
