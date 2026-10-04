import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * The tracking box answers for every intake, and the browser has to know them all.
 *
 * This is a contract test with no request in it, because the bug it exists to
 * catch had no failing request either. Consultations were added to the server's
 * resolver and not to the union the browser narrows on, so a perfectly valid
 * consultation code came back 200 and the page rendered nothing at all — no
 * result, no error, no spinner. A silent blank is the worst possible answer to
 * somebody who is trying to find out what happened to their request.
 *
 * So: the kinds this route can emit are read out of the source, and a fifth
 * intake added here fails until somebody says what the browser should do with
 * it.
 */

const KINDS_THE_BROWSER_HANDLES = ['insurance', 'project', 'resume', 'consultation'];

describe('the tracking route', () => {
  it('emits only kinds the browser knows how to render', () => {
    const route = readFileSync(new URL('../services/tracking.service.ts', import.meta.url), 'utf8');

    // Both spellings the file uses: the three that name their kind inline, and
    // the consultation service which names its own.
    const inline = [...route.matchAll(/kind: '(\w+)'/g)].map((m) => m[1]);
    const services = [...route.matchAll(/(\w+)Service\.track\w+\(code\)/g)].map((m) => m[1]);

    expect(inline.length).toBeGreaterThan(0);
    for (const kind of inline) {
      expect(KINDS_THE_BROWSER_HANDLES, `kind '${kind}' is emitted here`).toContain(kind);
    }

    // One resolver per intake, and one entry in the list above for each.
    expect(services.length).toBe(KINDS_THE_BROWSER_HANDLES.length);
  });

  it('still carries a kind on the branch that does not write one here', () => {
    // Three branches attach their kind in this file; the consultation service
    // attaches its own, so nothing in the route names it. That is precisely
    // the branch the browser was missing, so it is asserted where it lives.
    const service = readFileSync(
      new URL('../services/consultation.service.ts', import.meta.url),
      'utf8'
    );

    expect(service).toContain("kind: 'consultation' as const");
    expect(KINDS_THE_BROWSER_HANDLES).toContain('consultation');
  });
});
