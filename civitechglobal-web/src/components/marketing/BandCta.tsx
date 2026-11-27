import { Link } from 'react-router';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

interface BandCtaProps {
  /** Small accent line above the title; omitted when not given. */
  eyebrow?: string;
  title: string;
  body?: string;
  primaryLabel: string;
  primaryTo: string;
  /** The quiet path beside the primary ask; both or neither. */
  secondaryLabel?: string;
  secondaryTo?: string;
}

/**
 * The page closer every public page ends with: one decisive ask on the deep
 * indigo band — the same surface the footer stands on. Lemon pill for the
 * primary path (aqua at night), a white-bordered ghost beside it for the
 * reader who is not ready yet. One primary CTA per view means this band owns
 * the page's single primary-pill once it is present.
 */
export function BandCta({
  eyebrow,
  title,
  body,
  primaryLabel,
  primaryTo,
  secondaryLabel,
  secondaryTo,
}: BandCtaProps) {
  return (
    <section className="py-12">
      <AnimatedSection>
        <div className="rounded-[var(--radius-feature)] bg-band px-6 py-14 text-center text-band-fg shadow-soft-lg sm:px-12">
          {eyebrow && <p className="eyebrow justify-center">{eyebrow}</p>}
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold text-white sm:text-4xl">
            {title}
          </h2>
          {body && <p className="mx-auto mt-4 max-w-2xl leading-loose">{body}</p>}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to={primaryTo} className="primary-pill">
              {primaryLabel}
            </Link>
            {secondaryLabel && secondaryTo && (
              <Link
                to={secondaryTo}
                className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full border border-white/50 px-7 py-2.5 font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
              >
                {secondaryLabel}
              </Link>
            )}
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}
