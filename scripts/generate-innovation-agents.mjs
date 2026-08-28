import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'C:\\Workspace\\civitechglobal\\civitechglobalwebapplication';
const OUT_DIR = path.join(ROOT, 'agent-roster');
const DIVISION = 'innovation';

const context = JSON.parse(await fs.readFile(path.join(OUT_DIR, 'context.json'), 'utf8'));
const definitions = JSON.parse(await fs.readFile(path.join(ROOT, 'scripts', 'innovation-agents.json'), 'utf8'));

const rules = context.critical_rules.map((r) => `- ${r}`).join('\n');

function renderAgent(def) {
  const mission = def.mission.map((m) => `- ${m}`).join('\n');
  const agentRules = def.rules.map((r) => `- ${r}`).join('\n');
  const artifacts = def.artifacts.map((a) => `- ${a}`).join('\n');
  return `---
name: ${def.name}
role: ${def.name} Agent
division: ${DIVISION}
version: "1.0.0"
source: civitech-custom
original_license: proprietary
emoji: ${def.emoji}
color: ${def.color}
adapted_for: ${context.project.name}
status: active
---

# ${def.emoji} ${def.name}

## Identity

${def.identity}

## Mission

${mission}

## Critical Rules

${agentRules}

## CiviTech Global Guardrails

${rules}

## Collaboration Rules

- Read the task board and dependency outputs before starting work.
- Hand off database changes to the **Prisma Schema Architect**.
- Route API contract questions to the **API Contract Guardian**.
- Escalate blockers to the **Platform Orchestrator** or **Technical Lead**.
- Confirm lint, type-check, and relevant tests pass before marking work complete.

## Output Artifacts

${artifacts}
`;
}

async function main() {
  await fs.mkdir(path.join(OUT_DIR, DIVISION), { recursive: true });
  const rosterPath = path.join(OUT_DIR, 'roster.json');
  const roster = JSON.parse(await fs.readFile(rosterPath, 'utf8'));

  for (const def of definitions) {
    const outFile = path.join(OUT_DIR, DIVISION, `${def.slug}.md`);
    await fs.writeFile(outFile, renderAgent(def), 'utf8');
    roster.agents.push({
      slug: def.slug,
      division: DIVISION,
      source: 'civitech-custom',
      source_path: `scripts/innovation-agents.json#${def.slug}`,
      name: def.name,
      role: `${def.name} Agent`,
      emoji: def.emoji,
      color: def.color,
      description: def.description,
      adapted_path: `agent-roster/${DIVISION}/${def.slug}.md`,
    });
  }

  roster.total_agents = roster.agents.length;
  roster.divisions[DIVISION] = definitions.length;
  await fs.writeFile(rosterPath, JSON.stringify(roster, null, 2), 'utf8');

  // Update README division list (simple regeneration of README)
  const divisionList = Object.entries(roster.divisions)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([div, count]) => `- **${div}**: ${count} agent${count === 1 ? '' : 's'}`)
    .join('\n');

  const readme = `# CiviTech Global Agent Roster

A project-aware adaptation of every agent from:

- \`C:\\Workspace\\verifywise\\agents\` (software-delivery team)
- \`C:\\Workspace\\agency-agents\` (full agency roster)
- Plus a custom \`innovation\` division built for CiviTech Global

Adapted specifically for the **${context.project.name}**: ${context.project.description}

## Quick Start

1. Open \`WORK.md\` to see the master task board.
2. Open \`context.json\` for the single source of truth on tech stack, domain, and critical rules.
3. Activate any agent by reading its markdown file in the relevant division folder.

## Roster Overview

- **Total agents**: ${roster.total_agents}
- **Divisions**: ${Object.keys(roster.divisions).length}

${divisionList}

## Attribution

- Agency agents are derived from the \`agency-agents\` repository (MIT license). Original concepts and wording are preserved under "Source Capabilities".
- Verifywise agents are derived from \`C:\\Workspace\\verifywise\\agents\` and adapted for CiviTech Global.
- Innovation agents are custom-built for this platform.

## Regenerating

Run:

\`\`\`bash
node scripts/generate-agent-roster.mjs
node scripts/generate-innovation-agents.mjs
\`\`\`
`;
  await fs.writeFile(path.join(OUT_DIR, 'README.md'), readme, 'utf8');

  console.log(`Generated ${definitions.length} innovation agents. Total roster: ${roster.total_agents}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
