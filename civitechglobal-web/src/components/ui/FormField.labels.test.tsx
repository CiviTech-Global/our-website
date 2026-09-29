import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every FormField names the control it sits above.
 *
 * FormField renders `<label htmlFor={...}>`. Left out, the label names
 * nothing: a screen reader announces an unnamed box, and nothing else goes
 * wrong — which is why twenty-eight of them accumulated unnoticed in the
 * newest screens while the two hundred older ones were fine.
 *
 * The second symptom is what makes this worth a test rather than a review
 * note: a field with no accessible name cannot be asked for by name in a test
 * either, so the gap quietly makes the code around it harder to cover, and
 * the tests that do get written reach for positions in the DOM instead.
 *
 * Read from the source rather than rendered, because the point is to catch a
 * new one the day it is written, wherever it is written, without waiting for
 * somebody to have tested that screen.
 */

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) tsxFiles(full, out);
    else if (full.endsWith('.tsx') && !full.includes('.test.')) out.push(full);
  }
  return out;
}

/** The FormField opening tags in one file, each flattened to a single string. */
function openingTags(source: string): string[] {
  const lines = source.split('\r\n').join('\n').split('\n');
  const tags: string[] = [];

  lines.forEach((line, i) => {
    if (!line.includes('<FormField')) return;
    let tag = '';
    for (let j = i; j < Math.min(i + 10, lines.length); j += 1) {
      tag += lines[j];
      if (lines[j].includes('>')) break;
    }
    tags.push(tag);
  });

  return tags;
}

describe('form fields', () => {
  it('every one names its control', () => {
    const offenders: string[] = [];
    let total = 0;

    for (const file of tsxFiles('src')) {
      for (const tag of openingTags(readFileSync(file, 'utf8'))) {
        total += 1;
        if (tag.includes('htmlFor')) continue;
        const label = /label=\{([^}]*)\}/.exec(tag)?.[1] ?? '(unknown)';
        offenders.push(`${file}: ${label.trim()}`);
      }
    }

    // The count guards the finder itself: a refactor that renamed FormField
    // would otherwise turn this into a test that passes by looking at nothing.
    expect(total).toBeGreaterThan(200);
    expect(offenders).toEqual([]);
  });
});
