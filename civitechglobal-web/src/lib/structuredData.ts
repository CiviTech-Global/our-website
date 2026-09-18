import type { PublicBookDetail, PublicJobDetail } from '@/types/marketplace';

/**
 * Structured data — the part of a page written for machines.
 *
 * Search engines read prose well enough to rank it and badly enough to
 * summarise it. JSON-LD states the same facts unambiguously: that this is a
 * company and these are its addresses, that this page is a job opening with a
 * salary and a closing date, that this page sits three levels down a named
 * path. What it buys is the richer result — a job in Google's jobs panel, a
 * breadcrumb trail instead of a raw URL, a knowledge panel for the company.
 *
 * Everything here describes what is actually on the page. Structured data that
 * claims more than the page shows is the one SEO mistake with a real penalty
 * attached, and the honest version costs nothing extra.
 */

/** ISO 3166 alpha-2 for the one country the company operates from. */
const COUNTRY = 'IR';

export interface OrganizationFacts {
  name: string;
  legalName: string;
  description: string;
  origin: string;
  logo: string;
  /** Profile and repository pages that are unambiguously this organisation. */
  sameAs?: string[];
}

export function organizationSchema(facts: OrganizationFacts): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: facts.name,
    legalName: facts.legalName,
    url: facts.origin,
    logo: `${facts.origin}${facts.logo}`,
    description: facts.description,
    address: { '@type': 'PostalAddress', addressCountry: COUNTRY },
    // No email and no telephone: there is no mail service behind an address
    // and no published number, and inventing either here would put a dead
    // contact route into a knowledge panel.
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${facts.origin}/contact`,
      availableLanguage: ['fa', 'en', 'tr', 'de', 'fr', 'es'],
    },
    ...(facts.sameAs?.length ? { sameAs: facts.sameAs } : {}),
  };
}

/** The site itself, so a search engine can name it rather than the domain. */
export function websiteSchema(facts: { name: string; origin: string; locale: string }): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: facts.name,
    url: facts.origin,
    inLanguage: facts.locale,
    publisher: { '@type': 'Organization', name: facts.name, url: facts.origin },
  };
}

/**
 * The trail above the current page.
 *
 * Replaces the bare URL in a search result with a readable path, and tells a
 * crawler how the sections nest — which a flat set of links on a single-page
 * app does not otherwise say anywhere.
 */
export function breadcrumbSchema(
  origin: string,
  trail: Array<{ name: string; path: string }>
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: `${origin}${step.path}`,
    })),
  };
}

const EMPLOYMENT_TYPE: Record<string, string> = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CONTRACT: 'CONTRACTOR',
  INTERNSHIP: 'INTERN',
  FREELANCE: 'CONTRACTOR',
};

/**
 * A job opening, in the shape Google's job search reads.
 *
 * Two fields decide whether a posting is eligible at all: `datePosted` and an
 * identifiable `hiringOrganization`. A posting still in draft has no
 * `publishedAt`, so it returns null rather than a schema claiming it was posted
 * at the epoch.
 *
 * Salary is stated only when the poster stated it. `salaryUndisclosed` means
 * the range on record is private, and publishing it in markup a visitor cannot
 * see would leak exactly what that flag exists to withhold.
 */
export function jobPostingSchema(
  job: PublicJobDetail,
  options: { origin: string; url: string; locale: string; siteName: string }
): object | null {
  if (!job.publishedAt) return null;

  const remote = job.workArrangement === 'REMOTE';
  const salary =
    !job.salaryUndisclosed && (job.salaryMin || job.salaryMax)
      ? {
          estimatedSalary: {
            '@type': 'MonetaryAmount',
            currency: job.currency,
            value: {
              '@type': 'QuantitativeValue',
              ...(job.salaryMin ? { minValue: Number(job.salaryMin) } : {}),
              ...(job.salaryMax ? { maxValue: Number(job.salaryMax) } : {}),
              unitText: 'MONTH',
            },
          },
        }
      : {};

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    identifier: { '@type': 'PropertyValue', name: job.companyName ?? options.siteName, value: job.code },
    datePosted: job.publishedAt,
    ...(job.closesAt ? { validThrough: job.closesAt } : {}),
    employmentType: EMPLOYMENT_TYPE[job.employmentType] ?? 'OTHER',
    inLanguage: options.locale,
    url: options.url,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.companyName ?? options.siteName,
      sameAs: options.origin,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: COUNTRY,
        ...(job.province ? { addressRegion: job.province } : {}),
        ...(job.city ? { addressLocality: job.city } : {}),
      },
    },
    // Google requires this pair together for a remote listing; without them a
    // remote job is filtered out of location-based searches entirely.
    ...(remote
      ? { jobLocationType: 'TELECOMMUTE', applicantLocationRequirements: { '@type': 'Country', name: COUNTRY } }
      : {}),
    ...(job.skills.length ? { skills: job.skills.join(', ') } : {}),
    ...salary,
  };
}

/**
 * One book on offer, as a Book with an Offer attached.
 *
 * Book rather than Product because that is what search engines index for
 * something with an author and an ISBN, and the ISBN is the identifier that
 * lets a result be matched against every other copy of the same edition.
 *
 * The offer's availability is InStock for exactly as long as the listing is
 * open — this market has no stock count, and a second-hand book is one copy.
 * itemCondition uses schema.org's own vocabulary so "used" is not guessed at
 * from a free-text word.
 */
export function bookListingSchema(
  book: PublicBookDetail,
  options: { url: string; locale: string; sellerName: string; imageUrl?: string | null },
): object | null {
  if (!book.publishedAt) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: { '@type': 'Person', name: book.bookAuthor },
    description: book.description,
    url: options.url,
    inLanguage: book.language ?? options.locale,
    ...(book.isbn ? { isbn: book.isbn } : {}),
    ...(book.publisher ? { publisher: { '@type': 'Organization', name: book.publisher } } : {}),
    ...(book.publishYear ? { datePublished: String(book.publishYear) } : {}),
    ...(book.pageCount ? { numberOfPages: book.pageCount } : {}),
    ...(options.imageUrl ? { image: options.imageUrl } : {}),
    offers: {
      '@type': 'Offer',
      price: Number(book.price),
      priceCurrency: book.currency,
      itemCondition:
        book.condition === 'NEW'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/UsedCondition',
      availability: 'https://schema.org/InStock',
      url: options.url,
      seller: { '@type': 'Organization', name: options.sellerName },
    },
  };
}
