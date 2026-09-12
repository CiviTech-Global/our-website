import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { PhoneCall, Search, Zap } from 'lucide-react';
import { useInsuranceCatalog } from '@/api/insurance';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { GlowCard } from '@/components/ui/GlowCard';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { CategoryWithProducts } from '@/types/insurance';

function matches(query: string, ...haystack: string[]): boolean {
  if (!query.trim()) return true;
  const needle = query.trim().toLowerCase();
  return haystack.some((value) => value.toLowerCase().includes(needle));
}

export default function InsurancePage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.nav.insurance);
  const { data: catalog, isLoading, isError } = useInsuranceCatalog();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo<CategoryWithProducts[]>(() => {
    if (!catalog) return [];
    return catalog
      .filter((category) => !activeCategory || category.slug === activeCategory)
      .map((category) => ({
        ...category,
        products: category.products.filter((product) =>
          matches(query, product.title, product.titleEn, product.summary, product.summaryEn),
        ),
      }))
      .filter((category) => category.products.length > 0);
  }, [catalog, query, activeCategory]);

  const totalShown = filtered.reduce((n, c) => n + c.products.length, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <AnimatedSection className="mb-8 text-center sm:mb-10">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{t.insurance.title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-text-secondary">{t.insurance.subtitle}</p>
      </AnimatedSection>

      <AnimatedSection className="mb-8">
        <div className="relative mx-auto max-w-md">
          <Search
            className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.insurance.searchPlaceholder}
            aria-label={t.insurance.searchPlaceholder}
            className="ps-10"
          />
        </div>
      </AnimatedSection>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner size={32} label={t.common.loading} />
        </div>
      )}

      {isError && <EmptyState title={t.common.error} description={t.insurance.catalogError} />}

      {catalog && (
        <>
          <AnimatedSection className="mb-8 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={cn(
                'rounded-full border px-4 py-2 text-sm transition-colors',
                activeCategory === null
                  ? 'border-brand-green-500 bg-brand-green-500/10 text-text-primary'
                  : 'border-border-default text-text-secondary hover:border-brand-green-500/40',
              )}
            >
              {t.common.all}
            </button>
            {catalog.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => setActiveCategory(category.slug)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm transition-colors',
                  activeCategory === category.slug
                    ? 'border-brand-green-500 bg-brand-green-500/10 text-text-primary'
                    : 'border-border-default text-text-secondary hover:border-brand-green-500/40',
                )}
              >
                {category.emoji} {locale === 'fa' ? category.title : category.titleEn}
              </button>
            ))}
          </AnimatedSection>

          {totalShown === 0 && (
            <EmptyState title={t.common.noResults} description={t.insurance.noMatches} />
          )}

          {filtered.map((category, categoryIndex) => (
            <section key={category.slug} className="mb-12">
              <AnimatedSection className="mb-5" delay={categoryIndex * 0.04}>
                <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
                  <span aria-hidden="true">{category.emoji} </span>
                  {locale === 'fa' ? category.title : category.titleEn}
                </h2>
              </AnimatedSection>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {category.products.map((product, i) => (
                  <AnimatedSection key={product.slug} delay={i * 0.04}>
                    <Link to={`/insurance/${product.slug}`} className="block h-full">
                      <GlowCard glow="green" className="flex h-full flex-col">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <h3 className="text-base font-semibold text-text-primary">
                            {locale === 'fa' ? product.title : product.titleEn}
                          </h3>
                          {product.audience === 'CORPORATE' && (
                            <Badge variant="default">{t.insurance.corporate}</Badge>
                          )}
                        </div>

                        <p className="mb-4 flex-1 text-sm text-text-secondary">
                          {locale === 'fa' ? product.summary : product.summaryEn}
                        </p>

                        {/* The distinction that actually changes what happens
                            next: fill a form and we route it, or tell us the
                            outline and a specialist prices it on a call. */}
                        <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                          {product.intakeMode === 'SELF_SERVE' ? (
                            <>
                              <Zap className="size-3.5 text-brand-green-500" aria-hidden="true" />
                              {t.insurance.selfServeBadge}
                            </>
                          ) : (
                            <>
                              <PhoneCall className="size-3.5 text-brand-amber-500" aria-hidden="true" />
                              {t.insurance.callbackBadge}
                            </>
                          )}
                        </span>
                      </GlowCard>
                    </Link>
                  </AnimatedSection>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
