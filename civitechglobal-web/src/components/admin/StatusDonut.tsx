const SEGMENT_COLORS = ['#10b981', '#f59e0b', '#0ea5e9', '#a78bfa', '#ef4444', '#64748b'];

export interface StatusDonutProps {
  data: { label: string; value: number }[];
  size?: number;
}

/** A dependency-free SVG donut chart for status breakdowns — no chart library needed. */
export function StatusDonut({ data, size = 180 }: StatusDonutProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2;
  const strokeWidth = size * 0.16;
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;

  let offsetAccum = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Status breakdown chart">
        <circle
          cx={radius}
          cy={radius}
          r={innerRadius}
          fill="none"
          stroke="var(--color-surface-200)"
          strokeWidth={strokeWidth}
        />
        {total > 0 &&
          data.map((segment, i) => {
            const fraction = segment.value / total;
            const dash = fraction * circumference;
            const dashArray = `${dash} ${circumference - dash}`;
            const dashOffset = -offsetAccum;
            offsetAccum += dash;
            if (segment.value === 0) return null;
            return (
              <circle
                key={segment.label}
                cx={radius}
                cy={radius}
                r={innerRadius}
                fill="none"
                stroke={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${radius} ${radius})`}
                strokeLinecap="butt"
              />
            );
          })}
        <text
          x={radius}
          y={radius}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-current text-text-primary"
          fontSize={size * 0.16}
          fontWeight="700"
        >
          {total}
        </text>
      </svg>
      <ul className="flex flex-col gap-2 text-sm">
        {data.map((segment, i) => (
          <li key={segment.label} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
              aria-hidden="true"
            />
            <span className="text-text-secondary">{segment.label}</span>
            <span className="font-medium text-text-primary">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
