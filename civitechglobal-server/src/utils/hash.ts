import { createHash } from 'node:crypto';

/** Deterministic, non-reversible SHA-256 hex digest — used for indexed lookup
 * keys (email, phone) that must stay searchable even if the source field is
 * later encrypted at rest. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
