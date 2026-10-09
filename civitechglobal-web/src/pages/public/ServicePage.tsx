import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { Check, ChevronLeft, ChevronRight, Clock, Globe2, Languages, MapPin, RefreshCw, ShieldCheck, Star } from 'lucide-react';
import { serviceImagePath, usePlaceOrder, useService } from '@/api/work';
import { useOwnProfile } from '@/api/marketplace';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { apiAssetSrc } from '@/lib/apiAsset';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { categoryName, fill, formatNumber } from '@/lib/jobFormat';
import { countryName } from '@/lib/geo';
import { agoText, languageName, money } from '@/lib/workFormat';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { FreelancerFacts, LevelBadge, Stars } from '@/components/work/WorkUi';
import { UNLIMITED_REVISIONS, type PackageTier, type ServiceDetail } from '@/types/work';

/**
 * One service, Fiverr's page: gallery and description on the left, the
 * package tabs on the right with "continue", then the comparison table, the
 * seller, the FAQ and the reviews — each review with what was paid and how
 * long it took.
 */
export default function ServicePage() {
  const { code } = useParams<{ code: string }>();
  const { t } = useLocale();
  const { data: service, isLoading } = useService(code);
  useDocumentTitle(service?.title ?? t.work.servicesTitle, {
    description: service?.description.slice(0, 160) ?? t.work.servicesSubtitle,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t.common.loading} />
      </div>
    );
  }
  if (!service) {
    return (
      <div className="page-frame page-frame-reading text-center">
        <p className="text-text-secondary">{t.errors.notFoundBody}</p>
        <Link to="/freelance-services" className="mt-4 inline-block text-brand-green-600 hover:underline">
          {t.work.servicesTitle}
        </Link>
      </div>
    );
  }
  return <ServiceBody service={service} />;
}

function revisionsText(revisions: number, t: ReturnType<typeof useLocale>['t'], locale: ReturnType<typeof useLocale>['locale']) {
  return revisions === UNLIMITED_REVISIONS
    ? t.work.unlimitedRevisions
    : fill(t.work.revisionsCount, { count: formatNumber(revisions, locale) });
}

function ServiceBody({ service }: { service: ServiceDetail }) {
  const { t, locale } = useLocale();
  const [tier, setTier] = useState<PackageTier>(service.packages[0]?.tier ?? 'BASIC');
  const [image, setImage] = useState(0);
  const [ordering, setOrdering] = useState(false);
  const pkg = service.packages.find((row) => row.tier === tier) ?? service.packages[0];
  const seller = service.seller;
  const number = (value: number) => formatNumber(value, locale);
  const total = service.reviews.items.length;

  return (
    <div className="page-frame">
      <nav className="mb-4 text-sm text-text-tertiary">
        <Link to="/freelance-services" className="hover:text-text-primary hover:underline">
          {t.work.servicesTitle}
        </Link>
        {service.workCategory && <> / {categoryName(service.workCategory, locale)}</>}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <main className="flex min-w-0 flex-col gap-8">
          <header className="flex flex-col gap-3">
            <h1 className="text-2xl font-bold text-text-primary">{service.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
              {seller.profile?.username && (
                <Link to={`/profiles/${seller.profile.username}`} className="font-medium text-text-primary hover:underline">
                  {seller.displayName ?? seller.profile.username}
                </Link>
              )}
              {seller.stats && <LevelBadge level={seller.stats.level} />}
              {service.rating.count > 0 && <Stars value={service.rating.avg} count={service.rating.count} />}
              {seller.ordersInQueue > 0 && (
                <span className="text-text-tertiary">{fill(t.work.ordersInQueue, { count: number(seller.ordersInQueue) })}</span>
              )}
            </div>
          </header>

          {service.images.length > 0 && (
            <div className="relative overflow-hidden rounded-2xl border border-border-default bg-surface-muted">
              <img
                src={apiAssetSrc(serviceImagePath(service.images[image].id))}
                alt={service.images[image].originalName}
                className="aspect-[16/10] w-full object-contain"
              />
              {service.images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full bg-surface-default/90 p-2 shadow"
                    aria-label={t.common.previous}
                    onClick={() => setImage((image - 1 + service.images.length) % service.images.length)}
                  >
                    <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full bg-surface-default/90 p-2 shadow"
                    aria-label={t.common.next}
                    onClick={() => setImage((image + 1) % service.images.length)}
                  >
                    <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
                  </button>
                  <div className="flex gap-2 overflow-x-auto bg-surface-default p-2">
                    {service.images.map((row, index) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setImage(index)}
                        className={cn('shrink-0 overflow-hidden rounded-lg border-2', index === image ? 'border-brand-green-600' : 'border-transparent')}
                        aria-label={row.originalName}
                      >
                        <img src={apiAssetSrc(serviceImagePath(row.id))} alt="" className="h-14 w-20 object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <section aria-labelledby="about-service">
            <h2 id="about-service" className="mb-3 text-lg font-semibold text-text-primary">
              {t.work.aboutService}
            </h2>
            <div className="whitespace-pre-line leading-relaxed text-text-secondary">{service.description}</div>
            {service.skills.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {service.skills.map((skill) => (
                  <li key={skill} className="rounded-full bg-surface-muted px-3 py-1 text-sm text-text-secondary">
                    {skill}
                  </li>
                ))}
              </ul>
            )}
            {service.languages.length > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-text-secondary">
                <Languages className="size-4 text-text-tertiary" aria-hidden="true" />
                {service.languages.map((code) => languageName(code, locale)).join('، ')}
              </p>
            )}
          </section>

          {service.packages.length > 1 && (
            <section aria-labelledby="compare-packages" className="overflow-x-auto">
              <h2 id="compare-packages" className="mb-3 text-lg font-semibold text-text-primary">
                {t.work.comparePackages}
              </h2>
              <table className="w-full min-w-[32rem] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-border-default p-3 text-start" />
                    {service.packages.map((row) => (
                      <th key={row.tier} className="border border-border-default p-3 text-start align-top">
                        <p className="text-base font-semibold text-text-primary">{money(row.price, row.currency, locale, t)}</p>
                        <p className="font-medium text-text-primary">{t.work.tiers[row.tier]}: {row.name}</p>
                        <p className="mt-1 text-xs font-normal text-text-secondary">{row.description}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...new Set(service.packages.flatMap((row) => row.features))].map((feature) => (
                    <tr key={feature}>
                      <td className="border border-border-default p-3 text-text-secondary">{feature}</td>
                      {service.packages.map((row) => (
                        <td key={row.tier} className="border border-border-default p-3 text-center">
                          {row.features.includes(feature) ? (
                            <Check className="mx-auto size-4 text-brand-green-600" aria-label={t.common.yes} />
                          ) : (
                            <span className="text-text-tertiary" aria-label={t.common.no}>—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className="border border-border-default p-3 text-text-secondary">{t.work.packageRevisions}</td>
                    {service.packages.map((row) => (
                      <td key={row.tier} className="border border-border-default p-3 text-center text-text-primary">
                        {revisionsText(row.revisions, t, locale)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border border-border-default p-3 text-text-secondary">{t.work.deliveryTime}</td>
                    {service.packages.map((row) => (
                      <td key={row.tier} className="border border-border-default p-3 text-center text-text-primary">
                        {fill(t.work.daysCount, { count: number(row.deliveryDays) })}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          <section aria-labelledby="about-seller" className="rounded-2xl border border-border-default bg-surface-default p-5">
            <h2 id="about-seller" className="mb-3 text-lg font-semibold text-text-primary">
              {t.work.aboutSeller}
            </h2>
            <div className="flex flex-col gap-3">
              <p className="font-medium text-text-primary">{seller.displayName}</p>
              {seller.profile?.headline && <p className="text-sm text-text-secondary">{seller.profile.headline}</p>}
              {seller.stats && <FreelancerFacts stats={seller.stats} />}
              {seller.stats && (
                <dl className="grid grid-cols-2 gap-3 border-t border-border-default pt-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-text-tertiary">{t.work.fromCountry}</dt>
                    <dd className="font-medium text-text-primary">{countryName(seller.stats.country, locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">{t.work.memberSince.replace(' {date}', '').replace('{date}', '')}</dt>
                    <dd className="font-medium text-text-primary">{formatDate(seller.stats.memberSince, locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">{t.work.avgResponse}</dt>
                    <dd className="font-medium text-text-primary">
                      {seller.stats.lastActiveAt ? agoText(seller.stats.lastActiveAt, locale, t) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">{t.work.lastDelivery.replace(' {ago}', '').replace('{ago}', '')}</dt>
                    <dd className="font-medium text-text-primary">
                      {seller.stats.lastDeliveryAt ? agoText(seller.stats.lastDeliveryAt, locale, t) : '—'}
                    </dd>
                  </div>
                </dl>
              )}
              {seller.bio && <p className="whitespace-pre-line border-t border-border-default pt-3 text-sm text-text-secondary">{seller.bio}</p>}
              {seller.profile?.username && (
                <Link to={`/profiles/${seller.profile.username}`} className="text-sm text-brand-green-600 hover:underline">
                  {t.work.viewProfile}
                </Link>
              )}
            </div>
          </section>

          {service.faqs.length > 0 && (
            <section aria-labelledby="service-faq">
              <h2 id="service-faq" className="mb-3 text-lg font-semibold text-text-primary">
                {t.work.faq}
              </h2>
              <div className="flex flex-col gap-2">
                {service.faqs.map((faq) => (
                  <details key={faq.question} className="rounded-xl border border-border-default bg-surface-default p-4">
                    <summary className="cursor-pointer font-medium text-text-primary">{faq.question}</summary>
                    <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="service-reviews">
            <h2 id="service-reviews" className="mb-3 flex items-center gap-3 text-lg font-semibold text-text-primary">
              {t.work.reviewsTitle}
              {service.rating.count > 0 && <Stars value={service.rating.avg} count={service.rating.count} size="md" />}
            </h2>
            {total === 0 ? (
              <p className="text-sm text-text-tertiary">{t.work.noReviewsYet}</p>
            ) : (
              <>
                <ul className="mb-5 flex max-w-sm flex-col gap-1.5">
                  {service.reviews.breakdown.map((row) => (
                    <li key={row.stars} className="flex items-center gap-2 text-sm">
                      <span className="w-12 text-text-secondary">
                        {number(row.stars)} <Star className="inline size-3.5 fill-brand-amber-400 text-brand-amber-400" aria-hidden="true" />
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                        <span
                          className="block h-full rounded-full bg-brand-amber-400"
                          style={{ width: `${total ? (row.count / total) * 100 : 0}%` }}
                        />
                      </span>
                      <span className="w-8 text-end text-text-tertiary">({number(row.count)})</span>
                    </li>
                  ))}
                </ul>
                <ul className="flex flex-col gap-4">
                  {service.reviews.items.map((review, index) => (
                    <li key={index} className="rounded-xl border border-border-default bg-surface-default p-4">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <Stars value={review.rating} />
                        <span className="flex items-center gap-1 text-text-tertiary">
                          <MapPin className="size-3.5" aria-hidden="true" />
                          {countryName(review.buyerCountry, locale)}
                        </span>
                        <span className="text-text-tertiary">{agoText(review.createdAt, locale, t)}</span>
                      </div>
                      {review.text && <p className="mt-2 text-sm text-text-secondary">{review.text}</p>}
                      <dl className="mt-3 flex flex-wrap gap-6 border-t border-border-default pt-2 text-xs">
                        <div>
                          <dt className="text-text-tertiary">{t.work.reviewPrice}</dt>
                          <dd className="font-medium text-text-primary">{money(review.price, review.currency, locale, t)}</dd>
                        </div>
                        {review.durationDays !== null && (
                          <div>
                            <dt className="text-text-tertiary">{t.work.reviewDuration}</dt>
                            <dd className="font-medium text-text-primary">{fill(t.work.daysCount, { count: number(review.durationDays) })}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-text-tertiary">{t.work.packages}</dt>
                          <dd className="font-medium text-text-primary">{t.work.tiers[review.tier]}</dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {service.moreFromSeller.length > 0 && (
            <section aria-labelledby="more-from-seller">
              <h2 id="more-from-seller" className="mb-3 text-lg font-semibold text-text-primary">
                {t.work.moreFromSeller}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {service.moreFromSeller.map((row) => (
                  <li key={row.code}>
                    <Link to={`/freelance-services/${row.code}`} className="flex h-full flex-col gap-1 rounded-xl border border-border-default bg-surface-default p-3 hover:border-border-strong">
                      <span className="font-medium text-text-primary">{row.title}</span>
                      <span className="text-sm text-text-secondary">
                        {t.work.startingAt} {money(row.startingPrice, row.currency, locale, t)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-border-default bg-surface-default">
            {service.packages.length > 1 && (
              <div className="grid border-b border-border-default" style={{ gridTemplateColumns: `repeat(${service.packages.length}, 1fr)` }} role="tablist">
                {service.packages.map((row) => (
                  <button
                    key={row.tier}
                    type="button"
                    role="tab"
                    aria-selected={row.tier === tier}
                    onClick={() => setTier(row.tier)}
                    className={cn(
                      'p-3 text-sm font-medium',
                      row.tier === tier
                        ? 'border-b-2 border-brand-green-600 text-text-primary'
                        : 'text-text-tertiary hover:text-text-primary',
                    )}
                  >
                    {t.work.tiers[row.tier]}
                  </button>
                ))}
              </div>
            )}
            {pkg && (
              <div className="flex flex-col gap-3 p-5" role="tabpanel">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold text-text-primary">{pkg.name}</p>
                  <p className="text-xl font-bold text-text-primary">{money(pkg.price, pkg.currency, locale, t)}</p>
                </div>
                <p className="text-sm text-text-secondary">{pkg.description}</p>
                <p className="flex flex-wrap gap-4 text-sm font-medium text-text-primary">
                  <span className="flex items-center gap-1">
                    <Clock className="size-4 text-text-tertiary" aria-hidden="true" />
                    {fill(t.work.deliveryIn, { days: number(pkg.deliveryDays) })}
                  </span>
                  <span className="flex items-center gap-1">
                    <RefreshCw className="size-4 text-text-tertiary" aria-hidden="true" />
                    {revisionsText(pkg.revisions, t, locale)}
                  </span>
                </p>
                {pkg.features.length > 0 && (
                  <ul className="flex flex-col gap-1.5 text-sm text-text-secondary">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-brand-green-600" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
                <Button className="w-full" onClick={() => setOrdering(true)}>
                  {t.work.order}
                </Button>
                <p className="flex items-center justify-center gap-1 text-xs text-text-tertiary">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  {t.work.orderPlaced.split('.')[0]}.
                </p>
              </div>
            )}
          </div>
          {seller.stats && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-text-tertiary">
              <Globe2 className="size-3.5" aria-hidden="true" />
              {t.work.availability[seller.stats.availability]}
            </p>
          )}
        </aside>
      </div>

      {ordering && pkg && <OrderModal service={service} tier={pkg.tier} onClose={() => setOrdering(false)} />}
    </div>
  );
}

/** The order: extras, the seller's questions, a note, and the total. Nothing is charged. */
function OrderModal({ service, tier, onClose }: { service: ServiceDetail; tier: PackageTier; onClose: () => void }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const place = usePlaceOrder();
  const pkg = service.packages.find((row) => row.tier === tier)!;
  const [extras, setExtras] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>(service.requirements.map(() => ''));
  const [note, setNote] = useState('');
  const chosen = service.extras.filter((extra) => extras.includes(extra.id));
  const total = BigInt(pkg.price) + chosen.reduce((sum, extra) => sum + BigInt(extra.price), 0n);
  const days = pkg.deliveryDays + chosen.reduce((sum, extra) => sum + extra.extraDays, 0);
  const { data: profile } = useOwnProfile(Boolean(user));
  const own = Boolean(profile?.username) && profile?.username === service.seller.profile?.username;

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await place.mutateAsync({
        serviceId: service.id,
        payload: { tier, extraIds: extras, requirementAnswers: answers.map((answer) => answer.trim()), note: note.trim() || undefined },
      });
      showToast(t.work.orderPlaced, 'success');
      onClose();
      navigate('/dashboard/service-orders');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={pkg ? fill(t.work.orderTitle, { package: t.work.tiers[tier] }) : t.work.order}>
      {!user ? (
        <Link to="/login" state={{ from: { pathname: location.pathname } }}>
          <Button>{t.work.signInToOrder}</Button>
        </Link>
      ) : own ? (
        <p className="text-sm text-text-secondary">{t.work.orderSelf}</p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          {service.extras.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-text-primary">{t.work.extras}</legend>
              <div className="flex flex-col gap-2">
                {service.extras.map((extra) => (
                  <label key={extra.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-default p-2.5 text-sm">
                    <span className="flex items-center gap-2 text-text-secondary">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border-default"
                        checked={extras.includes(extra.id)}
                        onChange={() =>
                          setExtras(extras.includes(extra.id) ? extras.filter((id) => id !== extra.id) : [...extras, extra.id])
                        }
                      />
                      {extra.title}
                      {extra.extraDays > 0 && (
                        <Badge>{fill(t.work.extraDays, { days: formatNumber(extra.extraDays, locale) })}</Badge>
                      )}
                    </span>
                    <span className="font-medium text-text-primary">{money(extra.price, pkg.currency, locale, t)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {service.requirements.length > 0 && (
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-sm font-medium text-text-primary">{t.work.requirementsTitle}</legend>
              {service.requirements.map((question, index) => (
                <FormField key={question} label={question} htmlFor={`req-${index}`}>
                  <TextArea
                    id={`req-${index}`}
                    required
                    rows={2}
                    value={answers[index]}
                    onChange={(e) => setAnswers(answers.map((answer, i) => (i === index ? e.target.value : answer)))}
                  />
                </FormField>
              ))}
            </fieldset>
          )}
          <FormField label={t.work.orderNote} htmlFor="order-note">
            <TextArea id="order-note" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
          <dl className="grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-3 text-sm">
            <dt className="text-text-secondary">{t.work.orderTotal}</dt>
            <dd className="text-end font-semibold text-text-primary">{money(total.toString(), pkg.currency, locale, t)}</dd>
            <dt className="text-text-secondary">{t.work.orderDelivery}</dt>
            <dd className="text-end text-text-primary">{fill(t.work.daysCount, { count: formatNumber(days, locale) })}</dd>
          </dl>
          <p className="text-xs text-text-tertiary">{t.work.orderPlaced}</p>
          <Button type="submit" isLoading={place.isPending}>
            {t.work.order}
          </Button>
        </form>
      )}
    </Modal>
  );
}
