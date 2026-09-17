/** 1, 2, 5, 10, 20, 50… — the smallest clean ceiling at or above the busiest day. */
export function niceCeiling(max: number): number {
  if (max <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 4, 5, 10]) {
    if (step * magnitude >= max) return step * magnitude;
  }
  return 10 * magnitude;
}
