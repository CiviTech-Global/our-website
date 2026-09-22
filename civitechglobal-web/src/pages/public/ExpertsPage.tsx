import { useMemo } from 'react';
import { Link } from 'react-router';
import { Github, Globe, Linkedin, MessageCircle, UserRound } from 'lucide-react';
import { expertPhotoSrc, usePublicExperts, type Expert } from '@/api/consult';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useClientList } from '@/lib/clientList';
import { useListControls } from '@/lib/useListControls';
import { toPersianDigits } from '@/i18n/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

const PAGE_SIZE = 12;

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

  const controls = useListControls({ defaultView: 'cards', pageSize: PAGE_SIZE, filters: { speciality: '', consults: '' } });
  const list = useClientList(experts, controls, {
    // A speciality is how somebody actually looks for an expert, so it is
    // searched as well as filtered — typing "Kubernetes" should find the
    // person whether or not the reader thought to open the dropdown.
    searchFields: (expert) => [expert.fullName, expert.headline, ...expert.specialities],
    filters: {
      speciality: (expert, value) => expert.specialities.includes(value),
      consults: (expert) => expert.acceptsConsultations,
    },
    pageSize: PAGE_SIZE,
  });

  // Built from the people who are actually listed, so the dropdown can never
  // offer a speciality that would return nobody.
  const specialities = useMemo(
    () => [...new Set((experts ?? []).flatMap((expert) => expert.specialities))].sort(),
    [experts]
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t.experts.title}</h1>
        <p className="mt-2 text-text-secondary">{t.experts.subtitle}</p>
      </header>

      {(experts?.length ?? 0) > 0 && (
        <ListToolbar
          className="mb-6"
          controls={controls}
          searchPlaceholder={t.experts.searchPlaceholder}
          total={list.total}
          isLoading={isLoading}
          views={['cards', 'table']}
          filters={
            <>
              <Select
                className="w-48"
                value={controls.filters.speciality}
                aria-label={t.experts.filterSpeciality}
                onChange={(e) => controls.setFilter('speciality', e.target.value)}
              >
                <option value="">{t.experts.filterSpecialityAll}</option>
                {specialities.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
              <Select
                className="w-44"
                value={controls.filters.consults}
                aria-label={t.experts.filterAvailability}
                onChange={(e) => controls.setFilter('consults', e.target.value)}
              >
                <option value="">{t.list.allOption}</option>
                <option value="yes">{t.experts.takesConsultations}</option>
              </Select>
            </>
          }
        />
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && list.total === 0 && (
        <EmptyState
          title={controls.activeCount > 0 ? t.list.noResults : t.experts.empty}
          description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
        />
      )}

      {controls.view === 'cards' ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {list.items.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} />
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col divide-y divide-border-default overflow-hidden rounded-xl border border-border-default">
          {list.items.map((expert) => (
            <ExpertRow key={expert.id} expert={expert} />
          ))}
        </ul>
      )}

      {list.totalPages > 1 && (
        <div className="mt-8">
          <Pagination page={controls.page} totalPages={list.totalPages} onPageChange={controls.setPage} />
        </div>
      )}
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

/**
 * One expert as a row.
 *
 * The portrait shrinks to a thumbnail and the biography goes: what remains is
 * the name, what they do and what they know, which is what a reader comparing
 * several people at once is actually reading.
 */
function ExpertRow({ expert }: { expert: Expert }) {
  const { t } = useLocale();

  return (
    <li>
      <Link
        to={`/experts/${expert.slug}`}
        className="group flex items-center gap-4 bg-surface p-3 transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-green-500/40"
      >
        <div className="size-12 shrink-0 overflow-hidden rounded-full bg-surface-muted">
          {expert.photoUrl ? (
            <img src={expertPhotoSrc(expert.photoUrl)} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-text-muted">
              <UserRound className="size-5" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-text-primary group-hover:underline">{expert.fullName}</p>
          <p className="truncate text-sm text-text-secondary">{expert.headline}</p>
        </div>

        <div className="hidden shrink-0 flex-wrap justify-end gap-1.5 sm:flex">
          {expert.specialities.slice(0, 3).map((speciality) => (
            <Badge key={speciality}>{speciality}</Badge>
          ))}
          {expert.acceptsConsultations && <Badge variant="success">{t.experts.takesConsultations}</Badge>}
        </div>
      </Link>
    </li>
  );
}
