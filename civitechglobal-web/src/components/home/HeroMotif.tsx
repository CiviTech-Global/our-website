import logoSrc from '@/assets/logos/concept logo - no bg - white.png';
import { useLocale } from '@/i18n/LocaleProvider';

/**
 * The hero's garden: a chahar bagh seen from above.
 *
 * A square plan quartered by two water channels, an octagonal pool where they
 * cross, and a girih star planted in each quarter — the Persian garden's own
 * order, a grid with living things inside it, which is what the whole design
 * language is named for. The logo sits in the pool.
 *
 * Pure SVG in the theme's tokens, so it follows dark mode. Only the outer
 * star ring turns, very slowly, and it stops for reduced motion (index.css).
 */
export function HeroMotif() {
  const { t } = useLocale();
  const star = 'M0,-26 L7,-9 L26,-9 L11,3 L16,22 L0,11 L-16,22 L-11,3 L-26,-9 L-7,-9 Z';
  const quarters: Array<[number, number]> = [
    [110, 110],
    [290, 110],
    [110, 290],
    [290, 290],
  ];

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      <svg viewBox="0 0 400 400" className="size-full" role="img" aria-label={t.common.brand}>
        {/* The walled plot. */}
        <rect
          x="24"
          y="24"
          width="352"
          height="352"
          rx="28"
          fill="var(--color-surface-50)"
          stroke="var(--color-border-strong)"
          strokeWidth="1.5"
        />
        {/* Four planted quarters. */}
        {quarters.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <rect
              x={x - 70}
              y={y - 70}
              width="140"
              height="140"
              rx="18"
              className="fill-brand-green-50 stroke-brand-green-200 dark:fill-brand-green-950 dark:stroke-brand-green-800"
            />
            <g transform={`translate(${x} ${y})`}>
              <path d={star} fill="none" className="stroke-brand-green-500 dark:stroke-brand-green-400" strokeWidth="1.5" />
              <path d={star} transform="rotate(36) scale(0.55)" fill="var(--color-brand-amber-300)" opacity="0.7" />
              <circle r="44" fill="none" className="stroke-brand-green-300 dark:stroke-brand-green-700" strokeDasharray="2 6" />
            </g>
          </g>
        ))}
        {/* The two channels. */}
        <rect x="190" y="40" width="20" height="320" rx="10" className="fill-brand-lapis-300 dark:fill-brand-lapis-700" opacity="0.6" />
        <rect x="40" y="190" width="320" height="20" rx="10" className="fill-brand-lapis-300 dark:fill-brand-lapis-700" opacity="0.6" />
        {/* The turning ring of stars around the pool. */}
        <g className="ct-spin-slow" style={{ transformOrigin: '200px 200px' }}>
          {Array.from({ length: 8 }, (_, i) => (
            <path
              key={i}
              d={star}
              transform={`rotate(${i * 45} 200 200) translate(200 128) scale(0.32)`}
              fill="var(--color-brand-green-400)"
            />
          ))}
        </g>
        {/* The pool. */}
        <polygon
          points="200,142 241,159 258,200 241,241 200,258 159,241 142,200 159,159"
          fill="var(--color-brand-lapis-500)"
          stroke="var(--color-brand-lapis-700)"
          strokeWidth="2"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <img src={logoSrc} alt="" className="size-20 object-contain" />
      </div>
    </div>
  );
}
