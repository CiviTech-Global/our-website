# Production deployment — CiviTech Global

The complete path from a bare Linux server to `https://civitechglobal.com`,
using Ansible for the machine and Semaphore UI for the button.

This guide is the **implementation** that
[`ansible-getting-started.md`](./ansible-getting-started.md) teaches the
theory for. If you have never used Ansible, read that first — it explains
what an inventory, a play, a handler and a fact are, and shows the expected
output of every command. This document assumes those words mean something
to you and gets the stack live.

It closes the gap identified in [`platform-review.md`](./platform-review.md)
layer 5: `civitech-deploy/deploy.yml` is currently a zero-byte file.

Design borrowed, with attribution, from
`C:\Workspace\RTJG-clients\jolfa-retail-gateway\ansible` (roles, Vault,
placeholder guards, rollback, edge rate limiting, loopback-only Semaphore)
and `C:\Workspace\verifywise\ansible` (generated secrets, `serial: 1`,
compose detection, health gates, the `enable_ssl` flag).

---

## 0. The decision that shapes everything else

**Do not build on the server. Deploy the images CI already built.**

`.github/workflows/ci.yml` already lints, typechecks, tests, builds, scans
with Trivy, and pushes three images to GHCR tagged with both `latest` and
the commit SHA:

```
ghcr.io/civitech-global/civitechglobal-api:<sha>
ghcr.io/civitech-global/civitechglobal-bot:<sha>
ghcr.io/civitech-global/civitechglobal-web:<sha>
```

Those immutable SHA tags are your release mechanism. Deploying them means:

- **A 1 GB server is enough.** Jolfa's `ping.yml` warns below 1.9 GB because
  `npm ci` + Vite peaks around 1.5 GB and gets OOM-killed on the box. You
  never run that on the box.
- **Deploy takes seconds**, not minutes — `docker compose pull` and up.
- **Rollback is one variable.** `-e app_version=<previous sha>`.
- **What ships is exactly what CI tested and Trivy scanned.** A server-side
  `npm install` can resolve a different tree than CI saw; this cannot.

Everything below assumes this. Target layout on the server:

```
/opt/civitech/
├── docker-compose.yml           # copied from the repo
├── docker-compose.prod.yml      # rendered by Ansible — pins image tags
├── .env                         # rendered by Ansible from Vault — 0600
└── nginx/                       # site config, rendered by Ansible
/var/backups/civitech/           # nightly dumps, pushed off-box
```

---

## 1. Prerequisites

**Control machine (your Windows 11 laptop).** Ansible does not run natively
on Windows. Use WSL2 — `wsl --install -d Ubuntu` from an elevated
PowerShell, reboot, then work inside the Ubuntu shell. Install Ansible with
`pipx install --include-deps ansible`. Full walkthrough with expected output
in [`ansible-getting-started.md` §3](./ansible-getting-started.md).

**Server.** Ubuntu 24.04 LTS, ≥ 2 GB RAM (Postgres + Redis + three Node/nginx
containers; 1 GB works but leaves nothing for a `pg_dump`), ≥ 20 GB disk,
public IP, root SSH.

**DNS.** `civitechglobal.com` (and `www`) pointing at that IP. If it has not
propagated yet, that is fine — §6 has an `enable_ssl=false` path.

**Collections:**

```bash
ansible-galaxy collection install community.general community.docker ansible.posix
```

---

## 2. Repository layout to create

Fill in `civitech-deploy/`, which currently holds only an `ansible.cfg`:

```
civitech-deploy/
├── ansible.cfg                       # exists — replace per §3
├── inventory.example.ini             # commit this
├── inventory.ini                     # gitignored: real IPs
├── requirements.yml
├── group_vars/
│   └── all/
│       ├── main.yml                  # non-secret config
│       ├── vault.example.yml         # commit this
│       └── vault.yml                 # ansible-vault encrypted
├── ping.yml  bootstrap.yml  provision.yml
├── deploy.yml  nginx.yml  backup.yml
├── monitoring.yml  rollback.yml  semaphore.yml  site.yml
└── roles/
    ├── common/     # packages, firewall, SSH, fail2ban, deploy user
    ├── docker/     # engine + compose plugin
    ├── app/        # compose files, .env, pull, migrate, up, health gate
    ├── nginx/      # reverse proxy, TLS, edge rate limits
    ├── backup/     # nightly dump + off-box copy
    ├── monitoring/ # health timer + alerts
    └── semaphore/  # the web UI
```

Add to `.gitignore`:

```
civitech-deploy/inventory.ini
civitech-deploy/group_vars/all/vault.yml
```

Wait — **do not** gitignore `vault.yml`. It is encrypted; committing it is
the point (that is how Semaphore and your teammates get it). Gitignore only
`inventory.ini`. Committing an *unencrypted* vault is what
`.github/workflows/secret-scan.yml` (gitleaks) is there to catch.

---

## 3. `ansible.cfg`

Replace the current file. The SSH tuning matters: pipelining plus a
persistent control connection is the difference between a 3-minute and a
12-minute run on a high-latency link — Jolfa documents exactly this for its
Iranian VPS.

```ini
# civitech-deploy/ansible.cfg
# Run every playbook from this directory so these defaults apply.
# Semaphore sets ANSIBLE_CONFIG to the checkout, so the CLI and the web UI
# behave identically.

[defaults]
inventory            = inventory.ini
roles_path           = roles
host_key_checking    = True
retry_files_enabled  = False
stdout_callback      = yaml
callbacks_enabled    = ansible.posix.profile_tasks
interpreter_python   = auto_silent
forks                = 5

[ssh_connection]
pipelining = True
ssh_args   = -o ControlMaster=auto -o ControlPersist=15m -o ServerAliveInterval=30

[privilege_escalation]
become        = False
become_method = sudo
```

`requirements.yml`:

```yaml
---
# ansible-galaxy collection install -r requirements.yml
collections:
  - name: community.general    # ufw, timezone
    version: ">=8.0.0"
  - name: community.docker     # docker_compose_v2
    version: ">=3.4.0"
  - name: ansible.posix        # profile_tasks, authorized_key
    version: ">=1.5.0"
```

---

## 4. Inventory and variables

### `inventory.example.ini` (commit)

```ini
# cp inventory.example.ini inventory.ini and fill in the REPLACE_ME values.
# inventory.ini is gitignored so the server IP never lands in source control.
# The playbooks assert on these placeholders and refuse to run.

[civitech_prod]
civitech-prod ansible_host=REPLACE_ME_SERVER_IP ansible_user=root

[civitech_prod:vars]
domain_name=REPLACE_ME_DOMAIN          ; civitechglobal.com
domain_alias=www.REPLACE_ME_DOMAIN     ; leave empty if you do not own it
certbot_email=REPLACE_ME_EMAIL
# ansible_ssh_private_key_file=~/.ssh/civitech_ed25519

# Semaphore can live on the same box or a separate control host.
[semaphore]
civitech-prod ansible_host=REPLACE_ME_SERVER_IP ansible_user=root
```

### `group_vars/all/main.yml`

```yaml
---
# Non-secret configuration. Secrets live in vault.yml.

# ---- Where the stack lives -------------------------------------------------
app_name: civitech
app_root: /opt/civitech
app_user: civitech
app_group: civitech

# ---- Images ----------------------------------------------------------------
# CI pushes :latest and :<sha> to GHCR (.github/workflows/ci.yml). Deploy a
# SHA, never :latest — an immutable tag is what makes rollback possible and
# what makes "which commit is live" answerable.
#
#   ansible-playbook deploy.yml -e app_version=3d0b3c5aa1...
registry: ghcr.io
registry_owner: civitech-global
app_version: latest          # override per run; see rollback.yml
image_api: "{{ registry }}/{{ registry_owner }}/civitechglobal-api:{{ app_version }}"
image_bot: "{{ registry }}/{{ registry_owner }}/civitechglobal-bot:{{ app_version }}"
image_web: "{{ registry }}/{{ registry_owner }}/civitechglobal-web:{{ app_version }}"
# Only needed while the GHCR packages are private.
ghcr_username: ""

# ---- Ports -----------------------------------------------------------------
# Every application port binds to loopback. nginx is the only public listener.
# The repo's docker-compose.yml currently publishes 5000 and 4000 on 0.0.0.0;
# docker-compose.prod.yml (rendered by roles/app) overrides that. See
# platform-review.md layer 5.
api_port: 5000
bot_port: 4000
web_port: 8080

# ---- Application env -------------------------------------------------------
node_env: production
log_level: info
cookie_secure: "true"
postgres_user: civitech
postgres_db: civitechglobal
telegram_bot_mode: webhook        # polling for a box with no public URL
telegram_admin_user_ids: ""       # comma-separated numeric Telegram IDs

# ---- nginx / TLS -----------------------------------------------------------
# false until DNS resolves to this server — Let's Encrypt cannot issue for a
# bare IP. Set here, NOT in inventory.ini: group_vars/all outranks inventory
# group vars, so an enable_ssl written there is silently ignored.
enable_ssl: true
nginx_client_max_body_size: 2M    # >= express.json limit of 1mb
# Edge rate limits. These sit in front of the app's Redis-backed limiter and
# drop a flood before it reaches Node at all.
nginx_api_rate: 20r/s
nginx_auth_rate: 1r/s

# ---- Backups ---------------------------------------------------------------
backup_dir: /var/backups/civitech
backup_retention_days: 14
backup_cron_hour: 3
backup_cron_minute: 30
# rclone remote for the off-box copy, e.g. "civitech-backups:civitech".
# EMPTY MEANS BACKUPS LIVE ON THE MACHINE THEY PROTECT. Host loss takes the
# database and all fourteen days of its backups together. The backup role
# prints a loud warning when this is unset.
backup_remote: ""

# ---- Firewall / SSH --------------------------------------------------------
firewall_enabled: true
firewall_allowed_tcp_ports: [22, 80, 443]
ssh_hardening_enabled: true
ssh_permit_password_auth: false   # key-only. Run bootstrap.yml first.
ssh_max_auth_tries: 3
fail2ban_max_retry: 5
fail2ban_find_time: 10m
fail2ban_ban_time: 1h
fail2ban_ignore_ips: []           # add your office IP so you cannot self-ban

# ---- Health monitoring -----------------------------------------------------
# Both URLs are checked and they fail for different reasons: the first goes
# through nginx (so it catches a broken vhost or stopped nginx), the second
# hits the API directly (so a failure there is unambiguously the app).
#
# SCOPE: a checker running on the server catches the APPLICATION dying. It
# cannot tell you the machine is gone — it would be gone too. Run the same
# check from somewhere else for that half.
health_check_urls: >-
  http://127.0.0.1/api/health/ready
  http://127.0.0.1:{{ api_port }}/api/health/ready
health_check_interval: 2min
health_failure_threshold: 2

# ---- Semaphore -------------------------------------------------------------
semaphore_dir: /opt/semaphore
semaphore_image: "semaphoreui/semaphore:v2.10.34"
semaphore_port: 8888
semaphore_admin_user: admin
semaphore_admin_email: "admin@civitech.local"
semaphore_admin_name: "CiviTech Admin"
```

### `group_vars/all/vault.example.yml` (commit)

```yaml
---
# cp vault.example.yml vault.yml, replace every value, then encrypt:
#   ansible-vault encrypt group_vars/all/vault.yml
#
# Generate each with:  openssl rand -hex 32
# deploy.yml asserts these are neither missing nor REPLACE_ME.

vault_postgres_password: "REPLACE_ME"
vault_jwt_secret: "REPLACE_ME_64_HEX_CHARS"
vault_jwt_refresh_secret: "REPLACE_ME_DIFFERENT_64_HEX_CHARS"
vault_telegram_bot_token: "REPLACE_ME_FROM_BOTFATHER"
vault_telegram_webhook_secret: "REPLACE_ME"
vault_sentry_dsn: ""                  # empty = Sentry stays a no-op
vault_seed_admin_email: "admin@civitechglobal.com"
vault_seed_admin_password: "REPLACE_ME"
vault_semaphore_admin_password: "REPLACE_ME"
vault_ghcr_token: ""                  # GitHub PAT with read:packages, if private
vault_telegram_alert_chat_id: ""      # for health alerts
```

Create the real one:

```bash
cd civitech-deploy
cp group_vars/all/vault.example.yml group_vars/all/vault.yml
# edit: openssl rand -hex 32  for each secret
ansible-vault encrypt group_vars/all/vault.yml
echo 'your-vault-password' > ~/.civitech-vault-pass && chmod 600 ~/.civitech-vault-pass
```

Never commit `~/.civitech-vault-pass`. It lives outside the repo.

---

## 5. The playbooks

### `ping.yml` — run this first, before anything changes state

```yaml
---
# ansible-playbook ping.yml
- name: Verify connectivity to the CiviTech server
  hosts: civitech_prod
  become: true
  gather_facts: true

  tasks:
    - name: Ping
      ansible.builtin.ping:

    - name: Report what we are talking to
      ansible.builtin.debug:
        msg: >-
          {{ inventory_hostname }} ({{ ansible_host }}) —
          {{ ansible_distribution }} {{ ansible_distribution_version }},
          {{ ansible_processor_vcpus }} vCPU,
          {{ (ansible_memtotal_mb / 1024) | round(1) }} GB RAM,
          {{ (ansible_mounts | selectattr('mount', 'equalto', '/') | first).size_available
             // 1073741824 }} GB free on /

    - name: Warn on a server too small for this stack
      # Postgres + Redis + three containers, plus headroom for a pg_dump.
      # We deploy pre-built images, so the 1.9 GB build floor does not apply —
      # but 1 GB leaves nothing for the backup.
      ansible.builtin.debug:
        msg: >-
          WARNING: only {{ (ansible_memtotal_mb / 1024) | round(1) }} GB RAM.
          Six containers plus a nightly pg_dump want 2 GB. Add swap.
      when: ansible_memtotal_mb < 1900
```

### `bootstrap.yml` — so you cannot lock yourself out

`roles/common` sets `PasswordAuthentication no`. If your key is not installed
and working when that task runs, your next connection attempt is your last
one and recovery means the VPS provider's web console. This playbook exists
so that cannot happen: it pushes the key, then **proves** key auth works, and
fails loudly if it does not.

```yaml
---
# ansible-playbook bootstrap.yml
# RUN THIS BEFORE provision.yml IF YOU ARE STILL CONNECTING WITH A PASSWORD.
# Needs sshpass on the control machine: sudo apt install -y sshpass
- name: Install the deploy SSH key before SSH is hardened
  hosts: civitech_prod
  gather_facts: false
  vars:
    deploy_public_key_file: "~/.ssh/civitech_ed25519.pub"

  tasks:
    - name: Confirm the public key exists on the control machine
      ansible.builtin.stat:
        path: "{{ deploy_public_key_file | expanduser }}"
      delegate_to: localhost
      register: pubkey

    - name: Fail with instructions when there is no key yet
      ansible.builtin.assert:
        that: [pubkey.stat.exists]
        fail_msg: >-
          No public key at {{ deploy_public_key_file }}. Generate one:
          ssh-keygen -t ed25519 -C civitech-deploy -f ~/.ssh/civitech_ed25519

    - name: Authorise the key
      ansible.posix.authorized_key:
        user: "{{ ansible_user }}"
        key: "{{ lookup('file', deploy_public_key_file | expanduser) }}"
        state: present
        exclusive: false

    - name: Prove key authentication works
      # Deliberately connects with the key and nothing else. If this fails,
      # STOP — do not run provision.yml.
      ansible.builtin.command:
        cmd: >-
          ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new
          -o PasswordAuthentication=no
          -i {{ (deploy_public_key_file | expanduser) | regex_replace('\.pub$', '') }}
          {{ ansible_user }}@{{ ansible_host }} true
      delegate_to: localhost
      changed_when: false

    - name: Report
      ansible.builtin.debug:
        msg: >-
          Key auth confirmed. Remove ansible_ssh_pass from inventory.ini,
          set ansible_ssh_private_key_file, and only then run provision.yml.
```

### `provision.yml` — the machine

```yaml
---
# ansible-playbook provision.yml --vault-password-file ~/.civitech-vault-pass
# Run once, and again whenever anything in group_vars changes the base system.
- name: Provision the CiviTech host
  hosts: civitech_prod
  become: true
  roles:
    - common      # packages, deploy user, firewall, SSH hardening, fail2ban
    - docker      # engine + compose plugin
    - backup      # backup tooling and the cron job — before the first deploy,
                  # because deploy.yml takes a backup before it migrates and
                  # that must not be the thing that creates the directory
```

### `deploy.yml` — the release

```yaml
---
# ansible-playbook deploy.yml --vault-password-file ~/.civitech-vault-pass
#
# Deploy a specific build (do this — see §0):
#   ansible-playbook deploy.yml -e app_version=3d0b3c5aa1b2c3...
#
# Dry run:
#   ansible-playbook deploy.yml --check --diff
- name: Deploy CiviTech Global
  hosts: civitech_prod
  become: true
  serial: 1        # with a second server, this keeps the other one serving

  pre_tasks:
    - name: Refuse to deploy with placeholder secrets
      # A shipped placeholder JWT secret means anyone who reads this
      # repository can mint an admin token. env.ts already throws on a short
      # secret at startup — this catches it before the container even runs.
      ansible.builtin.assert:
        that:
          - vault_jwt_secret is defined
          - not (vault_jwt_secret | string).startswith('REPLACE_ME')
          - (vault_jwt_secret | length) >= 32
          - vault_jwt_refresh_secret is defined
          - vault_jwt_refresh_secret != vault_jwt_secret
          - (vault_jwt_refresh_secret | length) >= 32
          - vault_postgres_password is defined
          - not (vault_postgres_password | string).startswith('REPLACE_ME')
        fail_msg: >-
          group_vars/all/vault.yml still contains template values.
          Generate real ones: openssl rand -hex 32
      no_log: true

    - name: Refuse to deploy an unpinned build
      # :latest deploys "whatever CI pushed most recently", which makes
      # rollback impossible and "which commit is live" unanswerable.
      ansible.builtin.assert:
        that:
          - app_version != 'latest'
        fail_msg: >-
          Pass an immutable tag: -e app_version=<git sha>. Find it under
          Packages on the GitHub repo, or from the CI run for the commit.
      when: not (allow_latest | default(false) | bool)

    - name: Check whether a stack is already running
      ansible.builtin.stat:
        path: "{{ app_root }}/docker-compose.yml"
      register: existing

    - name: Back up before migrating
      # Prisma migrations are forward-only — there is no `migrate down`.
      # rollback.yml can put the old image back; nothing can put the data
      # back except this dump. Skipped on the first deploy.
      ansible.builtin.command:
        cmd: /usr/local/bin/civitech-backup.sh
      changed_when: true
      when:
        - existing.stat.exists
        - pre_deploy_backup | default(true) | bool

  roles:
    - app
```

### `roles/app/tasks/main.yml`

Ordering is deliberate and mirrors Jolfa's: **pull first, migrate second,
start last.** A missing image must abort while the database is untouched.

```yaml
---
- name: Create the deploy directory
  ansible.builtin.file:
    path: "{{ app_root }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: "0750"

- name: Log in to GHCR
  community.docker.docker_login:
    registry_url: "{{ registry }}"
    username: "{{ ghcr_username }}"
    password: "{{ vault_ghcr_token }}"
  when: ghcr_username | length > 0
  no_log: true

- name: Copy the base compose file from the repo
  ansible.builtin.copy:
    src: "{{ playbook_dir }}/../docker-compose.yml"
    dest: "{{ app_root }}/docker-compose.yml"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: "0640"

- name: Render the production compose override
  # Pins image tags (no local build), moves every app port to loopback, and
  # sets resource limits. See templates/docker-compose.prod.yml.j2.
  ansible.builtin.template:
    src: docker-compose.prod.yml.j2
    dest: "{{ app_root }}/docker-compose.prod.yml"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: "0640"

- name: Render the environment file
  ansible.builtin.template:
    src: env.j2
    dest: "{{ app_root }}/.env"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: "0600"
  no_log: true

- name: Pull the pinned images
  # Before anything else touches the database: a typo'd tag fails here,
  # while the running stack is still serving.
  ansible.builtin.command:
    cmd: docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
    chdir: "{{ app_root }}"
  changed_when: true

- name: Start the data services
  ansible.builtin.command:
    cmd: >-
      docker compose -f docker-compose.yml -f docker-compose.prod.yml
      up -d postgres redis
    chdir: "{{ app_root }}"
  changed_when: true

- name: Wait for Postgres to accept connections
  ansible.builtin.command:
    cmd: >-
      docker compose -f docker-compose.yml -f docker-compose.prod.yml
      exec -T postgres pg_isready -U {{ postgres_user }}
    chdir: "{{ app_root }}"
  register: pg_ready
  until: pg_ready.rc == 0
  retries: 30
  delay: 2
  changed_when: false

- name: Apply database migrations
  # `docker-compose.yml` defines a one-shot `migrate` service that runs
  # `prisma migrate deploy` against the same image as the api, and api/bot
  # declare `depends_on: migrate: condition: service_completed_successfully`.
  # Running it explicitly here — rather than letting the `up` below trigger
  # it — means a failed migration aborts the play while the OLD containers
  # are still serving, instead of failing halfway through a stack restart.
  #
  # `migrate deploy`, never `migrate dev`: it applies committed migrations
  # and never generates, prompts, or resets.
  ansible.builtin.command:
    cmd: >-
      docker compose -f docker-compose.yml -f docker-compose.prod.yml
      run --rm migrate
    chdir: "{{ app_root }}"
  changed_when: true

- name: Start the whole stack
  ansible.builtin.command:
    cmd: >-
      docker compose -f docker-compose.yml -f docker-compose.prod.yml
      up -d --remove-orphans
    chdir: "{{ app_root }}"
  changed_when: true

- name: Wait for the API readiness probe
  # /api/health/ready checks Postgres AND Redis and returns 503 when either
  # is down, so a 200 here means the stack is genuinely serving — not just
  # that a process is listening.
  #
  # If this fails, the new release is live and unhealthy. Recover with:
  #   ansible-playbook rollback.yml -e app_version=<previous sha>
  ansible.builtin.uri:
    url: "http://127.0.0.1:{{ api_port }}/api/health/ready"
    status_code: 200
  register: health
  until: health.status == 200
  retries: 20
  delay: 3

- name: Wait for the bot readiness probe
  ansible.builtin.uri:
    url: "http://127.0.0.1:{{ bot_port }}/health/ready"
    status_code: 200
  register: bot_health
  until: bot_health.status == 200
  retries: 20
  delay: 3

- name: Record the deployed version
  # So "which commit is live" has an answer that does not require guessing.
  ansible.builtin.copy:
    dest: "{{ app_root }}/DEPLOYED_VERSION"
    content: "{{ app_version }}\n{{ ansible_date_time.iso8601 }}\n"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: "0644"

- name: Prune dangling images
  ansible.builtin.command: docker image prune -f
  changed_when: false

- name: Report
  ansible.builtin.debug:
    msg: "Deployed {{ app_version[:12] }} — https://{{ domain_name }}"
```

### `roles/app/templates/docker-compose.prod.yml.j2`

```yaml
# {{ ansible_managed }}
# Production overrides for docker-compose.yml. Layered on top of it:
#   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
#
# Three jobs: pin images instead of building, keep every application port on
# loopback, and cap resources so one container cannot take the host.

services:
  postgres:
    ports: []                          # nothing published; compose network only
    deploy:
      resources:
        limits:
          memory: 512M

  redis:
    ports: []
    command: ["redis-server", "--maxmemory", "128mb", "--maxmemory-policy", "allkeys-lru"]
    deploy:
      resources:
        limits:
          memory: 192M

  api:
    build: !reset null                 # deploy the CI image, never build here
    image: {{ image_api }}
    ports:
      # Loopback only. The base compose file publishes 5000 on 0.0.0.0, which
      # lets anyone bypass nginx and every header and rate limit it applies.
      - "127.0.0.1:{{ api_port }}:5000"
    env_file: []
    environment:
      NODE_ENV: production
      DATABASE_URL: "postgresql://{{ postgres_user }}:{{ vault_postgres_password }}@postgres:5432/{{ postgres_db }}?connection_limit=10&pool_timeout=20"
      REDIS_URL: redis://redis:6379
      JWT_SECRET: "{{ vault_jwt_secret }}"
      JWT_REFRESH_SECRET: "{{ vault_jwt_refresh_secret }}"
      CORS_ORIGIN: "https://{{ domain_name }}"
      COOKIE_SECURE: "true"
      LOG_LEVEL: "{{ log_level }}"
      SENTRY_DSN: "{{ vault_sentry_dsn }}"
      PORT: "5000"
    deploy:
      resources:
        limits:
          memory: 512M
    logging:
      # The default json-file driver grows without bound and takes the disk
      # with it. Until logs are shipped somewhere, cap them here.
      driver: json-file
      options: { max-size: "10m", max-file: "5" }

  bot:
    build: !reset null
    image: {{ image_bot }}
    ports:
      - "127.0.0.1:{{ bot_port }}:4000"
    env_file: []
    environment:
      NODE_ENV: production
      DATABASE_URL: "postgresql://{{ postgres_user }}:{{ vault_postgres_password }}@postgres:5432/{{ postgres_db }}"
      REDIS_URL: redis://redis:6379
      TELEGRAM_BOT_TOKEN: "{{ vault_telegram_bot_token }}"
      TELEGRAM_BOT_MODE: "{{ telegram_bot_mode }}"
      TELEGRAM_WEBHOOK_SECRET: "{{ vault_telegram_webhook_secret }}"
      TELEGRAM_WEBHOOK_URL: "https://{{ domain_name }}/telegram/webhook"
      TELEGRAM_ADMIN_USER_IDS: "{{ telegram_admin_user_ids }}"
      SENTRY_DSN: "{{ vault_sentry_dsn }}"
      LOG_LEVEL: "{{ log_level }}"
      BOT_PORT: "4000"
    deploy:
      resources:
        limits:
          memory: 384M
    logging:
      driver: json-file
      options: { max-size: "10m", max-file: "5" }

  web:
    build: !reset null
    image: {{ image_web }}
    ports:
      - "127.0.0.1:{{ web_port }}:80"
    deploy:
      resources:
        limits:
          memory: 128M

  backup:
    environment:
      DATABASE_URL: "postgresql://{{ postgres_user }}:{{ vault_postgres_password }}@postgres:5432/{{ postgres_db }}"
      BACKUP_DIR: /backups
      BACKUP_RETENTION_DAYS: "{{ backup_retention_days }}"
    volumes:
      # Bind-mount to the host path the off-box sync reads from, instead of
      # a named volume the host cannot easily reach.
      - "{{ backup_dir }}:/backups"
```

> `!reset null` requires Compose v2.24+ to clear the `build:` key from the
> base file. On older Compose, drop `build:` from `docker-compose.yml` and
> keep it in a `docker-compose.override.yml` used only for local dev — the
> cleaner split anyway.

---

## 6. nginx and TLS

`nginx.yml`:

```yaml
---
# ansible-playbook nginx.yml
#
# DNS not propagated yet? Let's Encrypt cannot issue for a bare IP:
#   ansible-playbook nginx.yml -e enable_ssl=false
# Then re-run without the flag once the domain resolves.
- name: Configure nginx and TLS
  hosts: civitech_prod
  become: true
  roles:
    - nginx
```

### `roles/nginx/templates/civitech.conf.j2`

The design points, each of which comes from a mistake someone already made:

```nginx
{{ ansible_managed | comment }}
#
# certbot --nginx edits this file in place to add the 443 listener and the
# HTTP->HTTPS redirect. Re-running this role rewrites the file and certbot
# re-applies its changes on the next run, so the two stay compatible.

# Edge rate limiting. The app's own limiter is Redis-backed and correct, but
# every request it rejects has still been accepted, parsed, run through
# optionalAuth (a DB read when a token is present) and round-tripped to Redis.
# nginx drops a flood for microseconds, before any of that.
limit_req_zone  $binary_remote_addr zone=civitech_api:10m  rate={{ nginx_api_rate }};
limit_req_zone  $binary_remote_addr zone=civitech_auth:10m rate={{ nginx_auth_rate }};
limit_conn_zone $binary_remote_addr zone=civitech_conn:10m;

# An upstream block rather than a bare proxy_pass: keepalive to the backend
# measurably cuts latency, and this is the seam where a second API replica
# goes when you need one.
upstream civitech_api {
    server 127.0.0.1:{{ api_port }};
    keepalive 32;
}
upstream civitech_web {
    server 127.0.0.1:{{ web_port }};
    keepalive 16;
}
upstream civitech_bot {
    server 127.0.0.1:{{ bot_port }};
    keepalive 8;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name {{ domain_name }}{% if domain_alias %} {{ domain_alias }}{% endif %};

    client_max_body_size {{ nginx_client_max_body_size }};
    client_body_timeout 30s;

    # An include, not inline directives — and repeated in every location that
    # sets a header of its own. nginx inherits add_header into a location ONLY
    # when that location declares none itself, so a block that sets
    # Cache-Control silently serves no security headers at all. The repo's own
    # civitechglobal-web/nginx.conf documents this same trap.
    include /etc/nginx/civitech_security_headers;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css application/javascript application/json
               image/svg+xml font/woff2 application/manifest+json;

    error_page 502 503 504 /maintenance.html;
    location = /maintenance.html {
        root /var/www/civitech-static;
        internal;
    }

    # Health checks: never rate limited, never logged. The API exempts them
    # from its own limiter too (they are registered before the middleware in
    # src/app.ts), so a monitor is never throttled.
    location = /api/health/live  { proxy_pass http://civitech_api; include /etc/nginx/civitech_proxy_params; access_log off; }
    location = /api/health/ready { proxy_pass http://civitech_api; include /etc/nginx/civitech_proxy_params; access_log off; }

    # Credential endpoints: tighter than the rest of the API, because these
    # guard passwords. burst=5 nodelay tolerates a human retyping; a
    # credential-stuffing run hits the wall immediately.
    location /api/auth/ {
        limit_req  zone=civitech_auth burst=5 nodelay;
        limit_conn civitech_conn 10;
        proxy_pass http://civitech_api;
        include /etc/nginx/civitech_proxy_params;
    }

    location /api/ {
        limit_req  zone=civitech_api burst=40 nodelay;
        limit_conn civitech_conn 25;
        proxy_pass http://civitech_api;
        include /etc/nginx/civitech_proxy_params;
        proxy_read_timeout 60s;
    }

    # Telegram webhook. Telegram retries on failure and the bot verifies the
    # secret header itself, so this is separated from /api/ and given its own
    # generous budget.
    location /telegram/ {
        limit_req zone=civitech_api burst=60 nodelay;
        proxy_pass http://civitech_bot;
        include /etc/nginx/civitech_proxy_params;
    }

    # Everything else is the SPA container, which already sets its own
    # Cache-Control (immutable on /assets/, no-cache on index.html) and its
    # own CSP. Do not duplicate those here — one owner per header.
    location / {
        proxy_pass http://civitech_web;
        include /etc/nginx/civitech_proxy_params;
    }
}
```

`roles/nginx/templates/civitech_proxy_params.j2`:

```nginx
proxy_http_version 1.1;
proxy_set_header Connection "";
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
# The API generates a request id when this is absent and echoes it back;
# passing one through makes a request traceable across both layers.
proxy_set_header X-Request-Id      $request_id;
```

`roles/nginx/templates/civitech_security_headers.j2`:

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options    "nosniff" always;
add_header X-Frame-Options           "SAMEORIGIN" always;
add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
add_header Permissions-Policy        "camera=(), microphone=(), geolocation=()" always;
```

> **`trust proxy`.** `src/app.ts` sets `app.set('trust proxy', 1)` — correct
> for exactly one proxy hop. This design has one (nginx), so it stays
> correct. If you later put Cloudflare in front, it becomes wrong and every
> client shares a single rate-limit bucket.

### The certbot task

```yaml
- name: Install certbot
  ansible.builtin.apt:
    name: [certbot, python3-certbot-nginx]
    state: present
  when: enable_ssl | bool

- name: Reload nginx before certbot runs
  ansible.builtin.meta: flush_handlers

- name: Obtain or renew the certificate
  ansible.builtin.command:
    cmd: >-
      certbot --nginx -d {{ domain_name }}
      {% if domain_alias %}-d {{ domain_alias }}{% endif %}
      --non-interactive --agree-tos --email {{ certbot_email }} --redirect
  register: certbot_result
  changed_when: "'Successfully received certificate' in certbot_result.stdout"
  when: enable_ssl | bool
```

The Ubuntu certbot package installs its own renewal timer; verify with
`systemctl list-timers | grep certbot` and dry-run it once:
`certbot renew --dry-run`.

**After TLS is live**, HTTP/2 comes free — add `http2 on;` to the server
block certbot created. That single line is the largest latency win available
to a Persian-first audience far from the server.

---

## 7. Backups that survive the host

The repo's `backup` sidecar already dumps daily with 14-day pruning. Its one
flaw is decisive: the dumps live on the same host and the same disk as the
database. `roles/backup` fixes that.

```yaml
---
# roles/backup/tasks/main.yml
- name: Create the backup directory
  ansible.builtin.file:
    path: "{{ backup_dir }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: "0700"

- name: Install rclone for the off-box copy
  ansible.builtin.apt:
    name: rclone
    state: present
  when: backup_remote | length > 0

- name: Install the backup script
  ansible.builtin.template:
    src: civitech-backup.sh.j2
    dest: /usr/local/bin/civitech-backup.sh
    mode: "0750"
    owner: root

- name: Schedule the nightly backup
  ansible.builtin.cron:
    name: civitech-postgres-backup
    hour: "{{ backup_cron_hour }}"
    minute: "{{ backup_cron_minute }}"
    job: "/usr/local/bin/civitech-backup.sh >> /var/log/civitech-backup.log 2>&1"

- name: Warn when backups never leave this machine
  # Not a failure — an explicit, unmissable decision. Host loss, disk loss or
  # a stray `docker volume prune` takes the database and all
  # {{ backup_retention_days }} days of its backups together.
  ansible.builtin.debug:
    msg: >-
      WARNING: backup_remote is empty. Backups exist ONLY on the machine they
      are protecting. Set backup_remote to an rclone target, or record that
      you accept losing the data with the host.
  when: backup_remote | length == 0
```

The script does `pg_dump | gzip` through `docker compose exec`, prunes by
`-mtime`, then `rclone copy`s to the remote when one is set.

**A backup you have not restored is a hypothesis.** Once a quarter, restore
the newest dump into a scratch database and count the rows:

```bash
gunzip -c /var/backups/civitech/civitechglobal_<ts>.sql.gz | \
  docker compose exec -T postgres psql -U civitech -d restore_test
docker compose exec -T postgres psql -U civitech -d restore_test \
  -c 'select count(*) from leads;'
```

Write the date and the row count somewhere. That record is the difference
between having backups and knowing you do.

---

## 8. Rollback

```yaml
---
# ansible-playbook rollback.yml -e app_version=<previous sha>
#
# WHAT THIS UNDOES AND WHAT IT DOES NOT
#
# It swaps the images back. It does NOT undo database migrations — Prisma
# migrations are forward-only and there is no `migrate down`. If the release
# you are rolling back from ADDED a column, the old code ignores it and
# everything is fine. If it DROPPED or RENAMED one, the old code fails
# against the new schema and a code rollback is not enough: restore from the
# dump deploy.yml took before it migrated.
#
# This is why destructive migrations ship in two releases — add the new
# shape, move the reads, drop the old shape in a later deploy.
- name: Roll back to a previous build
  hosts: civitech_prod
  become: true

  pre_tasks:
    - name: Require an explicit target
      ansible.builtin.assert:
        that:
          - app_version is defined
          - app_version != 'latest'
        fail_msg: >-
          Pass the tag to roll back to: -e app_version=<sha>. The currently
          deployed one is in {{ app_root }}/DEPLOYED_VERSION.

    - name: Show what is currently deployed
      ansible.builtin.command: "cat {{ app_root }}/DEPLOYED_VERSION"
      register: current_version
      changed_when: false
      failed_when: false

    - name: Report
      ansible.builtin.debug:
        msg: "Rolling back from {{ current_version.stdout_lines | first | default('unknown') }} to {{ app_version }}"

  roles:
    - role: app
      vars:
        pre_deploy_backup: false   # nothing new is being migrated
```

---

## 9. Monitoring

`roles/monitoring` installs a systemd timer that curls both health URLs from
`health_check_urls` and alerts to Telegram after
`health_failure_threshold` consecutive failures.

**Say the scope out loud so it does not become false confidence:** a checker
running on the server catches the *application* dying. It cannot tell you the
*machine* is gone — it would be gone too. Run the same check from somewhere
else (a laptop cron, a free uptime service hitting
`https://civitechglobal.com/api/health/live`) for that half. Both halves are
cheap; only having one is the mistake.

The two URLs fail for different reasons on purpose: the first goes through
nginx, so it also catches a broken vhost or a stopped nginx; the second hits
the API directly, so a failure there is unambiguously the app.

---

## 10. Semaphore UI

```yaml
---
# ansible-playbook semaphore.yml --vault-password-file ~/.civitech-vault-pass
- name: Install Semaphore UI
  hosts: semaphore
  become: true
  roles:
    - semaphore
```

Compose template — note what is deliberately *not* here:

```yaml
# {{ ansible_managed }}
services:
  semaphore:
    image: {{ semaphore_image }}
    container_name: semaphore
    restart: unless-stopped
    ports:
      # Bound to loopback ON PURPOSE. Semaphore holds the SSH key to this
      # server and the Ansible Vault password; its login form must not face
      # the internet. Reach it through an SSH tunnel.
      #
      # C:\Workspace\verifywise\ansible\semaphore-compose.yml publishes
      # "8888:3000" on all interfaces with the admin password committed in
      # git. Do not copy that.
      - "127.0.0.1:{{ semaphore_port }}:3000"
    environment:
      SEMAPHORE_DB_DIALECT: bolt        # switch to postgres for a real team
      SEMAPHORE_ADMIN: {{ semaphore_admin_user }}
      SEMAPHORE_ADMIN_PASSWORD: {{ vault_semaphore_admin_password }}
      SEMAPHORE_ADMIN_NAME: {{ semaphore_admin_name }}
      SEMAPHORE_ADMIN_EMAIL: {{ semaphore_admin_email }}
      ANSIBLE_HOST_KEY_CHECKING: "True"
    volumes:
      - semaphore-data:/etc/semaphore
      - semaphore-tmp:/tmp/semaphore
volumes:
  semaphore-data:
  semaphore-tmp:
```

The port is **not** opened in the firewall. Reach it over a tunnel:

```bash
ssh -L 8888:127.0.0.1:8888 root@<server-ip>
# then open http://localhost:8888
```

### Wiring it up

Full click-by-click walkthrough with screenshots of every field is in
[`ansible-semaphore-ui.md`](./ansible-semaphore-ui.md). The short version,
in order:

1. **Key Store** — add the deploy SSH private key (type: SSH Key), and the
   Ansible Vault password (type: Login/Password, password field only).
2. **Repository** — this repo, branch `main`, using a read-only deploy key.
3. **Inventory** — type "File", path `civitech-deploy/inventory.ini`, SSH key
   from the store. Or paste the inventory as "Static" if you would rather it
   not live in git at all.
4. **Environment** — non-secret extra vars as JSON, e.g. `{"app_version":
   "latest"}` so the survey below has a default.
5. **Task templates**, one per playbook:

| Template | Playbook | Notes |
|---|---|---|
| Ping | `civitech-deploy/ping.yml` | run this first |
| Provision | `civitech-deploy/provision.yml` | vault password required |
| **Deploy** | `civitech-deploy/deploy.yml` | survey variable `app_version` |
| nginx + TLS | `civitech-deploy/nginx.yml` | survey variable `enable_ssl` |
| Backup now | `civitech-deploy/backup.yml` | `-e run_now=true`; schedule nightly |
| Rollback | `civitech-deploy/rollback.yml` | survey variable `app_version`, required |

The **survey variable** is what makes Semaphore worth installing: whoever
deploys picks the SHA from a form field instead of remembering
`-e app_version=...`, and every run is recorded with who ran it, what they
chose, and the full output.

Set the vault password on each template that needs it (`--vault-password-file`
is handled by attaching the Login/Password key).

**Semaphore does not replace Ansible.** If a playbook does not work from your
terminal, it will not work here — it will just fail more colourfully. Get
§5 working from WSL first.

---

## 11. First run, in order

```bash
cd civitech-deploy
export VP=~/.civitech-vault-pass

ansible-playbook ping.yml                                   # can we reach it?
ansible-playbook bootstrap.yml                              # key auth, proven
ansible-playbook provision.yml       --vault-password-file $VP
ansible-playbook nginx.yml -e enable_ssl=false              # if DNS isn't ready
ansible-playbook deploy.yml -e app_version=<sha> --vault-password-file $VP
ansible-playbook nginx.yml           --vault-password-file $VP   # now with TLS
ansible-playbook monitoring.yml
ansible-playbook semaphore.yml       --vault-password-file $VP
```

Then verify, from your laptop rather than the server:

```bash
curl -sI https://civitechglobal.com | head -1
curl -s  https://civitechglobal.com/api/health/ready | jq
# {"success":true,"message":"API is ready","checks":{"database":true,"redis":true}}
```

Seed the first admin (only creates one if none exists):

```bash
ssh root@<ip> 'cd /opt/civitech && docker compose \
  -f docker-compose.yml -f docker-compose.prod.yml \
  run --rm --entrypoint "" api npx tsx prisma/seed.ts'
```

Log in at `/admin` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from the
vault, and change the password immediately.

---

## 12. Continuous delivery

The last missing link. CI builds, scans and pushes; nothing collects. Add a
`deploy` job to `.github/workflows/ci.yml`, gated on the `docker` job and on
a **GitHub Environment with required reviewers**, so a merge to `main`
proposes a deploy rather than performing one:

```yaml
  deploy:
    name: Deploy to production
    needs: [docker]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: production          # add required reviewers in repo settings
      url: https://civitechglobal.com
    steps:
      - uses: actions/checkout@v4

      - name: Install Ansible
        run: pipx install --include-deps ansible

      - name: Restore the SSH key
        run: |
          install -m 700 -d ~/.ssh
          echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -H "${{ secrets.DEPLOY_HOST }}" >> ~/.ssh/known_hosts

      - name: Deploy this exact commit
        working-directory: civitech-deploy
        run: |
          echo "${{ secrets.ANSIBLE_VAULT_PASSWORD }}" > /tmp/vp
          chmod 600 /tmp/vp
          ansible-playbook deploy.yml \
            -e app_version=${{ github.sha }} \
            --vault-password-file /tmp/vp
```

`app_version=${{ github.sha }}` closes the loop: the images the `docker` job
just built and Trivy just scanned are precisely the ones that go live.

Also add a lint job — a playbook is code, and it is the code that touches
production:

```yaml
  ansible-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pipx install ansible-lint
      - run: ansible-lint civitech-deploy/
```

---

## 13. Day-2 operations

| Task | Command |
|---|---|
| What is live? | `ssh … 'cat /opt/civitech/DEPLOYED_VERSION'` |
| Deploy | `ansible-playbook deploy.yml -e app_version=<sha> --vault-password-file $VP` |
| Roll back | `ansible-playbook rollback.yml -e app_version=<previous sha>` |
| Logs | `docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api` |
| One request's trail | `docker compose logs api \| grep <x-request-id>` |
| Backup now | `ansible-playbook backup.yml -e run_now=true` |
| List backups | `ls -lh /var/backups/civitech/` |
| Health | `curl -s localhost:5000/api/health/ready \| jq` |
| Restart one service | `docker compose … restart api` |
| Rotate a secret | edit `vault.yml` → `ansible-playbook deploy.yml` (re-renders `.env`, recreates containers) |
| Force-logout a user | bump their `tokenVersion` — invalidates every access and refresh token they hold |
| Renew TLS manually | `certbot renew --force-renewal && systemctl reload nginx` |

### Two failure modes worth rehearsing before they happen

**A deploy that comes up unhealthy.** `deploy.yml` polls
`/api/health/ready` twenty times at 3-second intervals and fails the run if
it never returns 200 — but by then the new images are running. Read
`docker compose logs api` first: the readiness probe reports *which*
dependency failed (`checks.database` / `checks.redis`), which is usually the
whole answer. If it is not, roll back to the previous SHA and debug with the
site up.

**A migration you need to undo.** You cannot. Restore the dump `deploy.yml`
took immediately before migrating, then deploy the previous image. This is
why that backup task exists and why it runs before the migration rather than
after it.

---

## 14. What this guide does not cover

Honest boundaries, so nothing here reads as more than it is:

- **One server.** No load balancer, no second API replica, no read replica.
  The `upstream` blocks in §6 and the stateless-JWT/Redis-counter design mean
  adding one is a small change — but this guide does not do it.
- **No CDN.** §6 gets you TLS and HTTP/2 from a single origin. A CDN in front
  is the next meaningful latency win and is configuration outside this repo.
- **No metrics or log aggregation.** §9 gives you up/down alerting, which is
  not the same as observability. `C:\Workspace\verifywise\observability\` —
  Prometheus, Loki, Grafana with provisioned dashboards, an OTel collector —
  is the template to copy when you want trends rather than incidents.
- **No secret rotation schedule.** The mechanism is one `deploy.yml` run;
  deciding how often is yours.

---

*Companion to [`platform-review.md`](./platform-review.md). Written
2026-09-02 against commit `3d0b3c5`.*
