# Ansible from zero — deploying CiviTech Global

This guide assumes you have **never used Ansible**. It explains the mental
model first, then walks you through installing it, proving it works, and
finally building a real playbook that deploys this monorepo (postgres, redis,
api, bot, web, backup) onto a Linux server.

Everything here is done from your terminal. Once it works from the terminal,
[`ansible-semaphore-ui.md`](./ansible-semaphore-ui.md) shows you how to put a
web UI on top of it.

---

## Table of contents

1. [What Ansible actually is](#1-what-ansible-actually-is)
2. [Vocabulary you need](#2-vocabulary-you-need)
3. [Installing Ansible (including on Windows)](#3-installing-ansible-including-on-windows)
4. [Preparing the server](#4-preparing-the-server)
5. [Your first inventory + ping](#5-your-first-inventory--ping)
6. [Ad-hoc commands](#6-ad-hoc-commands)
7. [Your first playbook](#7-your-first-playbook)
8. [Idempotency — the one idea that matters most](#8-idempotency--the-one-idea-that-matters-most)
9. [Variables, group_vars, and templates](#9-variables-group_vars-and-templates)
10. [Secrets with Ansible Vault](#10-secrets-with-ansible-vault)
11. [The real deploy playbook for this repo](#11-the-real-deploy-playbook-for-this-repo)
12. [Handlers, tags, and safe dry runs](#12-handlers-tags-and-safe-dry-runs)
13. [Roles — organizing once it grows](#13-roles--organizing-once-it-grows)
14. [Troubleshooting](#14-troubleshooting)
15. [Cheat sheet](#15-cheat-sheet)

---

## 1. What Ansible actually is

Ansible is a tool that **logs into servers over SSH and runs things for you**,
based on a file describing the end state you want.

Three properties make it different from a shell script:

- **Agentless.** You do not install anything on the server. If you can `ssh`
  into it and it has Python 3, Ansible can manage it. All the "agent" logic is
  pushed over the connection at run time and cleaned up afterwards.
- **Declarative.** You write "the package `docker-ce` should be installed" and
  "the file `/opt/civitech/.env` should have this content", not "run apt-get
  install" and "run cat > file". Ansible checks the current state and only
  changes what does not match.
- **Push-based.** You run a command on *your* machine; it reaches out to the
  servers. There is no daemon polling from the server side.

The practical payoff: your deploy stops living in your head and in shell
history. It becomes a file in git that anyone can run and that produces the
same result whether the server is brand new or already half-configured.

### How a run actually works

```
your laptop (control node)
  │  reads inventory  → which hosts?
  │  reads playbook   → what should be true on them?
  │  opens SSH
  ▼
server (managed node)
     Ansible copies a small Python module for each task,
     runs it, collects JSON result, deletes it, moves to next task
```

---

## 2. Vocabulary you need

You will see these words constantly. Learn them now and the docs stop being
confusing.

| Term | What it means |
|---|---|
| **Control node** | The machine you run `ansible` from. Must be Linux/macOS/WSL — *not* native Windows. |
| **Managed node** | A server Ansible configures. Needs SSH + Python 3. |
| **Inventory** | A file listing your servers, optionally in groups. |
| **Module** | A single unit of work Ansible knows how to do (`apt`, `copy`, `docker_compose_v2`, `service`). Hundreds ship built in. |
| **Task** | One invocation of a module, with a human-readable `name`. |
| **Play** | A set of tasks mapped to a set of hosts. |
| **Playbook** | A YAML file containing one or more plays. This is the thing you run. |
| **Role** | A reusable, directory-shaped bundle of tasks/templates/vars. |
| **Handler** | A task that only runs if something else reported a change (e.g. "restart nginx"). |
| **Facts** | Information Ansible gathers about a host automatically (OS, IP, memory) and exposes as variables. |
| **Idempotent** | Running it twice produces the same result as running it once. |
| **Vault** | Ansible's built-in encryption for secrets stored in git. |

---

## 3. Installing Ansible (including on Windows)

### Important note for Windows users

**Ansible does not run on native Windows as a control node.** There is no
supported `ansible` for PowerShell/cmd. Since this repo is developed on
Windows, use **WSL2** (Windows Subsystem for Linux). Ansible can still *manage*
Windows servers — it just cannot be *driven* from one.

Install WSL2 once, from an elevated PowerShell:

```powershell
wsl --install -d Ubuntu
```

Reboot, let Ubuntu finish first-time setup, then do everything below **inside
the Ubuntu shell**.

### Install Ansible

On Ubuntu/Debian (including WSL):

```bash
sudo apt update
sudo apt install -y python3 python3-pip pipx
pipx ensurepath
pipx install --include-deps ansible
```

Restart your shell, then verify:

```bash
ansible --version
```

You should see something like `ansible [core 2.1x.x]` plus the Python version
it is using. If you get `ansible: command not found`, your `PATH` did not pick
up pipx — run `pipx ensurepath` again and open a new terminal.

> **Why pipx and not `apt install ansible`?** The distro package is often
> several releases behind and mixes Ansible's Python dependencies into your
> system Python. pipx gives you a current version in its own isolated
> environment.

### Install the collections this guide uses

Ansible ships a small core; extra modules live in **collections**. The Docker
modules are not built in:

```bash
ansible-galaxy collection install community.docker community.general
```

### Where to put your Ansible files

Create a `deploy/` directory *outside* this repo, or a separate `infra` repo.
Deployment credentials and server inventories generally should not live in the
application repo. This guide assumes:

```
~/civitech-deploy/
├── ansible.cfg
├── inventory.ini
├── group_vars/
├── deploy.yml
└── templates/
```

Create it:

```bash
mkdir -p ~/civitech-deploy/{group_vars,templates}
cd ~/civitech-deploy
```

### ansible.cfg

This file configures Ansible for the current directory. Without it you have to
pass flags on every command. Create `~/civitech-deploy/ansible.cfg`:

```ini
[defaults]
inventory = ./inventory.ini
host_key_checking = True
retry_files_enabled = False
stdout_callback = yaml
interpreter_python = auto_silent

[ssh_connection]
pipelining = True
```

- `stdout_callback = yaml` makes output readable instead of one long JSON line.
- `pipelining = True` makes runs noticeably faster.
- Leave `host_key_checking = True`. Turning it off disables SSH host key
  verification, which is what protects you from connecting to an impostor
  server. Instead, add the real key once with
  `ssh-keyscan -H your.server.ip >> ~/.ssh/known_hosts` — after verifying the
  fingerprint against what your VPS provider shows you.

---

## 4. Preparing the server

You need one Linux server (Ubuntu 22.04 or 24.04 LTS is the easy choice) that
you can SSH into.

### Set up key-based SSH

Password SSH will fight you constantly. Generate a key on the control node if
you do not have one:

```bash
ssh-keygen -t ed25519 -C "civitech-deploy"
ssh-copy-id root@your.server.ip
```

Confirm it works with no password prompt:

```bash
ssh root@your.server.ip 'echo connected'
```

If that does not print `connected`, **stop here and fix SSH first.** Ansible
cannot do anything your SSH client cannot do.

### Create a deploy user (recommended)

Running everything as `root` works but is a bad habit. Ansible can create a
less-privileged user for you — but for the very first run you will still
connect as `root`. That is fine; this is the one bootstrap step.

---

## 5. Your first inventory + ping

The inventory lists your hosts. Start with the simple INI format. Create
`~/civitech-deploy/inventory.ini`:

```ini
[civitech_prod]
civitech-prod ansible_host=your.server.ip

[civitech_prod:vars]
ansible_user=root
ansible_ssh_private_key_file=~/.ssh/id_ed25519
ansible_python_interpreter=/usr/bin/python3
```

Reading this:

- `[civitech_prod]` is a **group name**. Playbooks target groups.
- `civitech-prod` is the host's **alias** — a friendly name for your logs.
- `ansible_host=` is the real address it connects to.
- `[civitech_prod:vars]` sets variables for every host in that group.

Now the traditional first command — `ping` here is not ICMP, it is "can I log
in and run Python on this host":

```bash
cd ~/civitech-deploy
ansible civitech_prod -m ping
```

Success looks like:

```yaml
civitech-prod | SUCCESS => {
    "changed": false,
    "ping": "pong"
}
```

If you see `UNREACHABLE`, it is an SSH problem, not an Ansible problem — see
[Troubleshooting](#14-troubleshooting).

---

## 6. Ad-hoc commands

Before playbooks, get a feel for modules by running single tasks directly. The
shape is `ansible <hosts> -m <module> -a "<arguments>"`.

```bash
# Show gathered facts (a big JSON blob of everything Ansible knows)
ansible civitech_prod -m setup

# Just the OS family
ansible civitech_prod -m setup -a 'filter=ansible_distribution*'

# Free disk space
ansible civitech_prod -m shell -a 'df -h /'

# Install a package (needs root; -b means "become", i.e. sudo)
ansible civitech_prod -m apt -a 'name=htop state=present update_cache=yes' -b

# Uptime
ansible civitech_prod -m command -a 'uptime'
```

Two useful habits from day one:

- **`-b` / `--become`** is Ansible's sudo. Anything touching system state needs
  it (unless you connect as root).
- Prefer a real module (`apt`) over `shell`. The module is idempotent and tells
  you whether it changed anything; `shell` runs blindly every time.

---

## 7. Your first playbook

A playbook is YAML. YAML is whitespace-sensitive: **two spaces per indent
level, never tabs.**

Create `~/civitech-deploy/first.yml`:

```yaml
---
- name: My first play
  hosts: civitech_prod
  become: true

  tasks:
    - name: Make sure curl and git are installed
      ansible.builtin.apt:
        name:
          - curl
          - git
        state: present
        update_cache: true

    - name: Create a marker file
      ansible.builtin.copy:
        content: "managed by ansible\n"
        dest: /etc/civitech-managed
        owner: root
        group: root
        mode: "0644"
```

Run it:

```bash
ansible-playbook first.yml
```

Read the output line by line — this is the core feedback loop:

```
PLAY [My first play] ***********************************************

TASK [Gathering Facts] *********************************************
ok: [civitech-prod]

TASK [Make sure curl and git are installed] ************************
changed: [civitech-prod]

TASK [Create a marker file] ****************************************
changed: [civitech-prod]

PLAY RECAP *********************************************************
civitech-prod : ok=3  changed=2  unreachable=0  failed=0
```

- **ok** = checked, already correct, nothing done.
- **changed** = Ansible modified the system.
- **failed** = task errored; the play stops for that host.

Now run the exact same command again. Everything becomes `ok`, `changed=0`.
That is idempotency, and it is the whole point.

### Anatomy of what you just wrote

```yaml
- name: My first play        # shows in output; always write one
  hosts: civitech_prod       # which inventory group
  become: true               # run tasks with sudo
  tasks:                     # ordered list, top to bottom
    - name: ...              # task description
      ansible.builtin.apt:   # fully-qualified module name
        name: [...]          # module arguments
        state: present
```

`ansible.builtin.apt` is the "fully qualified collection name" (FQCN). You can
write just `apt`, but the long form is unambiguous and is what current docs
use — worth the habit.

---

## 8. Idempotency — the one idea that matters most

Almost every module takes a `state:` describing the desired end state, not the
action:

| You want | You write |
|---|---|
| Package installed | `state: present` |
| Package removed | `state: absent` |
| Directory exists | `ansible.builtin.file` with `state: directory` |
| Service running and enabled at boot | `ansible.builtin.systemd` with `state: started`, `enabled: true` |
| A line to exist in a config file | `ansible.builtin.lineinfile` |
| A whole file rendered from a template | `ansible.builtin.template` |

When you *must* run a raw command, make it idempotent yourself with `creates`
or `changed_when`:

```yaml
- name: Run a one-time setup script
  ansible.builtin.command: /opt/civitech/setup.sh
  args:
    creates: /opt/civitech/.setup-done   # skipped entirely if this exists

- name: Check something without ever reporting "changed"
  ansible.builtin.command: docker compose ps
  register: compose_status
  changed_when: false
```

`register:` saves a task's result into a variable you can inspect or use in a
`when:` condition later.

---

## 9. Variables, group_vars, and templates

Hardcoding paths and versions in tasks gets painful fast. Move them to
`group_vars/<groupname>.yml`, which Ansible loads automatically for hosts in
that group.

`~/civitech-deploy/group_vars/civitech_prod.yml`:

```yaml
---
app_dir: /opt/civitech
app_repo: git@github.com:your-org/our-website.git
app_branch: main
deploy_user: civitech

postgres_user: civitech
postgres_db: civitechglobal

api_port: 5000
bot_port: 4000
web_port: 5173

public_site_url: https://civitechglobal.com
telegram_bot_url: https://t.me/civitechglobal_bot
```

Use them with `{{ }}`:

```yaml
- name: Ensure app directory exists
  ansible.builtin.file:
    path: "{{ app_dir }}"
    state: directory
    owner: "{{ deploy_user }}"
    mode: "0750"
```

> **YAML gotcha:** a value that *starts* with `{{` must be quoted, or YAML
> parses it as a dictionary. `path: "{{ app_dir }}"` — good.
> `path: {{ app_dir }}` — syntax error.

### Templates

A template is a file with `{{ variables }}` in it, rendered per host. This is
how you generate the `.env` files this project needs. Jinja2 is the templating
language; `.j2` is the conventional extension.

`~/civitech-deploy/templates/server.env.j2`:

```jinja
# Managed by Ansible — do not edit on the server.
DATABASE_URL="postgresql://{{ postgres_user }}:{{ postgres_password }}@postgres:5432/{{ postgres_db }}"
REDIS_URL="redis://redis:6379"

JWT_SECRET="{{ jwt_secret }}"
JWT_REFRESH_SECRET="{{ jwt_refresh_secret }}"

TELEGRAM_BOT_TOKEN="{{ telegram_bot_token }}"
TELEGRAM_ADMIN_USER_IDS="{{ telegram_admin_user_ids }}"
TELEGRAM_WEBHOOK_SECRET="{{ telegram_webhook_secret }}"
TELEGRAM_WEBHOOK_URL="{{ telegram_webhook_url }}"
TELEGRAM_BOT_MODE="webhook"

PORT={{ api_port }}
BOT_PORT={{ bot_port }}

CORS_ORIGIN="{{ public_site_url }}"
COOKIE_SECURE="true"

NODE_ENV="production"
LOG_LEVEL="info"

SENTRY_DSN="{{ sentry_dsn | default('') }}"
```

Compare this against `civitechglobal-server/.env.example` and note what
changed. `COOKIE_SECURE="true"`, `NODE_ENV="production"`, and
`TELEGRAM_BOT_MODE="webhook"` are all flipped — the committed example is tuned
for local HTTP development, and every one of those needs to change for a real
deployment. `| default('')` is a Jinja2 filter: use the variable if defined,
otherwise an empty string.

Deliberately absent: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. Those exist so
local seeding is reproducible; do not template a known admin password onto a
production host.

---

## 10. Secrets with Ansible Vault

`postgres_password`, `jwt_secret`, and `telegram_bot_token` cannot sit in
plaintext in git. Ansible Vault encrypts a file with a passphrase; playbooks
read it transparently at run time.

Create an encrypted vars file:

```bash
cd ~/civitech-deploy
ansible-vault create group_vars/civitech_prod_vault.yml
```

Your editor opens. Put the secrets in:

```yaml
---
vault_postgres_password: "a-long-random-password"
vault_jwt_secret: "output-of-openssl-rand-hex-32"
vault_jwt_refresh_secret: "a-different-openssl-rand-hex-32"
vault_telegram_bot_token: "123456:ABC-real-token"
vault_telegram_webhook_secret: "another-random-string"
```

Save and close — the file on disk is now ciphertext, safe to commit.

The convention is to prefix vaulted names with `vault_` and map them to plain
names in your regular vars file. That way you can grep for where a value comes
from:

```yaml
# group_vars/civitech_prod.yml
postgres_password: "{{ vault_postgres_password }}"
jwt_secret: "{{ vault_jwt_secret }}"
jwt_refresh_secret: "{{ vault_jwt_refresh_secret }}"
telegram_bot_token: "{{ vault_telegram_bot_token }}"
telegram_webhook_secret: "{{ vault_telegram_webhook_secret }}"
```

Generate strong values with `openssl rand -hex 32`, as the repo's
`.env.example` suggests.

Working with vault files:

```bash
ansible-vault edit group_vars/civitech_prod_vault.yml    # edit in place
ansible-vault view group_vars/civitech_prod_vault.yml    # read only
ansible-vault rekey group_vars/civitech_prod_vault.yml   # change passphrase

# Run a playbook that needs the vault
ansible-playbook deploy.yml --ask-vault-pass
```

For automation (and for Semaphore later), keep the passphrase in a file
instead of typing it:

```bash
echo 'your-vault-passphrase' > ~/.civitech-vault-pass
chmod 600 ~/.civitech-vault-pass
ansible-playbook deploy.yml --vault-password-file ~/.civitech-vault-pass
```

Never commit that passphrase file. Add it to `.gitignore` in your deploy repo.

---

## 11. The real deploy playbook for this repo

Now the actual thing. This deploys the monorepo's Docker Compose stack —
`postgres`, `redis`, `api`, `bot`, `web`, and `backup` — onto the server.

### Part A: provisioning (run once, or whenever the server changes)

`~/civitech-deploy/provision.yml`:

```yaml
---
- name: Provision the CiviTech host
  hosts: civitech_prod
  become: true

  tasks:
    - name: Install base packages
      ansible.builtin.apt:
        name:
          - ca-certificates
          - curl
          - git
          - gnupg
          - python3-pip
        state: present
        update_cache: true

    - name: Ensure the apt keyrings directory exists
      ansible.builtin.file:
        path: /etc/apt/keyrings
        state: directory
        mode: "0755"

    - name: Add Docker's official GPG key
      ansible.builtin.get_url:
        url: https://download.docker.com/linux/ubuntu/gpg
        dest: /etc/apt/keyrings/docker.asc
        mode: "0644"

    - name: Add the Docker apt repository
      ansible.builtin.apt_repository:
        repo: >-
          deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc]
          https://download.docker.com/linux/ubuntu
          {{ ansible_distribution_release }} stable
        filename: docker
        state: present

    - name: Install Docker Engine and the Compose plugin
      ansible.builtin.apt:
        name:
          - docker-ce
          - docker-ce-cli
          - containerd.io
          - docker-buildx-plugin
          - docker-compose-plugin
        state: present
        update_cache: true

    - name: Ensure Docker is running and enabled at boot
      ansible.builtin.systemd:
        name: docker
        state: started
        enabled: true

    - name: Install the Docker SDK for Python (needed by community.docker)
      ansible.builtin.pip:
        name: docker
        state: present
        break_system_packages: true

    # The 'docker' group only exists once Docker is installed, which is why
    # this task comes after it rather than at the top.
    - name: Create the deploy user
      ansible.builtin.user:
        name: "{{ deploy_user }}"
        shell: /bin/bash
        groups: docker
        append: true
        create_home: true

    - name: Allow SSH and HTTP/HTTPS through the firewall
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop: ["22", "80", "443"]

    - name: Enable the firewall with a default-deny policy
      community.general.ufw:
        state: enabled
        policy: deny
```

`{{ ansible_distribution_release }}` is a **fact** — Ansible gathered it from
the host, so this works on `jammy` and `noble` without you editing anything.

> **Ordering matters.** Notice the comment above the user task: the `docker`
> group does not exist until Docker is installed. Reading a playbook top to
> bottom and asking "does this exist yet?" catches the most common
> first-playbook bug.
>
> Note also that membership in the `docker` group is effectively root on the
> host. That is the standard trade-off for a single-purpose deploy box; if it
> is not acceptable to you, look at rootless Docker instead.

### Part B: the deploy

`~/civitech-deploy/deploy.yml`:

```yaml
---
- name: Deploy CiviTech Global
  hosts: civitech_prod
  become: true
  become_user: "{{ deploy_user }}"

  tasks:
    - name: Ensure the application directory exists
      ansible.builtin.file:
        path: "{{ app_dir }}"
        state: directory
        owner: "{{ deploy_user }}"
        group: "{{ deploy_user }}"
        mode: "0750"
      become_user: root

    - name: Check out the requested branch
      ansible.builtin.git:
        repo: "{{ app_repo }}"
        dest: "{{ app_dir }}"
        version: "{{ app_branch }}"
        accept_hostkey: true
      register: checkout
      tags: [code]

    - name: Render the compose-level .env
      ansible.builtin.template:
        src: templates/compose.env.j2
        dest: "{{ app_dir }}/.env"
        mode: "0600"
      tags: [config]

    - name: Render the server .env
      ansible.builtin.template:
        src: templates/server.env.j2
        dest: "{{ app_dir }}/civitechglobal-server/.env"
        mode: "0600"
      tags: [config]

    - name: Render the web .env
      ansible.builtin.template:
        src: templates/web.env.j2
        dest: "{{ app_dir }}/civitechglobal-web/.env"
        mode: "0600"
      tags: [config]

    - name: Build images and start the stack
      community.docker.docker_compose_v2:
        project_src: "{{ app_dir }}"
        build: always
        state: present
        remove_orphans: true
      register: compose_result
      tags: [deploy]

    - name: Apply database migrations
      ansible.builtin.command:
        cmd: docker compose exec -T api npx prisma migrate deploy
        chdir: "{{ app_dir }}"
      register: migrate
      changed_when: "'No pending migrations' not in migrate.stdout"
      tags: [migrate]

    - name: Wait for the API to answer
      ansible.builtin.uri:
        url: "http://127.0.0.1:{{ api_port }}/health"
        status_code: 200
      retries: 12
      delay: 5
      register: health
      until: health.status == 200
      tags: [deploy]

    - name: Remove dangling images
      community.docker.docker_prune:
        images: true
      tags: [cleanup]
```

Points worth understanding:

- **`prisma migrate deploy`, not `migrate dev`.** The repo's
  `npm run prisma:migrate` maps to `prisma migrate dev`, which is interactive
  and can reset data. `migrate deploy` only applies pending migrations and is
  the production-safe command.
- **No seeding task.** `prisma:seed` creates a `SUPER_ADMIN` and is a
  deliberate one-time human action, not part of every deploy. Run it manually
  once, then change the password as the root README describes.
- The health check assumes the API exposes `/health`. **Verify the actual route
  in `civitechglobal-server/src/` and adjust the path** — if there is no health
  endpoint, either add one to the API or replace this task with a
  `docker compose ps` check.
- `docker-compose.yml` binds postgres and redis to `127.0.0.1` only, which is
  correct. The `api` (5000), `bot` (4000), and `web` (5173) services publish on
  all interfaces, so put nginx or Caddy in front terminating TLS on 443 rather
  than opening those ports in ufw.
- `docker-compose.override.yml` is local-machine-only and gitignored, so it
  will not follow you to the server. Good — that is exactly what it is for.
- The compose file's `backup` service already handles nightly `pg_dump`s to a
  volume. If you move to managed Postgres later, drop that service and use the
  provider's backups, as the comment in `docker-compose.yml` says.

The remaining two templates:

`templates/compose.env.j2`:

```jinja
POSTGRES_USER={{ postgres_user }}
POSTGRES_PASSWORD={{ postgres_password }}
POSTGRES_DB={{ postgres_db }}
BACKUP_RETENTION_DAYS={{ backup_retention_days | default(14) }}
```

`templates/web.env.j2`:

```jinja
VITE_API_URL=/api
VITE_TELEGRAM_BOT_URL={{ telegram_bot_url }}
```

> **Vite caveat:** `VITE_*` values are baked in at **build** time, not read at
> run time. Because the compose task uses `build: always`, changing
> `telegram_bot_url` does take effect on the next deploy — but if you ever
> switch to prebuilt images, editing the web `.env` alone will change nothing.

Run them:

```bash
ansible-playbook provision.yml --vault-password-file ~/.civitech-vault-pass
ansible-playbook deploy.yml    --vault-password-file ~/.civitech-vault-pass
```

---

## 12. Handlers, tags, and safe dry runs

### Dry runs

Before any real deploy:

```bash
ansible-playbook deploy.yml --check --diff
```

- `--check` = "tell me what you *would* change, change nothing."
- `--diff` = show line-by-line diffs of files that would change.

Check mode is not perfect — tasks whose result depends on an earlier task's
side effect may report oddly, since the earlier change never happened. Treat it
as a strong hint, not a guarantee.

### Tags

Tags let you run part of a playbook. Given the tags above:

```bash
ansible-playbook deploy.yml --tags config    # only re-render .env files
ansible-playbook deploy.yml --tags migrate   # only run migrations
ansible-playbook deploy.yml --skip-tags cleanup
```

### Handlers

A handler runs at the end of the play, and only if a task **notified** it by
reporting `changed`:

```yaml
  tasks:
    - name: Render nginx site config
      ansible.builtin.template:
        src: templates/nginx-civitech.conf.j2
        dest: /etc/nginx/sites-available/civitech
        mode: "0644"
      notify: Reload nginx

  handlers:
    - name: Reload nginx
      ansible.builtin.systemd:
        name: nginx
        state: reloaded
```

Edit the template → config changes → nginx reloads. Change nothing → nginx is
left alone. If several tasks notify the same handler, it still runs once.

### Limiting and verbosity

```bash
ansible-playbook deploy.yml --limit civitech-prod   # one host only
ansible-playbook deploy.yml --start-at-task "Apply database migrations"
ansible-playbook deploy.yml -v                      # -vvv for connection debug
```

---

## 13. Roles — organizing once it grows

Once a playbook passes ~100 lines, split it into roles. A role is a directory
with a fixed layout that Ansible loads by convention:

```
roles/
└── docker/
    ├── tasks/main.yml      # loaded automatically
    ├── handlers/main.yml
    ├── templates/
    ├── files/
    ├── defaults/main.yml   # lowest-priority variable defaults
    └── vars/main.yml       # higher-priority variables
```

Scaffold one:

```bash
ansible-galaxy init roles/docker
```

Then your playbook becomes a table of contents:

```yaml
---
- name: Provision the CiviTech host
  hosts: civitech_prod
  become: true
  roles:
    - common
    - docker
    - firewall

- name: Deploy the application
  hosts: civitech_prod
  become: true
  roles:
    - civitech_app
```

Do not start here. Write the flat playbook, get it working, refactor into roles
when the size actually hurts.

---

## 14. Troubleshooting

**`UNREACHABLE` / "Failed to connect to the host via ssh"**
Not an Ansible problem. Test plain `ssh user@host` first. Check
`ansible_user`, `ansible_host`, and the key path in your inventory. Run with
`-vvv` to see the exact SSH command Ansible built.

**`Missing sudo password`**
The remote user needs passwordless sudo, or you pass `--ask-become-pass` (`-K`).

**`The module failed to execute correctly, you probably need to set the interpreter`**
Python 3 is missing on the server. `apt install python3` over plain SSH once.

**`couldn't resolve module/action 'community.docker.docker_compose_v2'`**
The collection is not installed on the **control node**:
`ansible-galaxy collection install community.docker`.

**`Attempting to decrypt but no vault secrets found`**
You forgot `--ask-vault-pass` or `--vault-password-file`.

**A task reports `changed` on every single run**
It is a `command`/`shell` task with no `creates:` or `changed_when:`. Either
add one, or switch to a real module.

**YAML errors that make no sense**
Almost always indentation, a tab character, or an unquoted value starting with
`{{`. Validate before running: `ansible-playbook deploy.yml --syntax-check`.

**Linting**
`pipx install ansible-lint`, then `ansible-lint deploy.yml`. It catches missing
`name:` fields, deprecated syntax, and non-idempotent patterns.

---

## 15. Cheat sheet

```bash
# Connectivity
ansible all -m ping
ansible all -m setup -a 'filter=ansible_distribution*'

# Ad-hoc
ansible civitech_prod -m apt -a 'name=htop state=present' -b
ansible civitech_prod -m shell -a 'docker compose ps' -b

# Playbooks
ansible-playbook deploy.yml --syntax-check
ansible-playbook deploy.yml --check --diff
ansible-playbook deploy.yml --tags config
ansible-playbook deploy.yml --limit civitech-prod -vvv
ansible-playbook deploy.yml --vault-password-file ~/.civitech-vault-pass

# Inventory
ansible-inventory --list          # what Ansible thinks your inventory is
ansible-inventory --graph

# Vault
ansible-vault create|edit|view|rekey group_vars/civitech_prod_vault.yml
ansible-vault encrypt_string 'secret-value' --name 'jwt_secret'

# Collections
ansible-galaxy collection install community.docker community.general
ansible-galaxy collection list
```

**Where to look things up:** the module index at
<https://docs.ansible.com/ansible/latest/collections/index_module.html> is the
page you will use most — every module's page has copy-pasteable examples at the
bottom. Or from the terminal: `ansible-doc ansible.builtin.template`.

---

## Next

Your deploy now runs from the terminal with one command. Next:
[**Semaphore UI**](./ansible-semaphore-ui.md) — the same playbook behind a web
UI, with scheduled runs, stored secrets, and a record of who deployed what.
