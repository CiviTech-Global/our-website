import logoSrc from '@/assets/logos/concept logo - no bg - white.png';
import { useLocale } from '@/i18n/LocaleProvider';

/**
 * Lightweight abstract hero visual inspired by Persian girih (geometric star)
 * tiling — replaces the old app's 3D globe (three.js) with a pure CSS/SVG
 * animation to keep bundle size small while staying on-brand. The real logo
 * anchors the center in place of a placeholder badge.
 */
export function HeroMotif() {
  const { t } = useLocale();

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-full">
      <div
        className="absolute inset-0 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(16,185,129,0.35), transparent 60%), radial-gradient(circle at 70% 70%, rgba(245,158,11,0.25), transparent 60%)',
        }}
        aria-hidden="true"
      />
      {/* Rotation and pulse are CSS keyframes now: they run on the
          compositor and stop honouring nothing — the global reduced-motion
          rule in index.css covers them. */}
      <svg
        viewBox="0 0 400 400"
        className="ct-spin-slow relative size-full"
        role="img"
        aria-label="Abstract geometric star pattern"
      >
        <defs>
          <linearGradient id="motif-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        {[0, 45, 90, 135].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 200 200)`}>
            <polygon
              points="200,60 240,160 340,160 260,220 290,320 200,260 110,320 140,220 60,160 160,160"
              fill="none"
              stroke="url(#motif-stroke)"
              strokeWidth="1"
              opacity="0.35"
            />
          </g>
        ))}
        <circle cx="200" cy="200" r="130" fill="none" stroke="url(#motif-stroke)" strokeWidth="1" opacity="0.4" />
        <circle cx="200" cy="200" r="90" fill="none" stroke="url(#motif-stroke)" strokeWidth="1" opacity="0.5" />
      </svg>
      <div className="ct-pulse-soft absolute inset-0 flex items-center justify-center">
        <div className="flex size-44 items-center justify-center rounded-full bg-brand-green-500/90 p-3 shadow-soft-lg">
          <img src={logoSrc} alt={t.common.brand} className="size-full object-contain" />
        </div>
      </div>
    </div>
  );
}
