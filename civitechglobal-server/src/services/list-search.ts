/**
 * Free-text search across a handful of columns, as Prisma `where` input.
 *
 * Every queue in the admin needed the same thing — "find the row I am holding
 * a name or a code for" — and each would otherwise have written its own OR of
 * `contains` clauses, with its own answer to nested relations, its own
 * treatment of blank input, and its own chance of forgetting `insensitive`.
 * Persian has no case, but the emails, codes and Latin names sitting beside it
 * in the same column do, and a search for "ACME" that misses "Acme" reads as a
 * broken filter rather than a case-sensitive one.
 *
 * `contains` and not full-text search: these are short, high-cardinality
 * columns (a title, a code, an email) on tables in the thousands, where the
 * substring match is what a person actually wants — typing part of a code
 * should find it — and a tsvector would need stemming per language to beat it.
 * If a queue ever outgrows that, this is the one place that has to change.
 */

/** A column, or a path through relations to one: 'title', or ['seller','email']. */
export type SearchPath = string | readonly string[];

function clause(path: SearchPath, term: string): Record<string, unknown> {
  const segments = typeof path === 'string' ? [path] : path;
  // Built from the leaf outwards, so ['seller','email'] nests into
  // { seller: { email: { contains } } } — which is how Prisma expresses a
  // filter on a related row.
  return segments.reduceRight<Record<string, unknown>>(
    (inner, segment) => ({ [segment]: inner }),
    { contains: term, mode: 'insensitive' } as unknown as Record<string, unknown>
  );
}

/**
 * The fragment to spread into a `where`, or nothing at all.
 *
 * Nothing at all is the important half: a blank box, or one holding only
 * spaces, must not narrow the list. Returning `{}` rather than `{ OR: [] }`
 * matters because Prisma reads an empty OR as "match no rows", which would
 * turn a stray space into an empty queue.
 */
export function searchWhere(term: string | undefined | null, paths: readonly SearchPath[]) {
  const trimmed = term?.trim();
  if (!trimmed || paths.length === 0) return {};
  return { OR: paths.map((path) => clause(path, trimmed)) };
}
