# Guides

Long-form, step-by-step documentation for CiviTech Global. Each guide assumes
you have the repo cloned and can run `docker compose up -d` locally, but
otherwise starts from zero.

## Review

- [`platform-review-2026-09-11.md`](./platform-review-2026-09-11.md) — the
  current evaluation against thirteen production concerns (front end, API,
  database, auth, hosting, cloud, CI/CD, security & row-level security, rate
  limiting, caching/CDN, scaling, observability, recovery), scored out of 10, with
  what changed since the first pass, the five bugs the remediation surfaced,
  and what each remaining item actually needs. **Start here.**
- [`platform-review.md`](./platform-review.md) — the original 2026-09-02
  evaluation, letter-graded, plus an analysis of how the sibling `verifywise`
  and `jolfa-retail-gateway` projects solve deployment with Ansible and
  Semaphore UI. Superseded on the platform layers, still worth reading for the
  reasoning behind them.

## Product

- [`insurance-catalog-research.md`](./insurance-catalog-research.md) — what
  each insurance product actually is, and what a customer has to be asked
  before anyone can quote one: thirty source pages covering the thirty-four
  products in the catalog. It is also the reason the catalog splits into seventeen products a
  customer can complete alone and seventeen that an underwriter has to price
  over the phone. This is the document `src/insurance/catalog/` was written
  from; change the catalog and change this too.

## Deployment & operations

- [`production-deployment.md`](./production-deployment.md) — the complete
  path from a bare Linux server to HTTPS: playbooks, roles, vault layout,
  nginx/TLS, edge rate limiting, backups, rollback and CD wiring. This is the
  implementation the guide below teaches the theory for.
- [`ansible-getting-started.md`](./ansible-getting-started.md) — Ansible from
  absolute zero: what it is, how to install it, and how to write the playbook
  that deploys this monorepo to a Linux server.
- [`ansible-semaphore-ui.md`](./ansible-semaphore-ui.md) — put a web UI in
  front of that playbook with Semaphore UI, so deploys become a button click
  with logs, schedules, and an audit trail.

Read them in that order. Semaphore UI is only a front-end for Ansible — it
will not make sense until the playbook works from your terminal.

## Application setup

- `telegram-bot-setup-guide.md` — Telegram bot token/webhook setup *(to be
  added)*.
