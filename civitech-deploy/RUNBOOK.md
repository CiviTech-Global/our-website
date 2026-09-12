# Runbook — first deployment to 62.220.123.6

Target: **62.220.123.6** (**Ubuntu 20.04 LTS, focal** — not 22.04; the playbooks are Debian/Ubuntu-generic and Docker CE 28.x still publishes focal packages), IP-only until a domain's DNS lands.

> **OS support note:** 20.04's standard support ended May 2025; security patches
> now come through Ubuntu Pro/ESM only. `roles/common` enables
> `unattended-upgrades`, which stops being useful without an ESM token. Plan a
> `do-release-upgrade` to 22.04 in a maintenance window, or attach an Ubuntu
> Pro token. The deployment itself is unaffected.
This is the operational companion to
[`guides/production-deployment.md`](../guides/production-deployment.md) — read
that for what the playbooks do and why; this file is the exact command sequence.

Everything runs from **WSL Ubuntu-24.04** (`wsl -d Ubuntu-24.04`), which already
has `ansible`, `ansible-vault`, `sshpass` and `openssl`.

---

## 0. One-time state (already done, 2026-09-12)

- `inventory.ini` created (gitignored) pointing at 62.220.123.6, IP as
  `domain_name`.
- `~/.ssh/civitech_ed25519` deploy key generated (no passphrase — CI and
  Semaphore must use it non-interactively).
- `group_vars/all/vault.yml` created with random secrets and **Ansible Vault
  encrypted**. The vault password lives in two places:
  - `~/.civitech-vault-pass` (WSL home, mode 600 — the one ansible actually
    uses; files under `/mnt/c` always look executable to WSL, so the copy in
    the repo cannot be used with `--vault-password-file` directly)
  - `civitech-deploy/.secrets/vault-pass` (reference copy; paste this into
    Semaphore's Key Store and the GitHub `ANSIBLE_VAULT_PASSWORD` secret)
- The **seed admin** and **Semaphore admin** passwords are in the vault — see
  them with:
  `ansible-vault view group_vars/all/vault.yml --vault-password-file ~/.civitech-vault-pass`
  Save both in a password manager now.

> **`/mnt/c` gotcha:** Windows drives are world-writable from WSL's point of
> view, so ansible silently ignores `ansible.cfg` there. Every command below
> therefore sets `ANSIBLE_CONFIG` explicitly. Without it, the inventory,
> roles path and SSH pipelining defaults are lost.

```bash
cd /mnt/c/Workspace/civitechglobal/our-website/civitech-deploy
export ANSIBLE_CONFIG=$PWD/ansible.cfg
ansible-galaxy collection install -r requirements.yml   # once
```

---

## 1. Paste the two bootstrap passwords

- `.secrets/one-time-root-password` ← the one-time password the hosting
  provider gave you (replace the whole line)
- `.secrets/new-root-password` ← the root password you want from now on
  (12+ characters; replace the whole line)

## 2. Bootstrap: install the key, rotate the root password

```bash
ansible-playbook bootstrap.yml
```

This authenticates with the one-time password, installs
`~/.ssh/civitech_ed25519.pub`, **proves** key auth works, and only then sets
your new root password. If the proof step fails it stops — do not continue.

Afterwards, junk both `.secrets/*-password` files — the one-time password is
spent and the new one is live on the server.

## 3. Smoke test

```bash
ansible-playbook ping.yml
```

Expect: Ubuntu 20.04 reported, a warning if RAM < 2 GB (the stack wants 2 GB).
This box has 7.8 GB — comfortable.

## 4. Provision the server

```bash
ansible-playbook provision.yml --vault-password-file ~/.civitech-vault-pass
```

Packages, firewall (22/80/443), hardened SSH (password auth off — key works
because step 2 proved it), fail2ban, Docker, backup tooling.

## 5. First deploy

Images come from GHCR, pushed by CI on merges to `main`. For the very first
deploy (or anytime you deliberately mean it), allow `latest`:

```bash
ansible-playbook site.yml \
  -e allow_latest=true \
  -e enable_ssl=false \
  --vault-password-file ~/.civitech-vault-pass
```

- `enable_ssl=false` — no domain/TLS yet; the API bakes the `http://` scheme
  of CORS_ORIGIN/APP_URL from this flag, so it must match reality.
- If the GHCR packages are private, set `ghcr_username` in
  `group_vars/all/main.yml` and `vault_ghcr_token` in the vault first.
- Everything after this deploy is SHA-pinned: `-e app_version=<git sha>`.

Wait for the health gate (roles/app polls `/api/health/ready`), then:

```bash
curl -s http://62.220.123.6/api/health/ready
```

## 6. Seed the first SUPER_ADMIN

```bash
ssh root@62.220.123.6
cd /opt/civitech
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  exec api npx tsx prisma/seed.ts
```

Uses `vault_seed_admin_email` / `vault_seed_admin_password` from the vault.
Log in at `http://62.220.123.6/dashboard`, then change the password in the
admin UI.

## 7. Semaphore UI (deploy/rollback buttons in a browser)

```bash
ansible-playbook semaphore.yml --vault-password-file ~/.civitech-vault-pass
ssh -L 8888:127.0.0.1:8888 root@62.220.123.6   # then open http://localhost:8888
```

Login: `admin` + `vault_semaphore_admin_password` from the vault. Then follow
[`guides/ansible-semaphore-ui.md`](../guides/ansible-semaphore-ui.md) to create:
1. **Key Store**: `civitech-server-ssh` (SSH key — paste the
   `civitech_ed25519` private key), `civitech-vault-password`
   (Login/Password type — paste the contents of `.secrets/vault-pass`).
2. **Inventory**: paste the same INI as `inventory.ini` **without**
   `ansible_ssh_private_key_file` (the key comes from the Key Store).
3. **Repository**: this Git repo.
4. **Templates**: `Deploy` → `deploy.yml` (survey var `app_version`),
   `Rollback` → `rollback.yml` (survey var `target_release`),
   `Backup now` → `backup.yml`, `Nginx + SSL` → `nginx.yml`,
   `Provision` → `provision.yml`. Deliberately NOT templated: restores
   (they drop the database — keep those at an SSH prompt).
5. **Schedules**: weekly `backup.yml` verification. Nightly backups are server
   cron (03:30), not Semaphore — a backup must not depend on Semaphore being
   up.

## 8. GitHub secrets (enables the CI `deploy` job)

In repo **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | `62.220.123.6` |
| `DEPLOY_SSH_KEY` | contents of `~/.ssh/civitech_ed25519` (private key) |
| `ANSIBLE_VAULT_PASSWORD` | contents of `.secrets/vault-pass` |

Then create a **production environment** (Settings → Environments) with
required reviewers — a merge to `main` *proposes* a deploy; a reviewer
*performs* it.

---

## Before real users: replace the placeholder third-party keys

Random stand-ins were generated so the deploy passes its guards; these
features fail until real credentials are pasted into the vault
(`ansible-vault edit group_vars/all/vault.yml --vault-password-file ~/.civitech-vault-pass`)
and `deploy.yml` is re-run:

| Vault key | Needed for | State |
|---|---|---|
| `vault_sms_api_key`, `vault_sms_otp_template` | insurance-request phone verification | **placeholder** |
| `vault_email_api_key` | password reset, email verification | **placeholder** |
| `vault_sentry_dsn` | error tracking | empty (no-op, fine) |
| `vault_telegram_alert_bot_token` / `_chat_id` | health-check alerts | empty = log-only |

`backup_remote` in `group_vars/all/main.yml` is empty: dumps live on the
protected host. Configure rclone and set it before trusting the backups.

## Going live with a domain later

1. Point the domain's A record at 62.220.123.6 and wait for propagation.
2. Set `domain_name=` and `certbot_email=` in `inventory.ini`.
3. `ansible-playbook nginx.yml --vault-password-file ~/.civitech-vault-pass`
   (no `enable_ssl=false` — certbot issues the certificate) **then**
   `ansible-playbook deploy.yml -e app_version=<sha> --vault-password-file ~/.civitech-vault-pass`
   (re-bakes CORS_ORIGIN/APP_URL with `https://`).
4. Update the CI deploy job: add a `DEPLOY_DOMAIN` secret, use it in the
   inventory step, and drop `-e enable_ssl=false`.
