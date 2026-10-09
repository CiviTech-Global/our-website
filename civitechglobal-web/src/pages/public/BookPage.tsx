import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { BadgeCheck, MapPin, Package, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { offerPhotoPath, useBook, useCreateBookRequest } from '@/api/bookshop';
import { useOwnProfile } from '@/api/marketplace';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { toLatinDigits } from '@/i18n/utils';
import { apiAssetSrc } from '@/lib/apiAsset';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { categoryName, fill, formatNumber } from '@/lib/jobFormat';
import { languageName, money } from '@/lib/workFormat';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { RatingStars } from '@/components/marketplace/RatingStars';
import { BookCover, BookStrip, GradeBadge, PriceLine } from '@/components/books/BookUi';
import { namesText } from '@/lib/bookFormat';
import type { BookDetail, BookDelivery, BookOffer } from '@/types/bookshop';

/**
 * One book, Bookshop.org's page: the cover beside the title, the people and
 * the price; the product details as a table; the description and the shelves
 * it sits on; then — what Bookshop.org has as formats and this market has as
 * sellers — every copy for sale, cheapest first, each with its condition,
 * photos, seller and delivery, and a request to buy. Other editions of the
 * same work, more by the author and more from the shelf close it.
 */
export default function BookPage() {
  const { code } = useParams<{ code: string }>();
  const { t } = useLocale();
  const { data: book, isLoading } = useBook(code);
  useDocumentTitle(book?.title ?? t.bookshop.title, { description: book?.description?.slice(0, 160) ?? t.bookshop.subtitle });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t.common.loading} />
      </div>
    );
  }
  if (!book) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <p className="text-text-secondary">{t.books.notFound}</p>
        <Link to="/books" className="mt-4 inline-block text-brand-green-600 hover:underline">
          {t.bookshop.title}
        </Link>
      </div>
    );
  }
  return <BookBody book={book} />;
}

function BookBody({ book }: { book: BookDetail }) {
  const { t, locale } = useLocale();
  const [requesting, setRequesting] = useState<BookOffer | null>(null);
  const number = (value: number) => formatNumber(value, locale);
  const year = (value: number) => (locale === 'fa' ? formatNumber(value, locale).replace(/٬|,/g, '') : String(value));

  const details: Array<[string, string]> = [
    ...(book.publisher ? [[t.bookshop.publisher, book.publisher] as [string, string]] : []),
    ...(book.publishYear ? [[t.bookshop.publishYear, `${year(book.publishYear)} (${t.bookshop.calendars[book.yearCalendar]})`] as [string, string]] : []),
    ...(book.edition ? [[t.bookshop.edition, fill(t.bookshop.editionNth, { n: number(book.edition) })] as [string, string]] : []),
    ...(book.printRun ? [[t.bookshop.printRun, fill(t.bookshop.copiesPrinted, { n: number(book.printRun) })] as [string, string]] : []),
    ...(book.pageCount ? [[t.bookshop.pages, number(book.pageCount)] as [string, string]] : []),
    [t.bookshop.language, languageName(book.language, locale)],
    ...(book.originalTitle
      ? [[t.bookshop.original, `${book.originalTitle}${book.originalLanguage ? ` (${languageName(book.originalLanguage, locale)})` : ''}`] as [string, string]]
      : []),
    ...(book.binding ? [[t.bookshop.binding, t.bookshop.bindings[book.binding]] as [string, string]] : []),
    ...(book.trimSize ? [[t.bookshop.trimSize, t.bookshop.trimSizes[book.trimSize]] as [string, string]] : []),
    ...(book.series
      ? [[t.bookshop.series, `${book.series}${book.seriesNumber ? ` — ${fill(t.bookshop.seriesNumber, { n: number(book.seriesNumber) })}` : ''}`] as [string, string]]
      : []),
    ...(book.weightGrams ? [[t.bookshop.weight, fill(t.bookshop.grams, { n: number(book.weightGrams) })] as [string, string]] : []),
    ...(book.listPrice ? [[t.bookshop.listPrice, money(book.listPrice, book.currency, locale, t) ?? ''] as [string, string]] : []),
    ...(book.isbn ? [[t.bookshop.isbn, book.isbn] as [string, string]] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-5 text-sm text-text-tertiary">
        <Link to="/books" className="hover:text-text-primary hover:underline">
          {t.bookshop.title}
        </Link>
        {book.category && (
          <>
            {' / '}
            <Link to={`/books/shelf/${book.category.slug}`} className="hover:text-text-primary hover:underline">
              {categoryName(book.category, locale)}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)_280px]">
        <div className="mx-auto w-48 md:w-full">
          <BookCover url={book.coverUrl} title={book.title} size="lg" />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="text-3xl font-bold leading-tight text-text-primary">{book.title}</h1>
          {book.subtitle && <p className="text-lg text-text-secondary">{book.subtitle}</p>}
          <p className="text-text-secondary">
            {fill(t.bookshop.by, { names: namesText(book.authors, locale) })}
            {book.translators.length > 0 && (
              <span className="text-text-tertiary"> · {fill(t.bookshop.translatedBy, { names: namesText(book.translators, locale) })}</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {book.verified && (
              <Badge variant="success">
                <BadgeCheck className="size-3" aria-hidden="true" />
                {t.bookshop.verifiedBook}
              </Badge>
            )}
            {book.binding && <Badge>{t.bookshop.bindings[book.binding]}</Badge>}
            {book.trimSize && <Badge>{t.bookshop.trimSizes[book.trimSize]}</Badge>}
            <span className="text-text-tertiary">{fill(t.bookshop.views, { n: number(book.viewCount) })}</span>
          </div>
          {book.description && (
            <div className="mt-2">
              <h2 className="mb-1 text-sm font-semibold text-text-primary">{t.bookshop.description}</h2>
              <p className="whitespace-pre-line leading-relaxed text-text-secondary">{book.description}</p>
            </div>
          )}
          {(book.category || book.tags.length > 0) && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-text-primary">{t.bookshop.shelvesTitle}</h2>
              <ul className="flex flex-wrap gap-2">
                {book.category && (
                  <li>
                    <Link to={`/books/shelf/${book.category.slug}`} className="inline-block rounded-full border border-border-default px-3 py-1 text-sm text-text-secondary hover:border-border-strong">
                      {categoryName(book.category, locale)}
                    </Link>
                  </li>
                )}
                {book.tags.map((tag) => (
                  <li key={tag}>
                    <Link to={`/books?q=${encodeURIComponent(tag)}`} className="inline-block rounded-full bg-surface-muted px-3 py-1 text-sm text-text-secondary hover:text-text-primary">
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4 md:col-span-2 lg:col-span-1">
          <div className="rounded-2xl border border-border-default bg-surface-default p-4">
            {book.lowestPrice ? (
              <>
                <p className="text-xs text-text-tertiary">{t.bookshop.lowestPrice}</p>
                <PriceLine className="text-2xl" price={book.lowestPrice} listPrice={book.listPrice} currency={book.currency} discountPercent={book.discountPercent} />
                <p className="mt-1 text-sm text-text-secondary">{fill(t.bookshop.offersCount, { count: number(book.offers.length) })}</p>
                <a href="#copies" className="mt-3 block">
                  <Button className="w-full">
                    <ShoppingBag className="size-4" aria-hidden="true" />
                    {t.bookshop.copiesForSale}
                  </Button>
                </a>
              </>
            ) : (
              <p className="text-sm text-text-secondary">{t.bookshop.noCopies}</p>
            )}
          </div>
          <dl className="rounded-2xl border border-border-default bg-surface-default p-4 text-sm">
            <h2 className="mb-2 font-semibold text-text-primary">{t.bookshop.details}</h2>
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 border-b border-border-default py-1.5 last:border-0">
                <dt className="text-text-tertiary">{label}</dt>
                <dd className={cn('text-end text-text-primary', label === t.bookshop.isbn && 'ltr font-mono')}>{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      <section id="copies" className="mt-10 scroll-mt-24" aria-labelledby="copies-heading">
        <h2 id="copies-heading" className="text-xl font-semibold text-text-primary">
          {t.bookshop.copiesForSale}
        </h2>
        <p className="mb-4 text-sm text-text-tertiary">{t.bookshop.copiesForSaleHint}</p>
        {book.offers.length === 0 && <p className="text-sm text-text-secondary">{t.bookshop.noCopies}</p>}
        <ul className="flex flex-col gap-3">
          {book.offers.map((offer) => (
            <OfferRow key={offer.id} offer={offer} book={book} onRequest={() => setRequesting(offer)} />
          ))}
        </ul>
      </section>

      {book.editions.length > 0 && (
        <section className="mt-10" aria-labelledby="editions-heading">
          <h2 id="editions-heading" className="mb-3 text-lg font-semibold text-text-primary">
            {t.bookshop.otherEditions}
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-border-default">
            <table className="w-full min-w-[36rem] text-sm">
              <tbody>
                {book.editions.map((edition) => (
                  <tr key={edition.id} className="border-b border-border-default last:border-0">
                    <td className="p-3">
                      <Link to={`/books/${edition.code}`} className="font-medium text-text-primary hover:underline">
                        {edition.publisher ?? edition.title}
                      </Link>
                      {edition.translators.length > 0 && (
                        <p className="text-xs text-text-tertiary">{fill(t.bookshop.translatedBy, { names: namesText(edition.translators, locale) })}</p>
                      )}
                    </td>
                    <td className="p-3 text-text-secondary">
                      {[
                        edition.publishYear ? year(edition.publishYear) : null,
                        edition.edition ? fill(t.bookshop.editionNth, { n: number(edition.edition) }) : null,
                        edition.binding ? t.bookshop.bindings[edition.binding] : null,
                        edition.trimSize ? t.bookshop.trimSizes[edition.trimSize] : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </td>
                    <td className="p-3 text-end">
                      {edition.lowestPrice ? (
                        <span className="font-semibold text-text-primary">
                          {t.bookshop.from} {money(edition.lowestPrice, 'IRT', locale, t)}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">{t.bookshop.noCopies}</span>
                      )}
                      <p className="text-xs text-text-tertiary">{fill(t.bookshop.offersCount, { count: number(edition.offerCount) })}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-10 flex flex-col gap-10">
        {book.authors[0] && <BookStrip title={fill(t.bookshop.moreByAuthor, { name: book.authors[0] })} books={book.moreByAuthor} />}
        <BookStrip title={t.bookshop.similarBooks} books={book.similar} />
      </div>

      {requesting && <RequestModal offer={requesting} book={book} onClose={() => setRequesting(null)} />}
    </div>
  );
}

function OfferRow({ offer, book, onRequest }: { offer: BookOffer; book: BookDetail; onRequest: () => void }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const { data: profile } = useOwnProfile(Boolean(user));
  const [photo, setPhoto] = useState(0);
  const own = Boolean(offer.seller?.username) && profile?.username === offer.seller?.username;
  const number = (value: number) => formatNumber(value, locale);
  const shipping =
    offer.shippingCost === null ? t.bookshop.shippingAsk : offer.shippingCost === '0' ? t.bookshop.shippingFree : money(offer.shippingCost, offer.currency, locale, t);
  const discount =
    book.listPrice && BigInt(book.listPrice) > 0n && BigInt(offer.price) < BigInt(book.listPrice)
      ? Number(((BigInt(book.listPrice) - BigInt(offer.price)) * 100n) / BigInt(book.listPrice))
      : 0;

  return (
    <li className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 rounded-2xl border border-border-default bg-surface-default p-4 sm:grid-cols-[120px_minmax(0,1fr)_200px]">
      <div className="flex flex-col gap-2">
        {offer.photos.length > 0 ? (
          <>
            <img
              src={apiAssetSrc(offerPhotoPath(offer.photos[photo].id))}
              alt={`${t.bookshop.photos} ${photo + 1}`}
              className="aspect-[3/4] w-full rounded-lg border border-border-default object-cover"
              loading="lazy"
            />
            {offer.photos.length > 1 && (
              <div className="flex gap-1">
                {offer.photos.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPhoto(index)}
                    aria-label={`${t.bookshop.photos} ${index + 1}`}
                    className={cn('size-7 overflow-hidden rounded border', index === photo ? 'border-brand-green-600' : 'border-border-default')}
                  >
                    <img src={apiAssetSrc(offerPhotoPath(item.id))} alt="" className="size-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <BookCover url={book.coverUrl} title={book.title} size="sm" />
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <GradeBadge grade={offer.grade} withHint />
          {offer.negotiable && <Badge variant="info">{t.bookshop.negotiable}</Badge>}
          {offer.quantity > 1 && <span className="text-xs text-text-tertiary">{fill(t.bookshop.quantityLeft, { n: number(offer.quantity) })}</span>}
          {offer.soldCount > 0 && <span className="text-xs text-text-tertiary">· {fill(t.bookshop.sold, { n: number(offer.soldCount) })}</span>}
        </div>
        <p className="text-xs text-text-tertiary">{t.bookshop.gradeHints[offer.grade]}</p>
        {offer.conditionNotes && (
          <p className="whitespace-pre-line text-sm text-text-secondary">
            <span className="font-medium text-text-primary">{t.bookshop.sellerNotes}: </span>
            {offer.conditionNotes}
          </p>
        )}
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary [&_svg]:size-3.5 [&_svg]:text-text-tertiary">
          {(offer.city || offer.province) && (
            <li className="flex items-center gap-1">
              <MapPin aria-hidden="true" />
              {[offer.city, offer.province].filter(Boolean).join('، ')}
            </li>
          )}
          <li className="flex items-center gap-1">
            <Package aria-hidden="true" />
            {offer.deliveryOptions.map((option) => t.bookshop.delivery[option]).join('، ')}
          </li>
          {offer.deliveryOptions.some((option) => option !== 'IN_PERSON') && (
            <li className="flex items-center gap-1">
              <Truck aria-hidden="true" />
              {t.bookshop.shipping}: {shipping}
            </li>
          )}
        </ul>
        <div className="flex flex-wrap items-center gap-2 border-t border-border-default pt-2 text-sm">
          {offer.postedByCompany ? (
            <span className="flex items-center gap-1 font-medium text-text-primary">
              <ShieldCheck className="size-4 text-brand-green-600" aria-hidden="true" />
              {t.bookshop.companySeller}
            </span>
          ) : offer.seller ? (
            <>
              <Link to={`/profiles/${offer.seller.username}`} className="font-medium text-text-primary hover:underline">
                @{offer.seller.username}
              </Link>
              {offer.seller.verified && <ShieldCheck className="size-4 text-brand-green-600" aria-label={t.market.verifiedBadge} />}
              {offer.seller.ratingCount > 0 && <RatingStars avg={offer.seller.ratingAvg} count={offer.seller.ratingCount} />}
            </>
          ) : null}
          <span className="text-xs text-text-tertiary">
            {offer.sellerSales > 0 ? fill(t.bookshop.sales, { n: number(offer.sellerSales) }) : t.bookshop.noSalesYet}
          </span>
        </div>
      </div>

      <div className="col-span-2 flex flex-col items-stretch sm:col-span-1 justify-between gap-3 sm:items-end">
        <div className="sm:text-end">
          <p className="text-xl font-bold text-text-primary">{money(offer.price, offer.currency, locale, t)}</p>
          {discount > 0 && (
            <p className="text-xs font-semibold text-brand-red-600">{fill(t.bookshop.discountOff, { percent: number(discount) })}</p>
          )}
        </div>
        {own ? (
          <Badge>{t.bookshop.yourCopy}</Badge>
        ) : (
          <Button onClick={onRequest}>
            <ShoppingBag className="size-4" aria-hidden="true" />
            {t.bookshop.requestToBuy}
          </Button>
        )}
      </div>
    </li>
  );
}

const digits = (value: string) => toLatinDigits(value).replace(/[^0-9]/g, '');

function RequestModal({ offer, book, onClose }: { offer: BookOffer; book: BookDetail; onClose: () => void }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const create = useCreateBookRequest();
  const [quantity, setQuantity] = useState(1);
  const [delivery, setDelivery] = useState<BookDelivery>(offer.deliveryOptions[0]);
  const [offered, setOffered] = useState('');
  const [note, setNote] = useState('');

  const unit = digits(offered) ? BigInt(digits(offered)) : BigInt(offer.price);
  const shipping = delivery === 'IN_PERSON' ? 0n : offer.shippingCost ? BigInt(offer.shippingCost) : 0n;
  const total = unit * BigInt(quantity) + shipping;

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await create.mutateAsync({
        offerId: offer.id,
        quantity,
        deliveryMethod: delivery,
        offeredPrice: offer.negotiable && digits(offered) ? digits(offered) : undefined,
        note: note.trim() || undefined,
      });
      showToast(t.bookshop.requestSent, 'success');
      onClose();
      navigate('/dashboard/book-purchases');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t.bookshop.requestTitle}>
      {!user ? (
        <Link to="/login" state={{ from: { pathname: location.pathname } }}>
          <Button>{t.bookshop.signInToBuy}</Button>
        </Link>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="flex gap-3">
            <div className="w-16 shrink-0">
              <BookCover url={offer.photos[0] ? offerPhotoPath(offer.photos[0].id) : book.coverUrl} title={book.title} size="sm" />
            </div>
            <div>
              <p className="font-semibold text-text-primary">{book.title}</p>
              <p className="text-sm text-text-secondary">{namesText(book.authors, locale)}</p>
              <div className="mt-1 flex items-center gap-2">
                <GradeBadge grade={offer.grade} />
                <span className="text-sm font-semibold text-text-primary">{money(offer.price, offer.currency, locale, t)}</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-text-tertiary">{t.bookshop.requestIntro}</p>
          {offer.quantity > 1 && (
            <FormField label={t.bookshop.quantity} htmlFor="req-qty">
              <Input id="req-qty" type="number" min={1} max={offer.quantity} className="ltr w-28" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(offer.quantity, Number(e.target.value) || 1)))} />
            </FormField>
          )}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text-primary">{t.bookshop.chooseDelivery}</legend>
            <div className="flex flex-wrap gap-3">
              {offer.deliveryOptions.map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm text-text-secondary">
                  <input type="radio" name="req-delivery" checked={delivery === option} onChange={() => setDelivery(option)} />
                  {t.bookshop.delivery[option]}
                </label>
              ))}
            </div>
          </fieldset>
          {offer.negotiable && (
            <FormField label={t.bookshop.yourPrice} htmlFor="req-price" hint={t.bookshop.yourPriceHint}>
              <Input id="req-price" inputMode="numeric" className="ltr" value={offered} onChange={(e) => setOffered(e.target.value)} />
            </FormField>
          )}
          <FormField label={t.bookshop.noteToSeller} htmlFor="req-note">
            <TextArea id="req-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
          <dl className="grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-3 text-sm">
            {delivery !== 'IN_PERSON' && (
              <>
                <dt className="text-text-secondary">{t.bookshop.shipping}</dt>
                <dd className="text-end text-text-primary">
                  {offer.shippingCost === null ? t.bookshop.shippingAsk : money(shipping.toString(), offer.currency, locale, t) ?? t.bookshop.shippingFree}
                </dd>
              </>
            )}
            <dt className="font-medium text-text-primary">{t.bookshop.total}</dt>
            <dd className="text-end font-semibold text-text-primary">{money(total.toString(), offer.currency, locale, t)}</dd>
          </dl>
          <Button type="submit" isLoading={create.isPending}>
            {t.bookshop.sendRequest}
          </Button>
        </form>
      )}
    </Modal>
  );
}
