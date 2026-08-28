# CiviTech Global

Persian-first civic technology platform. Monorepo containing the public site, user/admin dashboards, REST API, and a Telegram bot for insurance lead intake.

## Structure

- `civitechglobal-web/` — React 19 + Vite + Tailwind v4 frontend (public site, user dashboard, admin panel)
- `civitechglobal-server/` — Express API + Fastify/grammY Telegram bot + Prisma/PostgreSQL
- `agent-roster/` — Claude Code subagent persona library used as dev tooling for this project
- `scripts/` — generator scripts for `agent-roster/`
- `docker-compose.yml` — full local stack (postgres, redis, api, bot, web)

## Getting started

```bash
cp civitechglobal-server/.env.example civitechglobal-server/.env
cp civitechglobal-web/.env.example civitechglobal-web/.env
docker compose up -d postgres redis
cd civitechglobal-server && npm install && npm run prisma:migrate && npm run prisma:seed
cd ../civitechglobal-web && npm install
npm run dev:server   # API on :5000
npm run dev:bot      # Telegram bot on :4000
npm run dev:web      # Web on :5173
```

See `guides/telegram-bot-setup-guide.md` (to be added) for Telegram bot token/webhook setup.

## Default admin login

`npm run prisma:seed` creates a `SUPER_ADMIN` user using `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` from `civitechglobal-server/.env`. If those aren't set,
the script generates a random password that's printed once to the console and
never saved anywhere — so set them before seeding. The `.env.example` default
is:

- Email: `admin@civitechglobal.com`
- Password: `ChangeMe!2026Admin`

Log in at `/admin` with these credentials, then change the password.
Note: the seed script only creates a `SUPER_ADMIN` if none already exists in
the database — if you're locked out because an admin row already exists with
a lost password, delete that row (or its password field) before re-seeding.
