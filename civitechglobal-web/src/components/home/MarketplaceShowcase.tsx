import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/i18n/locales';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, FileText, PenLine, SearchCheck, Star, Trophy, Users } from 'lucide-react';
import { useBoardStats, useFeatured } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { formatRange } from '@/lib/marketplace';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RatingStars } from '@/components/marketplace/RatingStars';
import { VerifiedBadge } from '@/components/marketplace/VerifiedBadge';

/**
 * The marketplace window on the landing page.
 *
 * Three parts, in the order a visitor asks the questions: how alive is it
 * (the numbers), what is on it right now (featured listings), and what would
 * using it feel like (the four steps). The boards themselves carry the full
 * lists — this section is the invitation, not the destination.
 */

/** Counts up from zero the first time the band scrolls into view. */
function CountUp({ value, locale }: { value: number; locale: Locale }) {
  const [display, setDisplay] = useState(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 900);
      // Ease out so the number settles instead of snapping.
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value]);

  return <>{locale === 'fa' ? toPersianDigits(display) : display}</>;
}

export function MarketplaceShowcase() {
  const { t, locale } = useLocale();
  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;
  const { data: stats } = useBoardStats();
  const { data: featured } = useFeatured();
  const [tab, setTab] = useState<'jobs' | 'projects'>('jobs');

  const statDefs = [
    { value: stats?.openJobs, label: t.market.statOpenJobs, icon: Users },
    { value: stats?.openProjects, label: t.market.statOpenProjects, icon: FileText },
    { value: stats?.awardsGiven, label: t.market.statAwards, icon: Trophy },
    { value: stats?.verifiedUsers, label: t.market.statVerifiedUsers, icon: SearchCheck },
  ];

  const steps = [
    { icon: PenLine, title: t.market.howStep1Title, body: t.market.howStep1Body },
    { icon: SearchCheck, title: t.market.howStep2Title, body: t.market.howStep2Body },
    { icon: Users, title: t.market.howStep3Title, body: t.market.howStep3Body },
    { icon: Trophy, title: t.market.howStep4Title, body: t.market.howStep4Body },
  ];

  const jobs = featured?.jobs ?? [];
  const projects = featured?.projects ?? [];
  const listings = tab === 'jobs' ? jobs : projects;

  return (
    <section className="py-12" aria-label={t.market.showcaseEyebrow}>
      <AnimatedSection className="mb-10 text-center">
        <p className="mb-3 inline-block rounded-full border border-brand-green-500/30 bg-brand-green-500/10 px-3 py-1 text-xs font-medium text-brand-green-600 dark:text-brand-green-400">
          {t.market.showcaseEyebrow}
        </p>
        <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">{t.market.showcaseTitle}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-text-secondary">{t.market.showcaseSubtitle}</p>
      </AnimatedSection>

      {/* The numbers */}
      <AnimatedSection>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statDefs.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 rounded-2xl border border-border-default bg-surface-50 p-5 text-center"
            >
              <stat.icon className="size-5 text-brand-green-500" aria-hidden="true" />
              <span className="text-2xl font-bold text-text-primary">
                {stat.value === undefined ? '—' : <CountUp value={stat.value} locale={locale} />}
              </span>
              <span className="text-xs text-text-secondary">{stat.label}</span>
            </div>
          ))}
        </div>
      </AnimatedSection>

      {/* Featured listings */}
      {listings.length > 0 && (
        <AnimatedSection delay={0.05}>
          <div className="mt-10">
            <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setTab('jobs')}
                aria-pressed={tab === 'jobs'}
                className={
                  tab === 'jobs'
                    ? 'rounded-full bg-brand-green-500 px-4 py-1.5 text-sm font-medium text-white'
                    : 'rounded-full border border-border-default px-4 py-1.5 text-sm text-text-secondary'
                }
              >
                {t.market.featuredJobsTab}
              </button>
              <button
                type="button"
                onClick={() => setTab('projects')}
                aria-pressed={tab === 'projects'}
                className={
                  tab === 'projects'
                    ? 'rounded-full bg-brand-green-500 px-4 py-1.5 text-sm font-medium text-white'
                    : 'rounded-full border border-border-default px-4 py-1.5 text-sm text-text-secondary'
                }
              >
                {t.market.featuredProjectsTab}
              </button>
            </div>

            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => {
                const isJob = tab === 'jobs';
                const money = isJob
                  ? (listing as (typeof jobs)[number]).salaryUndisclosed
                    ? t.market.salaryUndisclosed
                    : formatRange(
                        (listing as (typeof jobs)[number]).salaryMin,
                        (listing as (typeof jobs)[number]).salaryMax,
                        locale,
                        t,
                      )
                  : (listing as (typeof projects)[number]).budgetUnknown
                    ? t.market.budgetUnknown
                    : formatRange(
                        (listing as (typeof projects)[number]).budgetMin,
                        (listing as (typeof projects)[number]).budgetMax,
                        locale,
                        t,
                      );
                const badges = isJob
                  ? [t.market[(listing as (typeof jobs)[number]).employmentType]]
                  : (listing as (typeof projects)[number]).category
                    ? [(listing as (typeof projects)[number]).category as string]
                    : [];

                return (
                  <li key={listing.code}>
                    <Link
                      to={`${isJob ? '/jobs' : '/projects'}/${listing.code}`}
                      className="flex h-full flex-col gap-2 rounded-2xl border border-border-default bg-surface-50 p-5 transition-colors hover:border-brand-green-500/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-text-primary">{listing.title}</h3>
                        {listing.featured && (
                          <Badge variant="warning">
                            <Star className="ms-0 size-3" aria-hidden />
                            {t.market.featuredBadge}
                          </Badge>
                        )}
                      </div>
                      {listing.companyName && (
                        <p className="text-sm text-text-secondary">{listing.companyName}</p>
                      )}
                      {listing.authorProfile && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-medium text-brand-600">
                            @{listing.authorProfile.username}
                          </span>
                          {listing.authorProfile.verified && <VerifiedBadge />}
                          <RatingStars
                            avg={listing.authorProfile.ratingAvg}
                            count={listing.authorProfile.ratingCount}
                          />
                        </div>
                      )}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                        <div className="flex flex-wrap gap-1.5">
                          {badges.map((badge) => (
                            <Badge key={badge} variant="info">
                              {badge}
                            </Badge>
                          ))}
                        </div>
                        {money && <span className="text-sm font-medium text-text-primary">{money}</span>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to={tab === 'jobs' ? '/jobs' : '/projects'}>
                <Button variant="outline">
                  {tab === 'jobs' ? t.market.browseAllJobs : t.market.browseAllProjects}
                  <ArrowIcon className="size-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* How it works */}
      <AnimatedSection delay={0.05}>
        <div className="mt-12">
          <h3 className="mb-5 text-center text-lg font-semibold text-text-primary">
            {t.market.howItWorksTitle}
          </h3>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.title} className="relative flex flex-col gap-2 rounded-2xl border border-border-default bg-surface-50 p-5">
                <span className="absolute top-4 text-3xl font-bold text-brand-green-500/20 ltr:left-4 rtl:right-4">
                  {locale === 'fa' ? toPersianDigits(index + 1) : index + 1}
                </span>
                <step.icon className="size-6 text-brand-green-500" aria-hidden="true" />
                <h4 className="mt-1 font-semibold text-text-primary">{step.title}</h4>
                <p className="text-sm text-text-secondary">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 text-center">
            <Link to="/dashboard/jobs">
              <Button>{t.market.postListingCta}</Button>
            </Link>
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}
