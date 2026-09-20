import { Link } from 'react-router';
import { Github, Globe, Linkedin, MessageCircle, UserRound } from 'lucide-react';
import { expertPhotoSrc, usePublicExperts, type Expert } from '@/api/consult';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { toPersianDigits } from '@/i18n/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

/**
 * The club of experts.
 *
 * A directory that exists to be acted on: every profile that takes
 * consultations carries the way to ask for one, with that person already
 * chosen. A list of impressive people with no next step is a brochure.
 */
export default function ExpertsPage() {
  const { t } = useLocale();
  useDocumentTitle(t.experts.title, { description: t.experts.metaDescription });

  const { data: experts, isLoading } = usePublicExperts();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t.experts.title}</h1>
        <p className="mt-2 text-text-secondary">{t.experts.subtitle}</p>
      </header>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && experts?.length === 0 && <EmptyState title={t.experts.empty} />}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {experts?.map((expert) => (
          <ExpertCard key={expert.id} expert={expert} />
        ))}
      </ul>
    </div>
  );
}

function ExpertCard({ expert }: { expert: Expert }) {
  const { t, locale } = useLocale();
  const years = expert.yearsExperience;

  return (
    <li className="flex h-full flex-col rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start gap-4">
        <div className="size-16 shrink-0 overflow-hidden rounded-full border border-border bg-surface-muted">
          {expert.photoUrl ? (
            <img src={expertPhotoSrc(expert.photoUrl)} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-text-muted">
              <UserRound className="size-7" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <Link
            to={`/experts/${expert.slug}`}
            className="text-lg font-semibold text-text-primary hover:underline"
          >
            {expert.fullName}
          </Link>
          <p className="mt-0.5 text-sm text-text-secondary">{expert.headline}</p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {expert.acceptsConsultations ? (
              <Badge variant="success">{t.experts.takesConsultations}</Badge>
            ) : (
              <Badge>{t.experts.listedOnly}</Badge>
            )}
            {years !== null && years > 0 && (
              <Badge>
                {t.experts.experience.replace(
                  '{years}',
                  locale === 'fa' ? toPersianDigits(years) : String(years),
                )}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {expert.specialities.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-text-muted">{t.experts.specialities}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {expert.specialities.slice(0, 5).map((speciality) => (
              <Badge key={speciality}>{speciality}</Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
        {expert.acceptsConsultations && (
          <Link to={`/consult?expert=${expert.slug}`}>
            <Button size="sm">
              <MessageCircle className="size-4" aria-hidden="true" />
              {t.experts.consultCta}
            </Button>
          </Link>
        )}

        <div className="flex items-center gap-2">
          {expert.linkedinUrl && <ProfileLink href={expert.linkedinUrl} label="LinkedIn" icon={<Linkedin />} />}
          {expert.githubUrl && <ProfileLink href={expert.githubUrl} label="GitHub" icon={<Github />} />}
          {expert.websiteUrl && <ProfileLink href={expert.websiteUrl} label="Website" icon={<Globe />} />}
        </div>
      </div>
    </li>
  );
}

function ProfileLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-lg border border-border-default text-text-secondary transition-colors hover:border-brand-green-500/50 hover:text-brand-green-500 [&_svg]:size-4"
    >
      {icon}
    </a>
  );
}
