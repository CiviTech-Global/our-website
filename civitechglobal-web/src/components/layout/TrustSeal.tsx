/**
 * The ENAMAD (اینماد) trust seal.
 *
 * The markup below is supplied by ENAMAD and must appear exactly as issued.
 * Their panel fetches the page and checks for it, and the seal is a state
 * mark: altering it, or swapping in our own copy of the logo, is an offence
 * under Iranian law, not merely a policy breach. So it is injected verbatim
 * rather than rewritten as JSX, where the compiler would quietly normalise
 * `referrerpolicy` to `referrerPolicy` and might drop the non-standard `code`
 * attribute their verification reads.
 *
 * dangerouslySetInnerHTML is safe here for the usual reason it is not: the
 * string is a constant in this file. No part of it comes from a user, a route
 * or an API response, so there is nothing to inject.
 *
 * The image is loaded from trustseal.enamad.ir, which is why nginx.conf's
 * img-src names that host — without it the seal is blocked and the check
 * fails while the page looks fine.
 */
const ENAMAD_MARKUP = `<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=7802250&Code=H3YASD8X7ByfZyyLN4APTEuaxxzYPeCw'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=7802250&Code=H3YASD8X7ByfZyyLN4APTEuaxxzYPeCw' alt='' style='cursor:pointer' code='H3YASD8X7ByfZyyLN4APTEuaxxzYPeCw'></a>`;

export function TrustSeal({ className }: { className?: string }) {
  return (
    <div
      className={className}
      // The seal has its own fixed dimensions from ENAMAD; the wrapper only
      // places it and never scales it.
      dangerouslySetInnerHTML={{ __html: ENAMAD_MARKUP }}
    />
  );
}
