import { useLocale } from '@/i18n/LocaleProvider';

/**
 * The industries strip: an edge-masked, pure-CSS marquee of the sectors the
 * studio builds for, sitting between the trust bar and the pain point.
 *
 * The animated track is decorative and hidden from assistive technology; a
 * visually-hidden static list right before it is what a screen reader gets,
 * so the sectors are heard once, in order, instead of as an endless loop.
 * Under reduced motion the global kill-switch stops the slide and the track
 * rests as a wrapped, centred row (handled in index.css).
 */
export function IndustryMarquee() {
  const { t } = useLocale();
  const industries = t.home.industries;

  return (
    <section className="py-6">
      <h2 className="sr-only">{t.home.industriesEyebrow}</h2>
      <ul className="sr-only">
        {industries.map((industry) => (
          <li key={industry}>{industry}</li>
        ))}
      </ul>
      {/* Two copies of the list inside one track slide -50% and loop; the mask
          fades both ends and hovering pauses it. Direction follows the
          document: the RTL keyframes in index.css carry the fa page. */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track items-center gap-4 pe-4">
          {[...industries, ...industries].map((industry, i) => (
            <span
              key={`${industry}-${i}`}
              className="bagh-chip whitespace-nowrap !px-5 !py-1.5 text-sm"
            >
              {industry}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
