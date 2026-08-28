import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'C:\\Workspace\\civitechglobal\\civitechglobalwebapplication';
const OUT_DIR = path.join(ROOT, 'agent-roster');

const context = JSON.parse(await fs.readFile(path.join(OUT_DIR, 'context.json'), 'utf8'));
const roster = JSON.parse(await fs.readFile(path.join(OUT_DIR, 'roster.json'), 'utf8'));

const divisionTasks = {
  'software-delivery': {
    audit: 'Review the current platform through your role lens and identify the top 3 gaps in process, quality, or delivery.',
    roadmap: 'Define the next maturity milestone for your function and create a phased plan to reach it.',
  },
  academic: {
    audit: 'Analyze existing user research, data patterns, or historical product decisions relevant to your discipline.',
    roadmap: 'Propose a research initiative or analytical framework that improves product decisions.',
  },
  design: {
    audit: 'Audit the React app and Telegram bot for consistency, accessibility, and Persian/RTL design debt.',
    roadmap: 'Design the next-generation component, screen, or interaction pattern for the platform.',
  },
  engineering: {
    audit: 'Audit the relevant code area (API, bot, web, database) for performance, security, and maintainability issues.',
    roadmap: 'Design and spec an engineering improvement (refactor, integration, or new capability) aligned with the roadmap themes.',
  },
  finance: {
    audit: 'Review current product/pricing assumptions and identify financial risks or inefficiencies.',
    roadmap: 'Build a financial model or pricing recommendation for a new platform capability.',
  },
  'game-development': {
    audit: 'Review any gamified or interactive experiences; identify engagement and technical debt.',
    roadmap: 'Propose a gamification or interactive feature that improves user engagement.',
  },
  gis: {
    audit: 'Review location/city data usage in leads and identify spatial data quality issues.',
    roadmap: 'Design a spatial feature (map, geo-filtering, regional analytics) for the platform.',
  },
  healthcare: {
    audit: 'Review data handling for sensitive user information from a healthcare-adjacent privacy lens.',
    roadmap: 'Recommend compliance or trust features relevant to health/civic data.',
  },
  marketing: {
    audit: 'Audit current messaging, funnels, and growth channels for the platform.',
    roadmap: 'Create a campaign or content plan for a roadmap feature launch.',
  },
  'paid-media': {
    audit: 'Review current paid acquisition assumptions and tracking setup.',
    roadmap: 'Design a paid media experiment for a new feature or audience segment.',
  },
  product: {
    audit: 'Review the product backlog, PRDs, and roadmap for clarity and alignment.',
    roadmap: 'Write a PRD for the highest-impact roadmap initiative.',
  },
  'project-management': {
    audit: 'Review current task tracking, estimation, and delivery cadence.',
    roadmap: 'Design an improved delivery process or tooling workflow for the team.',
  },
  sales: {
    audit: 'Review lead-to-customer handoff and sales collateral for the platform.',
    roadmap: 'Create a sales enablement plan for a new platform capability.',
  },
  security: {
    audit: 'Perform a security review of auth, PII handling, and deployment posture.',
    roadmap: 'Design and plan a security hardening initiative or compliance milestone.',
  },
  'spatial-computing': {
    audit: 'Review 3D/immersive assets or spatial interaction patterns in the web app.',
    roadmap: 'Propose an XR or spatial enhancement for public or admin experiences.',
  },
  specialized: {
    audit: 'Review the area of the platform most relevant to your specialty for inefficiencies or risks.',
    roadmap: 'Propose a specialist capability that differentiates CiviTech Global.',
  },
  support: {
    audit: 'Review support tickets, help content, and response workflows.',
    roadmap: 'Design a self-service or proactive support improvement.',
  },
  testing: {
    audit: 'Review test coverage, test quality, and CI test execution for the platform.',
    roadmap: 'Design a testing initiative (E2E, performance, accessibility) for the roadmap.',
  },
  innovation: {
    audit: 'Perform your specialty audit on the current platform and report findings.',
    roadmap: 'Lead or support the design of your specialty\'s roadmap initiative.',
  },
};

function agentLink(agent) {
  return `[${agent.emoji} ${agent.name}](${agent.adapted_path})`;
}

function renderDivisionTable(agents) {
  const div = agents[0].division;
  const tasks = divisionTasks[div] || divisionTasks.innovation;
  const rows = agents
    .map(
      (a) =>
        `| ${agentLink(a)} | ${tasks.audit} | ${tasks.roadmap} |`
    )
    .join('\n');
  return `### ${div}\n\n| Agent | Phase 1 — Audit Task | Phase 2 — Roadmap Task |\n|-------|----------------------|------------------------|\n${rows}\n`;
}

function renderPhase0() {
  return `## Phase 0 — Bootstrap\n\nEvery agent must complete the following before picking up a task:\n\n1. Read \`agent-roster/context.json\` to internalize the CiviTech Global stack, domain, and critical rules.\n2. Read \`agent-roster/software-delivery/orchestrator.md\` and \`team-workflow.md\` to understand operating model and lifecycle.\n3. Read your own adapted agent definition in \`agent-roster/<division>/<slug>.md\`.\n4. Confirm readiness: *"✅ [Agent name] loaded and ready."*\n`;
}

function renderPhase1() {
  const byDiv = groupByDivision();
  const tables = Object.values(byDiv)
    .map(renderDivisionTable)
    .join('\n\n');
  return `## Phase 1 — Audit & Harden\n\nGoal: stabilize the current platform. Every agent performs an audit through the lens of its specialty and files findings as structured reports.\n\n${tables}`;
}

function renderPhase2() {
  return `## Phase 2 — Roadmap & Design\n\nGoal: design the next generation of CiviTech Global.\n\n### Cross-Cutting Initiatives\n\n- **Lead lifecycle automation** — Product Manager, Insurance Domain SME, Lead-to-Policy Translator, Full-Stack Feature Owner, Backend Architect, Prisma Schema Architect.\n- **Admin analytics dashboard** — Data & Analytics Engineer, UI Designer, Frontend Developer, API Contract Guardian.\n- **Mobile-first public experience** — UX Architect, Frontend Developer, Accessibility & RTL Specialist, Persian-First UX Linguist.\n- **Multi-insurance-provider integrations** — API Contract Guardian, Backend Architect, DevOps Engineer, Security & Compliance Officer.\n- **Advanced RBAC and audit logging** — Security & Compliance Officer, Backend Architect, Prisma Schema Architect.\n- **Performance optimization and observability** — Observability & SRE Engineer, DevEx Tooling Engineer, Database Optimizer, AI Pair Programmer.\n\n### Instructions\n\nFor your division's roadmap task (see Phase 1 tables), produce:\n1. A one-page proposal with problem, solution sketch, dependencies, and success metrics.\n2. A task breakdown with assigned agents and waves.\n3. Risk and security notes.\n`;
}

function renderPhase3() {
  return `## Phase 3 — Build\n\nExecution waves for roadmap initiatives:\n\n| Wave | Focus | Typical Agents |\n|------|-------|----------------|\n| Wave 1 | Foundation | Prisma Schema Architect, API Contract Guardian, UX Architect, Platform Orchestrator |\n| Wave 2 | Core implementation | Backend Architect, Frontend Developer, Telegram Bot Experience Designer, Full-Stack Feature Owner |\n| Wave 3 | Supporting features & integrations | Mid-level developers, Integrations specialists, DevOps Engineer |\n| Wave 4 | Polish & wiring | QA Engineer, Accessibility & RTL Specialist, Persian-First UX Linguist |\n| Continuous | Quality & reliability | QA Engineer, Observability & SRE Engineer, Security & Compliance Officer |\n\nEach agent:\n- Reads its task from the task board.\n- Reads dependency outputs (schemas, contracts, designs).\n- Runs \`npm run lint\`, \`npm run type-check\`, and \`npm run test\` before marking complete.\n`;
}

function renderPhase4() {
  return `## Phase 4 — Launch & Operate\n\n- **DevOps Engineer** / **DevEx Tooling Engineer**: run migrations, deploy services, verify health checks.\n- **Observability & SRE Engineer**: enable dashboards and alerts.\n- **QA Engineer**: run smoke tests and verify acceptance criteria in production.\n- **Marketing** / **Growth & Conversion Optimizer**: launch announcements and monitor funnel impact.\n- **Support**: update help content and monitor tickets.\n- **Orchestrator**: run a retrospective and update \`WORK.md\` for the next cycle.\n`;
}

function groupByDivision() {
  const groups = {};
  for (const a of roster.agents) {
    (groups[a.division] ||= []).push(a);
  }
  for (const div of Object.keys(groups)) {
    groups[div].sort((a, b) => a.name.localeCompare(b.name));
  }
  return groups;
}

async function main() {
  const byDiv = groupByDivision();
  const divisionSummary = Object.entries(roster.divisions)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([div, count]) => `- **${div}**: ${count} agent${count === 1 ? '' : 's'}`)
    .join('\n');

  const work = `# CiviTech Global Agent Work Board

> Master task board for the ${roster.total_agents}-agent CiviTech Global roster.
> This file assigns every agent an **audit task** (stabilize the current platform) and a **roadmap task** (design the next generation).

## Project Mission

${context.project.description}

## Roster Overview

- **Total agents**: ${roster.total_agents}
- **Divisions**: ${Object.keys(roster.divisions).length}

${divisionSummary}

## How to Use This Board

1. The **Orchestrator** activates agents from \`agent-roster/WORK.md\`.
2. Each agent reads its definition and this board before starting.
3. Work proceeds in four phases: Bootstrap → Audit & Harden → Roadmap & Design → Build → Launch & Operate.
4. Every agent must produce evidence of lint, type-check, and tests passing before handoff.

${renderPhase0()}

${renderPhase1()}

${renderPhase2()}

${renderPhase3()}

${renderPhase4()}

---

*Generated from \`agent-roster/roster.json\`. Regenerate with \`node scripts/generate-work.mjs\`.*
`;

  await fs.writeFile(path.join(OUT_DIR, 'WORK.md'), work, 'utf8');
  console.log(`Generated WORK.md with ${roster.total_agents} agents across ${Object.keys(roster.divisions).length} divisions.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
