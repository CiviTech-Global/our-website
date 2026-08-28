# Guides

Long-form, step-by-step documentation for CiviTech Global. Each guide assumes
you have the repo cloned and can run `docker compose up -d` locally, but
otherwise starts from zero.

## Deployment & operations

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
