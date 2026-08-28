import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'C:\\Workspace\\civitechglobal\\civitechglobalwebapplication';
const AGENCY_DIR = 'C:\\Workspace\\agency-agents';
const VERIFY_DIR = 'C:\\Workspace\\verifywise\\agents';
const OUT_DIR = path.join(ROOT, 'agent-roster');

const context = JSON.parse(await fs.readFile(path.join(OUT_DIR, 'context.json'), 'utf8'));

const EXCLUDED_DIRS = new Set(['examples', 'scripts', 'integrations', 'strategy', '.github']);
const VERIFY_NAME_OVERRIDES = {
  'agent.md': 'Orchestrator',
  '00-TEAM_WORKFLOW.md': 'Team Workflow',
};
const VERIFY_SLUG_OVERRIDES = {
  'agent.md': 'orchestrator',
  '00-TEAM_WORKFLOW.md': 'team-workflow',
};

function parseFrontmatter(text) {
  const fm = {};
  if (!text.startsWith('---')) return { fm, body: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { fm, body: text };
  const block = text.slice(3, end).trim();
  const body = text.slice(end + 4).trimStart();
  for (const line of block.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    fm[key] = value.replace(/^["']|["']$/g, '');
  }
  return { fm, body };
}

function extractFirstHeading(body) {
  const m = body.match(/^#+\s+(.+)$/m);
  return m ? m[1].replace(/\*+/g, '').trim() : null;
}

function titleCase(slug) {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function makeUniqueSlug(slug, set) {
  let unique = slug;
  let i = 2;
  while (set.has(unique)) {
    unique = `${slug}-${i}`;
    i++;
  }
  set.add(unique);
  return unique;
}

async function listMarkdownFiles(dir, includeDir) {
  const files = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(full);
      }
    }
  }
  await walk(dir);
  return files;
}

function divisionIntro(division, ctx) {
  const { project, services } = ctx;
  const lines = [
    `You are part of the **${division}** division supporting the **${project.name}**.`,
    `The platform is a ${project.description}`,
    `Key services you may touch: **API** (${services.api.framework}, ${services.api.language}), **Bot** (${services.bot.framework}), **Web** (${services.web.framework}, ${services.web.styling}), **Database** (${services.database.engine} via ${services.database.orm}).`,
    `The primary user locale is ${project.primary_language} (${project.locale}), and the UI is **RTL**.`,
  ];
  return lines.join(' ');
}

function collaborationRules(division) {
  const common = [
    'Read the task board and dependency outputs before starting work.',
    'Follow the project-critical rules in `agent-roster/context.json`.',
    'Run lint, type-check, and relevant tests before declaring a task complete.',
    'Escalate blockers to the **Orchestrator** or **Technical Lead** if they cannot be resolved within one feedback cycle.',
  ];
  const byDivision = {
    engineering: [
      'Coordinate with the **Prisma Schema Architect** on model changes.',
      'Route API contract questions to the **API Contract Guardian**.',
      'Hand off UI integration work to the **Frontend Developer** or **UI Designer**.',
    ],
    design: [
      'Validate all RTL/Persian decisions with the **Persian-First UX Linguist**.',
      'Share component specs with **Frontend Developer** and **UX Architect**.',
    ],
    product: [
      'Socialize PRDs with **Engineering**, **Design**, and **Security & Compliance Officer** before approval.',
    ],
    testing: [
      'Derive test cases from PRD acceptance criteria produced by the **Product Manager**.',
      'Report findings to **QA Engineer** lead and file tickets against owning developers.',
    ],
    security: [
      'Review high-risk changes with the **Technical Lead** and **DevOps Engineer**.',
      'Flag PII handling issues to the **Data Privacy Officer** if present in the source roster.',
    ],
    'project-management': [
      'Maintain the task board in sync with the **Orchestrator** and **Technical Lead**.',
    ],
  };
  return [...common, ...(byDivision[division] || [])];
}

function adaptedMarkdown(entry, ctx) {
  const { name, role, division, source, sourcePath, emoji, color, description, body } = entry;
  const project = ctx.project;
  const safeColor = color || 'blue';
  const safeEmoji = emoji || '🤖';
  const rules = ctx.critical_rules.map((r) => `- ${r}`).join('\n');
  const collab = collaborationRules(division).map((r) => `- ${r}`).join('\n');
  const intro = divisionIntro(division, ctx);

  const preamble = `---
name: ${name}
role: ${role}
division: ${division}
version: "1.0.0"
source: ${source}
source_path: ${sourcePath}
original_license: ${source === 'agency-agents' ? 'MIT' : 'verifywise proprietary'}
emoji: ${safeEmoji}
color: ${safeColor}
adapted_for: ${project.name}
status: active
---

# ${safeEmoji} ${name} — ${project.name} Adaptation

> Adapted for the **${project.name}** from \\\`${source}\\\` (\\\`${sourcePath}\\\`).
> The original agent concept is preserved below; the sections above it add project context, collaboration rules, and CiviTech-specific guardrails.

## Project Context

${intro}

## Your Identity

${description || `You are the **${name}**, a specialized agent in the ${division} division.`}

## Your Mission

${description ? `Core focus: ${description}` : 'Execute your assigned tasks with excellence within the CiviTech Global context.'}

## CiviTech-Specific Critical Rules

${rules}

## Collaboration Rules

${collab}

## Escalation Path

1. Try to resolve within your division peer group.
2. If blocked for more than one cycle, escalate to the **Technical Lead**.
3. For scope, roadmap, or cross-division conflicts, escalate to the **Orchestrator**.

## Output Artifacts

- Concise, structured deliverables matching your source role (see "Source Capabilities" below).
- Evidence that lint, type-check, and tests pass before handoff.
- Clear handoff notes for downstream agents.

---

## Source Capabilities

> The following content is the original agent definition. Apply it through the lens of the CiviTech Global context above.

${body}
`;
  return preamble;
}

async function processVerifywise(slugSet) {
  const entries = [];
  const files = await listMarkdownFiles(VERIFY_DIR, false);
  for (const file of files) {
    const base = path.basename(file);
    const raw = await fs.readFile(file, 'utf8');
    const { fm, body } = parseFrontmatter(raw);
    const slug = VERIFY_SLUG_OVERRIDES[base] || base.replace(/\.md$/, '');
    const uniqueSlug = makeUniqueSlug(slug, slugSet);
    const name = VERIFY_NAME_OVERRIDES[base] || (extractFirstHeading(body) || titleCase(uniqueSlug));
    const description = fm.description || '';
    entries.push({
      name,
      role: `${name} Agent`,
      division: 'software-delivery',
      source: 'verifywise/agents',
      sourcePath: path.relative(VERIFY_DIR, file).replace(/\\/g, '/'),
      emoji: fm.emoji || '🧩',
      color: fm.color || 'indigo',
      description,
      body,
      slug: uniqueSlug,
      adapted_path: `agent-roster/software-delivery/${uniqueSlug}.md`,
    });
  }
  return entries;
}

async function processAgency(slugSet) {
  const entries = [];
  const files = await listMarkdownFiles(AGENCY_DIR, false);
  for (const file of files) {
    const rel = path.relative(AGENCY_DIR, file);
    const parts = rel.split(path.sep);
    // Skip top-level repo files (README, CONTRIBUTING, LICENSE, etc.)
    if (parts.length < 2) continue;
    const division = parts[0];
    const baseName = path.basename(file, '.md').toLowerCase();
    // Skip division-level readmes / meta files
    if (baseName === 'readme' || baseName === 'contributing') continue;
    // Use the path under the division to avoid duplicate division prefixes in filenames
    const relUnderDivision = parts.slice(1).join('-');
    const baseSlug = relUnderDivision.replace(/\.md$/, '').replace(/[\\/]+/g, '-');
    const uniqueSlug = makeUniqueSlug(baseSlug, slugSet);
    const raw = await fs.readFile(file, 'utf8');
    const { fm, body } = parseFrontmatter(raw);
    const name = fm.name || (extractFirstHeading(body) || titleCase(uniqueSlug));
    const description = fm.description || '';
    entries.push({
      name,
      role: `${name} Agent`,
      division,
      source: 'agency-agents',
      sourcePath: rel.replace(/\\/g, '/'),
      emoji: fm.emoji || '🤖',
      color: fm.color || 'slate',
      description,
      body,
      slug: uniqueSlug,
      adapted_path: `agent-roster/${division}/${uniqueSlug}.md`,
    });
  }
  return entries;
}

async function main() {
  const slugSet = new Set();
  const verifyEntries = await processVerifywise(slugSet);
  const agencyEntries = await processAgency(slugSet);
  const allEntries = [...verifyEntries, ...agencyEntries];

  // Generate directories and files
  for (const entry of allEntries) {
    const outFile = path.join(OUT_DIR, entry.division, `${entry.slug}.md`);
    await fs.mkdir(path.dirname(outFile), { recursive: true });
    const md = adaptedMarkdown(entry, context);
    await fs.writeFile(outFile, md, 'utf8');
  }

  // Write roster.json
  const roster = {
    generated_at: new Date().toISOString(),
    project: context.project.name,
    total_agents: allEntries.length,
    divisions: {},
    agents: allEntries.map((e) => ({
      slug: e.slug,
      division: e.division,
      source: e.source,
      source_path: e.sourcePath,
      name: e.name,
      role: e.role,
      emoji: e.emoji,
      color: e.color,
      description: e.description,
      adapted_path: e.adapted_path,
    })),
  };
  for (const e of allEntries) {
    roster.divisions[e.division] = (roster.divisions[e.division] || 0) + 1;
  }
  await fs.writeFile(path.join(OUT_DIR, 'roster.json'), JSON.stringify(roster, null, 2), 'utf8');

  // Write README.md
  const divisionList = Object.entries(roster.divisions)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([div, count]) => `- **${div}**: ${count} agent${count === 1 ? '' : 's'}`)
    .join('\n');

  const readme = `# CiviTech Global Agent Roster

A project-aware adaptation of every agent from:

- \\\`C:\\\Workspace\\\verifywise\\\agents\\\` (software-delivery team)
- \\\`C:\\\Workspace\\\agency-agents\\\` (full agency roster)

Adapted specifically for the **${context.project.name}**: ${context.project.description}

## Quick Start

1. Open \\\`WORK.md\\\` to see the master task board.
2. Open \\\`context.json\\\` for the single source of truth on tech stack, domain, and critical rules.
3. Activate any agent by reading its markdown file in the relevant division folder.

## Roster Overview

- **Total agents**: ${roster.total_agents}
- **Divisions**: ${Object.keys(roster.divisions).length}

${divisionList}

## Attribution

- Agency agents are derived from the \\\`agency-agents\\\` repository (MIT license). Original concepts and wording are preserved under "Source Capabilities".
- Verifywise agents are derived from \\\`C:\\\Workspace\\\verifywise\\\agents\\\` and adapted for CiviTech Global.

## Regenerating

Run:

\\\`\\\`\\\`bash
node scripts/generate-agent-roster.mjs
\\\`\\\`\\\`
`;
  await fs.writeFile(path.join(OUT_DIR, 'README.md'), readme, 'utf8');

  console.log(`Generated ${allEntries.length} adapted agents across ${Object.keys(roster.divisions).length} divisions.`);
  console.log('Divisions:', roster.divisions);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
