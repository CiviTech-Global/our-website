import logoSrc from '@/assets/logos/concept logo - no bg - white.png';
import { useLocale } from '@/i18n/LocaleProvider';

/** The points of a regular octagon, flat side up, around the plan's centre. */
function octagon(radius: number): string {
  return Array.from({ length: 8 }, (_, i) => {
    const angle = ((22.5 + i * 45) * Math.PI) / 180;
    return `${(200 + radius * Math.cos(angle)).toFixed(1)},${(200 + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
}

/**
 * The hero's garden: a chahar bagh seen from above, with the company at its
 * centre.
 *
 * A square plan quartered by two water channels, a girih star planted in each
 * quarter, and where the channels cross — the place a Persian garden puts its
 * pavilion — a large octagonal pool holding the logo. The pool is most of the
 * picture on purpose: the eye goes to the centre of a symmetric plan, so the
 * logo is where attention settles.
 *
 * Pure SVG in the theme's tokens, so it follows dark mode. Only the ring of
 * stars turns, very slowly, and it stops for reduced motion (index.css).
 */
export function HeroMotif() {
  const { t } = useLocale();
  const star = 'M0,-26 L7,-9 L26,-9 L11,3 L16,22 L0,11 L-16,22 L-11,3 L-26,-9 L-7,-9 Z';
  const corners: Array<[number, number]> = [
    [86, 86],
    [314, 86],
    [86, 314],
    [314, 314],
  ];

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md lg:max-w-[35rem]">
      <svg viewBox="0 0 400 400" className="size-full" aria-hidden="true">
        {/* The walled plot. */}
        <rect
          x="12"
          y="12"
          width="376"
          height="376"
          rx="32"
          className="fill-surface-50 stroke-border-strong dark:fill-surface-100"
          strokeWidth="1.5"
        />
        {/* Four planted quarters, a star in each outer corner. */}
        {corners.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <rect
              x={x < 200 ? 28 : 212}
              y={y < 200 ? 28 : 212}
              width="160"
              height="160"
              rx="20"
              className="fill-brand-green-50 stroke-brand-green-200 dark:fill-brand-green-950 dark:stroke-brand-green-800"
            />
            <g transform={`translate(${x} ${y})`}>
              <path d={star} className="fill-none stroke-brand-green-500 dark:stroke-brand-green-400" strokeWidth="1.5" />
              <path d={star} transform="rotate(36) scale(0.5)" className="fill-brand-amber-300 dark:fill-brand-amber-400" opacity="0.8" />
            </g>
          </g>
        ))}
        {/* The two channels. */}
        <rect x="190" y="24" width="20" height="352" rx="10" className="fill-brand-lapis-300 dark:fill-brand-lapis-700" opacity="0.6" />
        <rect x="24" y="190" width="352" height="20" rx="10" className="fill-brand-lapis-300 dark:fill-brand-lapis-700" opacity="0.6" />
        {/* A halo of tile rings around the pool. */}
        <polygon points={octagon(150)} className="fill-none stroke-brand-green-300 dark:stroke-brand-green-700" strokeDasharray="3 7" />
        <polygon points={octagon(136)} className="fill-brand-green-50/80 stroke-brand-green-200 dark:fill-brand-green-950/80 dark:stroke-brand-green-800" />
        {/* The turning ring of stars. */}
        <g className="ct-spin-slow" style={{ transformOrigin: '200px 200px' }}>
          {Array.from({ length: 8 }, (_, i) => (
            <path
              key={i}
              d={star}
              transform={`rotate(${i * 45 + 22.5} 200 200) translate(200 64) scale(0.36)`}
              className="fill-brand-green-500 dark:fill-brand-green-400"
            />
          ))}
        </g>
        {/* The pool. */}
        <polygon points={octagon(120)} className="fill-brand-lapis-600 stroke-brand-lapis-800 dark:fill-brand-lapis-500 dark:stroke-brand-lapis-300" strokeWidth="3" />
        <polygon points={octagon(108)} className="fill-none stroke-white/25" strokeWidth="1.5" />
      </svg>
      {/* The logo, the centre of attention: about 45% of the garden. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img src={logoSrc} alt={t.common.brand} className="ct-pulse-soft w-[45%] object-contain drop-shadow-[0_6px_14px_oklch(20%_0.08_264/0.45)]" />
      </div>
    </div>
  );
}
