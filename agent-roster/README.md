# CiviTech Global Agent Roster

A project-aware adaptation of every agent from:

- `C:\Workspace\verifywise\agents` (software-delivery team)
- `C:\Workspace\agency-agents` (full agency roster)
- Plus a custom `innovation` division built for CiviTech Global

Adapted specifically for the **CiviTech Global Platform**: Persian-first civic technology platform with an insurance lead generation Telegram bot, an Express/Fastify API, and a React 19 admin/dashboard frontend.

## Quick Start

1. Open `WORK.md` to see the master task board.
2. Open `context.json` for the single source of truth on tech stack, domain, and critical rules.
3. Activate any agent by reading its markdown file in the relevant division folder.

## Roster Overview

- **Total agents**: 263
- **Divisions**: 19

- **academic**: 5 agents
- **design**: 9 agents
- **engineering**: 34 agents
- **finance**: 5 agents
- **game-development**: 20 agents
- **gis**: 13 agents
- **healthcare**: 2 agents
- **innovation**: 15 agents
- **marketing**: 36 agents
- **paid-media**: 7 agents
- **product**: 5 agents
- **project-management**: 7 agents
- **sales**: 9 agents
- **security**: 10 agents
- **software-delivery**: 13 agents
- **spatial-computing**: 6 agents
- **specialized**: 53 agents
- **support**: 6 agents
- **testing**: 8 agents

## Attribution

- Agency agents are derived from the `agency-agents` repository (MIT license). Original concepts and wording are preserved under "Source Capabilities".
- Verifywise agents are derived from `C:\Workspace\verifywise\agents` and adapted for CiviTech Global.
- Innovation agents are custom-built for this platform.

## Regenerating

Run:

```bash
node scripts/generate-agent-roster.mjs
node scripts/generate-innovation-agents.mjs
node scripts/generate-work.mjs
```
