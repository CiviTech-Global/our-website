import { Link } from 'react-router';
import { BadgeCheck, BookOpen, Star, Truck } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { apiAssetSrc } from '@/lib/apiAsset';
import { categoryName, fill, formatNumber } from '@/lib/jobFormat';
import { money } from '@/lib/workFormat';
import { cn } from '@/lib/utils';
import { namesText } from '@/lib/bookFormat';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import type { BookCard as BookCardData, BookCategory, BookGrade, BookStripItem } from '@/types/bookshop';

/**
 * The pieces every book page shares: the cover, the condition badge, the
 * tile a book is listed as, and the shelf picker.
 *
 * The tile follows Bookshop.org's and BookBub's: the cover is most of it, then
 * title and author, then the price — with the cover price struck through and
 * the saving, when there is one, as BookBub shows a deal.
 */

/** A cover, or a quiet placeholder with the title on it. */
export function BookCover({
  url,
  title,
  className,
  size = 'md',
}: {
  url: string | null | undefined;
  title: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const box = cn(
    'aspect-[2/3] w-full overflow-hidden rounded-lg border border-border-default bg-surface-muted shadow-sm',
    size === 'sm' && 'rounded-md',
    className,
  );
  if (url) {
    return (
      <div className={box}>
        <img src={apiAssetSrc(url)} alt={title} loading="lazy" className="size-full object-cover" />
      </div>
    );
  }
  return (
    <div className={cn(box, 'flex flex-col items-center justify-center gap-2 p-3 text-center text-text-tertiary')}>
      <BookOpen className={size === 'sm' ? 'size-5' : 'size-8'} aria-hidden="true" />
      {size !== 'sm' && <span className="line-clamp-3 text-xs">{title}</span>}
    </div>
  );
}

const GRADE_TONE: Record<BookGrade, 'success' | 'info' | 'default' | 'warning'> = {
  NEW: 'success',
  LIKE_NEW: 'success',
  VERY_GOOD: 'info',
  GOOD: 'default',
  ACCEPTABLE: 'warning',
};

export function GradeBadge({ grade, withHint = false }: { grade: BookGrade; withHint?: boolean }) {
  const { t } = useLocale();
  return (
    <Badge variant={GRADE_TONE[grade]} title={withHint ? t.bookshop.gradeHints[grade] : undefined}>
      {t.bookshop.grades[grade]}
    </Badge>
  );
}

/** The price block: the lowest price, the cover price struck through, the saving. */
export function PriceLine({
  price,
  listPrice,
  currency,
  discountPercent,
  className,
  prefix,
}: {
  price: string | null;
  listPrice?: string | null;
  currency: string;
  discountPercent?: number;
  className?: string;
  prefix?: string;
}) {
  const { t, locale } = useLocale();
  if (!price) return null;
  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      {prefix && <span className="text-xs text-text-tertiary">{prefix}</span>}
      <span className="font-semibold text-text-primary">{money(price, 'IRT', locale, t)}</span>
      {listPrice && discountPercent !== undefined && discountPercent > 0 && (
        <>
          <span className="text-xs text-text-tertiary line-through">{money(listPrice, currency, locale, t)}</span>
          <span className="text-xs font-semibold text-brand-red-600">
            {fill(t.bookshop.discountOff, { percent: formatNumber(discountPercent, locale) })}
          </span>
        </>
      )}
    </p>
  );
}

/** One book on the board. */
export function BookTile({ book, className }: { book: BookCardData; className?: string }) {
  const { t, locale } = useLocale();
  const titleId = `book-${book.id}-title`;
  return (
    <li className={className}>
      <article aria-labelledby={titleId} className="group relative flex h-full flex-col gap-2">
        <div className="relative">
          <BookCover url={book.coverUrl} title={book.title} />
          <div className="absolute start-2 top-2 flex flex-col items-start gap-1">
            {book.discountPercent > 0 && (
              <span className="rounded-md bg-brand-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
                {fill(t.bookshop.discountOff, { percent: formatNumber(book.discountPercent, locale) })}
              </span>
            )}
            {book.featured && (
              <span className="flex items-center gap-0.5 rounded-md bg-brand-amber-400 px-1.5 py-0.5 text-xs font-semibold text-brand-amber-950">
                <Star className="size-3" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <h3 id={titleId} className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary">
            <Link
              to={`/books/${book.code}`}
              className="after:absolute after:inset-0 after:content-[''] group-hover:underline focus-visible:outline-none"
            >
              {book.title}
            </Link>
          </h3>
          <p className="line-clamp-1 text-xs text-text-secondary">{namesText(book.authors, locale)}</p>
          {book.translators.length > 0 && (
            <p className="line-clamp-1 text-xs text-text-tertiary">
              {fill(t.bookshop.translatedBy, { names: namesText(book.translators, locale) })}
            </p>
          )}
          <PriceLine
            className="mt-auto pt-1 text-sm"
            prefix={book.offerCount > 1 ? t.bookshop.from : undefined}
            price={book.lowestPrice}
            listPrice={book.listPrice}
            currency={book.currency}
            discountPercent={book.discountPercent}
          />
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-tertiary">
            <span>{fill(t.bookshop.offersCount, { count: formatNumber(book.offerCount, locale) })}</span>
            {book.bestGrade && <span>· {t.bookshop.grades[book.bestGrade]}</span>}
            {book.freeShipping && (
              <span className="flex items-center gap-0.5 text-brand-green-700 dark:text-brand-green-400">
                <Truck className="size-3" aria-hidden="true" />
                {t.bookshop.freeShipping}
              </span>
            )}
            {book.verified && <BadgeCheck className="size-3.5 text-brand-green-600" aria-label={t.bookshop.verifiedBook} />}
          </p>
        </div>
      </article>
    </li>
  );
}

/** A row of book links: "more by", "from this shelf". */
export function BookStrip({ title, books }: { title: string; books: BookStripItem[] }) {
  const { t, locale } = useLocale();
  if (books.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-lg font-semibold text-text-primary">{title}</h2>
      <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {books.map((book) => (
          <li key={book.id} className="relative flex flex-col gap-1.5">
            <BookCover url={book.coverUrl} title={book.title} size="sm" />
            <Link to={`/books/${book.code}`} className="line-clamp-2 text-xs font-medium text-text-primary after:absolute after:inset-0 hover:underline">
              {book.title}
            </Link>
            <span className="line-clamp-1 text-xs text-text-tertiary">{namesText(book.authors, locale)}</span>
            {book.lowestPrice && (
              <span className="text-xs font-semibold text-text-primary">{money(book.lowestPrice, 'IRT', locale, t)}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Shelves grouped under their parents; choosing a parent matches its children. */
export function BookCategorySelect({
  categories,
  value,
  onChange,
  placeholder,
  id,
  className,
  counts = false,
}: {
  categories: BookCategory[] | undefined;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
  className?: string;
  counts?: boolean;
}) {
  const { locale } = useLocale();
  const label = (category: BookCategory) =>
    counts && category.bookCount > 0
      ? `${categoryName(category, locale)} (${formatNumber(category.bookCount, locale)})`
      : categoryName(category, locale);
  const parents = (categories ?? []).filter((category) => category.parentId === null);
  return (
    <Select id={id} className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {parents.map((parent) => (
        <optgroup key={parent.id} label={categoryName(parent, locale)}>
          <option value={parent.id}>{label(parent)}</option>
          {(categories ?? [])
            .filter((child) => child.parentId === parent.id)
            .map((child) => (
              <option key={child.id} value={child.id}>
                {label(child)}
              </option>
            ))}
        </optgroup>
      ))}
    </Select>
  );
}
