/**
 * Specialities and languages on an expert are typed as one line and stored as
 * a list. People separate them with whatever their keyboard offers: a Latin or
 * Persian comma, a semicolon (Persian `؛` is one key away from `،`), or a new
 * line when pasting from a CV. Every one of those is a separator here, so a
 * pasted list is never sent as a single over-long item.
 */
export function splitTags(value: string): string[] {
  return value
    .split(/[,،;؛\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** The server's limits on an expert's tags; keep in step with consultation.routes.ts. */
export const EXPERT_TAG_LIMITS = {
  specialityLength: 100,
  specialities: 20,
  languageLength: 40,
  languages: 10,
} as const;

/** The first item longer than `max`, so the form can name it instead of a bare 400. */
export function firstTooLong(items: string[], max: number): string | undefined {
  return items.find((item) => item.length > max);
}
