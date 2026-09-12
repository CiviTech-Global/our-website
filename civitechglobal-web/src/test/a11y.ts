import axe, { type AxeResults, type RunOptions } from 'axe-core';
import { expect } from 'vitest';

/**
 * Runs axe over a rendered tree and fails with something you can act on.
 *
 * ARIA in this codebase is applied by hand across forty-odd files and has
 * never been asserted, which means it can only ever have been right by
 * accident. axe checks the rules that are machine-checkable — contrast,
 * labels, roles, names, landmark structure — which is not all of
 * accessibility but is the part that regresses silently.
 */

/**
 * Rules disabled with a reason, never because they were inconvenient.
 *
 * These two fail on a fragment because they are properties of a whole
 * document, and every test here renders a component into a bare div.
 * A full-page audit belongs in the browser suite, where there is a real page.
 */
const FRAGMENT_EXEMPT = [
  'region',
  'page-has-heading-one',
  // Contrast needs real layout and computed colours, and jsdom has neither —
  // axe throws rather than reporting. This is a genuine gap in what this suite
  // can see, not a rule anyone decided to ignore; it wants a browser.
  'color-contrast',
];

export interface A11yOptions {
  /** Extra rule ids to disable. Each one needs a comment saying why. */
  disable?: string[];
}

export async function expectNoA11yViolations(
  container: HTMLElement,
  options: A11yOptions = {},
): Promise<void> {
  const runOptions: RunOptions = {
    rules: Object.fromEntries(
      [...FRAGMENT_EXEMPT, ...(options.disable ?? [])].map((id) => [id, { enabled: false }]),
    ),
  };

  const results: AxeResults = await axe.run(container, runOptions);

  if (results.violations.length === 0) {
    expect(results.violations).toHaveLength(0);
    return;
  }

  // The default axe output is a wall of nested objects. This prints the rule,
  // the plain-language reason, and the offending markup — which is what
  // somebody needs to fix it.
  const report = results.violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => `      ${node.html}\n      ${node.failureSummary?.replace(/\n/g, '\n      ')}`)
        .join('\n');
      return `  [${violation.id}] ${violation.help}\n    ${violation.helpUrl}\n${nodes}`;
    })
    .join('\n\n');

  throw new Error(
    `${results.violations.length} accessibility violation(s):\n\n${report}\n`,
  );
}
