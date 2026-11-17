#!/usr/bin/env node
/**
 * CI's dependency gate: `npm audit` at high severity, with a short, dated list
 * of advisories that are knowingly accepted.
 *
 * An exception belongs here only when no patched version exists and the
 * package never reaches runtime code. Each one expires, and an expired one
 * fails the gate again so that it is looked at, not forgotten. A runtime
 * dependency is never excepted: `--omit=dev` findings always fail.
 *
 * Run from a project directory: `node ../scripts/audit-gate.mjs`.
 */
import { execSync } from 'node:child_process';

const ACCEPTED = [
  {
    id: 'GHSA-fc5q-39xc-vjpf',
    package: 'picomatch',
    reason:
      'ReDoS on crafted extglobs. Every release up to 4.0.7 (latest) is affected and there is no fix; it is reached only through build and test tooling (vite, vitest, eslint, tinyglobby), which match our own fixed glob patterns.',
    expires: '2026-12-31',
  },
];

const BLOCKING = new Set(['high', 'critical']);
const today = new Date().toISOString().slice(0, 10);

function audit(extra = []) {
  let out;
  try {
    // The arguments are fixed strings from this file, never input.
    out = execSync(['npm audit --json', ...extra].join(' '), { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    // npm audit exits non-zero whenever it finds anything; the JSON is still on stdout.
    out = error.stdout;
  }
  const report = JSON.parse(out);
  if (report.error) throw new Error(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`);
  return report.vulnerabilities ?? {};
}

/** The advisories behind the report, one entry per (advisory, package). */
function advisories(vulnerabilities) {
  const found = [];
  for (const [name, entry] of Object.entries(vulnerabilities)) {
    for (const via of entry.via) {
      if (typeof via !== 'object') continue;
      const id = via.url?.split('/').pop() ?? String(via.source);
      found.push({ id, package: name, severity: via.severity, title: via.title, url: via.url });
    }
  }
  return found;
}

const problems = [];

for (const item of advisories(audit(['--omit=dev']))) {
  if (BLOCKING.has(item.severity)) problems.push(`runtime ${item.severity}: ${item.package} ${item.id} ${item.title}`);
}

for (const item of advisories(audit())) {
  if (!BLOCKING.has(item.severity)) continue;
  const accepted = ACCEPTED.find((a) => a.id === item.id && a.package === item.package);
  if (!accepted) {
    problems.push(`${item.severity}: ${item.package} ${item.id} ${item.title} (${item.url})`);
  } else if (accepted.expires < today) {
    problems.push(`exception expired ${accepted.expires}: ${item.package} ${item.id}; check for a fix or renew it with a reason`);
  } else {
    console.log(`accepted until ${accepted.expires}: ${item.package} ${item.id}`);
  }
}

if (problems.length) {
  console.error(`Dependency audit failed:\n  ${[...new Set(problems)].join('\n  ')}`);
  process.exit(1);
}
console.log('Dependency audit passed.');
