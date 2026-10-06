/**
 * How a company appears on a job card: its slug, name and logo, or nothing
 * when staff have hidden its page. Kept apart from company.service so the card
 * module can use it without an import cycle.
 */

export const logoUrl = (id: string, storedName: string | null) => (storedName ? `/jobs/companies/${id}/logo` : null);
export const coverUrl = (id: string, storedName: string | null) =>
  storedName ? `/jobs/companies/${id}/cover` : null;

/** The few fields a job row carries of its company. */
export const companySummarySelect = {
  id: true,
  slug: true,
  name: true,
  logoStoredName: true,
  hidden: true,
} as const;

export function presentCompanySummary(
  company: { id: string; slug: string; name: string; logoStoredName: string | null; hidden: boolean } | null,
) {
  if (!company || company.hidden) return null;
  return {
    slug: company.slug,
    name: company.name,
    logoUrl: logoUrl(company.id, company.logoStoredName),
  };
}
