/**
 * Sheba (شبا), the Iranian IBAN. One canonical form everywhere it is stored or
 * sent to a gateway: uppercase, no spaces, no dashes. People type it with
 * spaces in fours and occasionally in Persian digits, so callers validate at
 * the edge (the zod schemas) and this only normalises.
 */

export const SHEBA_PATTERN = /^IR\d{24}$/;

export function normalizeIban(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

export function isValidSheba(value: string): boolean {
  return SHEBA_PATTERN.test(normalizeIban(value));
}
