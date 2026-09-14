import { Link, useParams } from 'react-router';
import { ArrowLeft, Briefcase, FileText, Globe } from 'lucide-react';
import { usePublicProfile } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate } from '@/i18n/utils';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { RatingStars } from '@/components/marketplace/RatingStars';
import { VerifiedBadge } from '@/components/marketplace/VerifiedBadge';

const ROLE_LABEL_KEYS = {
  employer: 'reviewRoleEmployer',
  applicant: 'reviewRoleApplicant',
  client: 'reviewRoleClient',
  freelancer: 'reviewRoleFreelancer',
} as const;

/**
 * A marketplace member's public face.
 *
 * Rendered only from what the server's profile endpoint considers public:
 * a self-chosen handle, the profile fields, verification state, reputation,
 * live listings and received reviews. No contact details — reaching this
 * person happens through the platform, not around it.
 */
export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { t, locale } = useLocale();
  const { data: profile, isLoading, isError } = usePublicProfile(username);

  useDocumentTitle(profile ? `@${profile.username}` : t.market.publicProfileTitle);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <p className="text-text-secondary">{t.market.profileNotFound}</p>
        <Link to="/" className="mt-4 inline-block text-brand-green-600 hover:underline">
          {t.errors.goHome}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-text-primary">@{profile.username}</h1>
              {profile.verified && <VerifiedBadge />}
            </div>
            {profile.companyName && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
                <Briefcase className="size-3.5" aria-hidden="true" />
                {profile.companyName}
              </p>
            )}
            {profile.headline && <p className="mt-2 text-text-primary">{profile.headline}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-muted">
              <RatingStars avg={profile.ratingAvg} count={profile.ratingCount} />
              <span>
                {t.market.memberSince} {formatDate(profile.joinedAt, locale)}
              </span>
            </div>
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
              >
                <Globe className="size-3.5" aria-hidden="true" />
                {profile.website}
              </a>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 whitespace-pre-line leading-7 text-text-primary">{profile.bio}</p>
        )}
      </Card>

      {(profile.jobs.length > 0 || profile.projects.length > 0) && (
        <Card className="mt-6">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">{t.market.profileListings}</h2>
          <ul className="flex flex-col gap-2">
            {profile.jobs.map((job) => (
              <li key={job.code}>
                <Link
                  to={`/jobs/${job.code}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 p-3 transition-colors hover:border-brand-400 dark:border-surface-300"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Briefcase className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
                    <span className="truncate font-medium text-text-primary">{job.title}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="info">{t.market[job.employmentType]}</Badge>
                    <Badge>{t.market[job.state]}</Badge>
                  </span>
                </Link>
              </li>
            ))}
            {profile.projects.map((project) => (
              <li key={project.code}>
                <Link
                  to={`/projects/${project.code}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 p-3 transition-colors hover:border-brand-400 dark:border-surface-300"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
                    <span className="truncate font-medium text-text-primary">{project.title}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {project.category && <Badge>{project.category}</Badge>}
                    <Badge>{t.market[project.state]}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">{t.market.profileReviews}</h2>
        {profile.reviews.length === 0 ? (
          <p className="text-sm text-text-secondary">{t.market.noReviews}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {profile.reviews.map((review, index) => (
              <li key={`${review.listingCode}-${index}`} className="flex flex-col gap-2 border-b border-surface-200 pb-4 last:border-b-0 last:pb-0 dark:border-surface-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <RatingStars avg={review.rating} count={0} />
                  <span className="text-xs text-text-muted">
                    {t.market[ROLE_LABEL_KEYS[review.role]]}{' '}
                    <Link to={`/${review.role === 'employer' || review.role === 'applicant' ? 'jobs' : 'projects'}/${review.listingCode}`} className="text-brand-600 hover:underline">
                      {review.listingTitle}
                    </Link>{' '}
                    · {formatDate(review.createdAt, locale)}
                  </span>
                </div>
                {review.text && (
                  <p className="whitespace-pre-line text-sm text-text-primary">{review.text}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Link
        to="/jobs"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t.market.backToJobs}
      </Link>
    </div>
  );
}
