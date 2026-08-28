# Semaphore UI from zero — a web UI for your Ansible deploys

**Read [`ansible-getting-started.md`](./ansible-getting-started.md) first.**
Semaphore UI does not replace Ansible or do anything Ansible cannot. It is a
web front-end that runs `ansible-playbook` for you and stores the surrounding
pieces — inventory, secrets, schedules, logs, users — in a database. If your
playbook does not work from the terminal, it will not work in Semaphore either,
and you will have twice as many places to debug.

This guide assumes you have never seen Semaphore before. Every command is
followed by **what you should actually see**, and every UI form is filled in
with real values rather than described abstractly.

### The running example

Continuing from the Ansible guide:

| Thing | Value used in this guide |
|---|---|
| App server | `203.0.113.42` |
| Semaphore host | `203.0.113.77` |
| Semaphore URL | `https://semaphore.civitechglobal.com` |
| Playbook repo | `git@github.com:your-org/civitech-deploy.git` |
| App repo | `git@github.com:your-org/our-website.git` |

---

## Table of contents

1. [What Semaphore is and why you would want it](#1-what-semaphore-is-and-why-you-would-want-it)
2. [The five concepts](#2-the-five-concepts)
3. [Installing Semaphore with Docker Compose](#3-installing-semaphore-with-docker-compose)
4. [First login](#4-first-login)
5. [Step-by-step: wiring up the CiviTech deploy](#5-step-by-step-wiring-up-the-civitech-deploy)
6. [Running your first task](#6-running-your-first-task)
7. [Survey variables — deploy a branch on demand](#7-survey-variables--deploy-a-branch-on-demand)
8. [Schedules, and chaining templates](#8-schedules-and-chaining-templates)
9. [Users, teams, and the audit trail](#9-users-teams-and-the-audit-trail)
10. [Putting it behind HTTPS](#10-putting-it-behind-https)
11. [Backups and upgrades](#11-backups-and-upgrades)
12. [Troubleshooting](#12-troubleshooting)
13. [Is it worth it?](#13-is-it-worth-it)

---

## 1. What Semaphore is and why you would want it

Semaphore UI (formerly "Ansible Semaphore") is an open-source web application.
You point it at a git repository containing playbooks; it gives you a button
that runs one, streams the output to your browser, and keeps the log.

Concretely, it solves these problems:

| Problem with terminal-only Ansible | What Semaphore does |
|---|---|
| Only works from a machine with your SSH key, your vault passphrase, and the right collections installed | Runs on a server; anyone authorized can deploy from a browser |
| No record of who deployed what, when | Every run is stored with user, time, playbook, and full log |
| Secrets live in files on laptops | Secrets live in Semaphore's encrypted Key Store |
| Cron for scheduled runs means yet another place to look | Built-in scheduler with the same logs and history |
| Handing deploy access to a teammate means handing over prod SSH keys | Give them a Semaphore login scoped to one project |

It also supports Terraform, OpenTofu, Pulumi, and plain bash, but Ansible is
its first-class use case.

**What it is not:** a CI system. It does not watch for pushes and run tests.
This repo already has GitHub Actions in `.github/workflows/` for that. Think of
Semaphore as the *deployment* half — the thing you run after CI is green.

---

## 2. The five concepts

Learn these before you click anything. The UI is confusing until they click,
and trivial afterwards.

1. **Project** — the top-level container. Everything else lives inside one.
   Make one project called `CiviTech Global`.

2. **Key Store** — where credentials live, encrypted. Three kinds you will use:
   - *SSH Key* — the private key Semaphore uses to reach your servers.
   - *Login with password* — username/password pairs.
   - *None* — a placeholder for when a field requires a key but you have none.

3. **Repository** — a git URL plus a branch. Semaphore clones it into a working
   directory before every run. **This is your `civitech-deploy` repo, not the
   application repo** — Semaphore needs the playbooks, and the playbooks clone
   the app themselves.

4. **Inventory** — the same inventory content from the Ansible guide, either
   pasted into Semaphore ("static") or read from a path in the repository
   ("file"). Prefer *file* so your inventory stays version-controlled.

5. **Task Template** — the button. It binds together: which playbook file,
   which inventory, which repository, which environment, and any extra CLI
   arguments. Running a template creates a **Task** (one execution, with a log).

Plus one supporting concept:

6. **Environment** — a set of variables passed to the run. Two kinds in the
   same form: *extra variables* (become Ansible `--extra-vars`) and
   *environment variables* (become shell env vars for the process). Values can
   be marked secret.

The relationships, with the actual objects you are about to create:

```
Project "CiviTech Global"
├── Key Store
│   ├── civitech-prod-ssh    (SSH Key,  user: root)
│   ├── git-readonly         (SSH Key,  user: git)
│   └── ansible-vault-pass   (Login with password)
├── Repository
│   └── civitech-deploy      git@github.com:your-org/civitech-deploy.git @ main
├── Inventory
│   └── production           file: inventory.ini   → uses civitech-prod-ssh
├── Environment
│   └── prod
└── Task Templates
    ├── "Provision host"       provision.yml
    ├── "Deploy"               deploy.yml
    ├── "Deploy — config only" deploy.yml  CLI: ["--tags","config"]
    └── "Dry run (check)"      deploy.yml  CLI: ["--check","--diff"]
```

---

## 3. Installing Semaphore with Docker Compose

Run Semaphore on a small separate VM, or on the same host as the app if you are
cost-constrained. It needs Docker and Docker Compose — the `provision.yml`
playbook from the previous guide already installs both.

Create a directory and a compose file:

```bash
mkdir -p ~/semaphore && cd ~/semaphore
```

`~/semaphore/docker-compose.yml`:

```yaml
services:
  semaphore-db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: semaphore
      POSTGRES_PASSWORD: ${SEMAPHORE_DB_PASSWORD}
      POSTGRES_DB: semaphore
    volumes:
      - semaphore_db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U semaphore"]
      interval: 5s
      timeout: 5s
      retries: 10

  semaphore:
    image: semaphoreui/semaphore:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      SEMAPHORE_DB_DIALECT: postgres
      SEMAPHORE_DB_HOST: semaphore-db
      SEMAPHORE_DB_PORT: 5432
      SEMAPHORE_DB_USER: semaphore
      SEMAPHORE_DB_PASS: ${SEMAPHORE_DB_PASSWORD}
      SEMAPHORE_DB: semaphore
      SEMAPHORE_ADMIN: admin
      SEMAPHORE_ADMIN_PASSWORD: ${SEMAPHORE_ADMIN_PASSWORD}
      SEMAPHORE_ADMIN_NAME: Admin
      SEMAPHORE_ADMIN_EMAIL: admin@civitechglobal.com
      SEMAPHORE_ACCESS_KEY_ENCRYPTION: ${SEMAPHORE_ACCESS_KEY_ENCRYPTION}
      TZ: Asia/Tehran
    volumes:
      - semaphore_data:/var/lib/semaphore
      - semaphore_config:/etc/semaphore
      - semaphore_tmp:/tmp/semaphore
    depends_on:
      semaphore-db:
        condition: service_healthy

volumes:
  semaphore_db:
  semaphore_data:
  semaphore_config:
  semaphore_tmp:
```

Two things to note:

- **Port bound to `127.0.0.1`.** Semaphore holds your production SSH keys —
  never expose it directly to the internet. Section 10 puts TLS in front.
- **`SEMAPHORE_ACCESS_KEY_ENCRYPTION`** is the key that encrypts everything in
  the Key Store. If you lose it, every stored credential is unrecoverable.
  Back it up somewhere safe *before* you store anything.

Generate the secrets into a `.env` next to the compose file:

```bash
cat > ~/semaphore/.env <<EOF
SEMAPHORE_DB_PASSWORD=$(openssl rand -hex 24)
SEMAPHORE_ADMIN_PASSWORD=$(openssl rand -hex 16)
SEMAPHORE_ACCESS_KEY_ENCRYPTION=$(head -c32 /dev/urandom | base64)
EOF
chmod 600 ~/semaphore/.env
cat ~/semaphore/.env
```

<details>
<summary>What you'll see</summary>

```
SEMAPHORE_DB_PASSWORD=9a3f7c1e5b8d2a6f4c0e9b3d7a1f5c8e2b6d0a4f9c3e7b1d
SEMAPHORE_ADMIN_PASSWORD=4b8e2a6f0c9d3e7b1a5f8c2d6e0b4a9f
SEMAPHORE_ACCESS_KEY_ENCRYPTION=Kx7pQm2VnR9sT4wY8zA1bC6dE3fG5hJ0kL2mN4pQ7rS=
```

**Copy the admin password somewhere now** — you need it in two minutes, and
`SEMAPHORE_ACCESS_KEY_ENCRYPTION` belongs in your password manager permanently.
</details>

`SEMAPHORE_ACCESS_KEY_ENCRYPTION` must be a base64-encoded 32-byte value —
`head -c32 /dev/urandom | base64` produces exactly that. Start it:

```bash
docker compose up -d
```

<details>
<summary>What you'll see</summary>

```
[+] Running 6/6
 ✔ Network semaphore_default        Created
 ✔ Volume "semaphore_semaphore_db"  Created
 ✔ Volume "semaphore_data"          Created
 ✔ Volume "semaphore_config"        Created
 ✔ Volume "semaphore_tmp"           Created
 ✔ Container semaphore-semaphore-db-1  Healthy
 ✔ Container semaphore-semaphore-1     Started
```
</details>

```bash
docker compose logs semaphore | tail -20
```

<details>
<summary>What you'll see</summary>

```
semaphore-1  | Executing migrations
semaphore-1  | Creating migrations table
semaphore-1  | Applying migration 2.8.0
semaphore-1  | Applying migration 2.10.12
semaphore-1  | Applying migration 2.13.0
semaphore-1  | Migrations Finished
semaphore-1  | Semaphore v2.16.19
semaphore-1  | Interface
semaphore-1  | Port :3000
semaphore-1  | Server is running
```

`Server is running` is the line you are waiting for. If instead you see
`dial tcp: connect: connection refused`, the database was not ready — Compose's
healthcheck usually prevents this, but `docker compose restart semaphore`
fixes it.
</details>

Confirm it answers locally:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/ping
```

<details>
<summary>What you'll see</summary>

```
200
```
</details>

---

## 4. First login

Since the port is bound to localhost, tunnel to it from your machine:

```bash
ssh -L 3000:127.0.0.1:3000 root@203.0.113.77
```

Leave that terminal running (it looks like a normal SSH session — that is
correct, the tunnel lives as long as the session does) and open
<http://localhost:3000> in a browser.

<details>
<summary>What the login screen wants</summary>

```
Username or email:  admin
Password:           4b8e2a6f0c9d3e7b1a5f8c2d6e0b4a9f
```

That is `SEMAPHORE_ADMIN` and `SEMAPHORE_ADMIN_PASSWORD` from your `.env`.
After login you land on an empty dashboard with a "New Project" prompt.
</details>

First thing: **User Settings → Edit → change the password** to something you
chose. `SEMAPHORE_ADMIN_PASSWORD` is only read at first boot, so it can be
removed from the compose file afterwards.

---

## 5. Step-by-step: wiring up the CiviTech deploy

### Step 1 — Push your Ansible files to a git repo

Semaphore only runs playbooks from git. Take the `~/civitech-deploy` directory
from the previous guide and push it:

```bash
cd ~/civitech-deploy
cat > .gitignore <<'EOF'
*.retry
.civitech-vault-pass
EOF
git init && git add -A && git status --short
```

<details>
<summary>What you'll see</summary>

```
Initialized empty Git repository in /home/mohammad/civitech-deploy/.git/

A  .gitignore
A  ansible.cfg
A  deploy.yml
A  group_vars/civitech_prod.yml
A  group_vars/civitech_prod_vault.yml
A  inventory.ini
A  provision.yml
A  requirements.yml
A  templates/compose.env.j2
A  templates/server.env.j2
A  templates/web.env.j2
```

`civitech_prod_vault.yml` is in there, and that is fine — it is ciphertext.
Double-check with `head -1 group_vars/civitech_prod_vault.yml`; you should see
`$ANSIBLE_VAULT;1.1;AES256`, never a readable password.
</details>

```bash
git commit -m "Ansible deploy playbooks for CiviTech Global"
git remote add origin git@github.com:your-org/civitech-deploy.git
git push -u origin main
```

<details>
<summary>What you'll see</summary>

```
[main (root-commit) a3f9c21] Ansible deploy playbooks for CiviTech Global
 11 files changed, 284 insertions(+)

Enumerating objects: 17, done.
Counting objects: 100% (17/17), done.
Writing objects: 100% (17/17), 4.921 KiB | 1.64 MiB/s, done.
To github.com:your-org/civitech-deploy.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```
</details>

The vault *passphrase* is not in the repo — Semaphore supplies it.

### Step 2 — Create the project

Click the project dropdown (top-left) → **New Project**.

<details>
<summary>The form, filled in</summary>

```
Project name:  CiviTech Global
Alert:         ☐  (leave off for now)
Telegram chat ID:  (blank)
Max parallel tasks:  0        ← 0 means unlimited
```

Click **Create**. The left sidebar now shows: Dashboard, Task Templates,
Inventory, Environment, Repositories, Key Store, Team, Activity.
</details>

### Step 3 — Add keys to the Key Store

Go to **Key Store** → **New Key**. You need three entries.

**a) The deploy SSH key** — how Semaphore reaches your app server.

Generate a **dedicated** key rather than pasting your personal one:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/semaphore_deploy -C "semaphore" -N ""
ssh-copy-id -i ~/.ssh/semaphore_deploy.pub root@203.0.113.42
cat ~/.ssh/semaphore_deploy
```

<details>
<summary>What you'll see</summary>

```
Generating public/private ed25519 key pair.
Your identification has been saved in /home/mohammad/.ssh/semaphore_deploy
The key fingerprint is:
SHA256:2mQ8vB4nX7wL9cT1pK5rZ3jH6dF0sA8gE4uN2iY7oPw semaphore

Number of key(s) added: 1

-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACC9K1eF3xR7mYpZbH3jF7dR4sK6aE0gU2nV8iOwQm2VnQAAAJhK7pQmSu6U
...
-----END OPENSSH PRIVATE KEY-----
```

If Semaphore is ever compromised, you revoke this one key rather than rotating
your entire identity.
</details>

<details>
<summary>The Key Store form, filled in</summary>

```
Key Name:      civitech-prod-ssh
Type:          SSH Key
Username:      root
Private Key:   -----BEGIN OPENSSH PRIVATE KEY-----
               b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAA...
               ...
               -----END OPENSSH PRIVATE KEY-----
Passphrase:    (blank — the key has none)
```

Paste the **entire** key including both `-----BEGIN-----` and `-----END-----`
lines and the trailing newline. A missing final newline is a surprisingly
common cause of "invalid format" errors.
</details>

**b) The git read key** — how Semaphore clones the playbook repo.

<details>
<summary>The form, filled in</summary>

```
Key Name:      git-readonly
Type:          SSH Key
Username:      git
Private Key:   (a GitHub deploy key with read access to civitech-deploy)
```

Create it on GitHub under **Settings → Deploy keys → Add deploy key** for the
`civitech-deploy` repo, read-only. If your playbook repo is public, use an
`https://` URL in step 5 and a key of type **None** instead.
</details>

**c) The vault passphrase.**

<details>
<summary>The form, filled in</summary>

```
Key Name:      ansible-vault-pass
Type:          Login with password
Login:         vault              ← unused, but the field is required
Password:      your-ansible-vault-passphrase
```
</details>

<details>
<summary>What the Key Store list looks like when done</summary>

```
NAME                  TYPE
ansible-vault-pass    Login with password
civitech-prod-ssh     SSH Key
git-readonly          SSH Key
```

Note there is no way to view a key's contents again after saving — only
overwrite it. That is deliberate.
</details>

### Step 4 — Note the app repo's deploy key

Separate from the above: `deploy.yml` runs `git clone` **on the app server**
against `our-website`. That server needs its own read access:

```bash
ansible civitech_prod -m shell -a 'ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N "" && cat ~/.ssh/id_ed25519.pub' -b
```

<details>
<summary>What you'll see</summary>

```
civitech-prod | CHANGED | rc=0 >>
Generating public/private ed25519 key pair.
Your identification has been saved in /root/.ssh/id_ed25519
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIH8kP2mQ7vR4nX9wL1cT5pK3rZ6jH0dF4sA2gE8uN7iY root@civitech-prod
```

Add that public key to `our-website` on GitHub as a read-only deploy key.
Semaphore is not involved in this clone at all.
</details>

### Step 5 — Add the repository

**Repositories** → **New Repository**.

<details>
<summary>The form, filled in</summary>

```
Name:         civitech-deploy
URL or path:  git@github.com:your-org/civitech-deploy.git
Branch:       main
Access Key:   git-readonly
```
</details>

### Step 6 — Add the inventory

**Inventory** → **New Inventory**.

<details>
<summary>The form, filled in</summary>

```
Name:                     production
User Credentials:         civitech-prod-ssh
Sudo Credentials:         (none)
Type:                     File
Repository:               civitech-deploy
Path to Inventory File:   inventory.ini
```
</details>

Using type *File* means the inventory is read from your repo at run time, so it
stays in version control with everything else. Type *Static* pastes the content
into Semaphore's database instead — quicker to start, but now it lives in two
places and drifts.

**One required change to `inventory.ini`.** Semaphore supplies the SSH key from
**User Credentials**, so the path baked into the file (which does not exist
inside Semaphore's container) must go:

```bash
cd ~/civitech-deploy
sed -i '/ansible_ssh_private_key_file/d' inventory.ini
git commit -am "Let Semaphore supply the SSH key" && git push
```

<details>
<summary>What `inventory.ini` should look like afterwards</summary>

```ini
[civitech_prod]
civitech-prod ansible_host=203.0.113.42

[civitech_prod:vars]
ansible_user=root
ansible_python_interpreter=/usr/bin/python3
```

Leave it in place if you still want terminal runs to work — but then pass
`--private-key ~/.ssh/civitech_deploy` on the command line instead.
</details>

### Step 7 — Add an environment

**Environment** → **New Environment**.

<details>
<summary>The form, filled in</summary>

```
Environment Name:  prod

Extra Variables (JSON):
{}

Environment Variables (JSON):
{
  "ANSIBLE_HOST_KEY_CHECKING": "False",
  "ANSIBLE_FORCE_COLOR": "True"
}
```

*Extra variables* become `--extra-vars` and override `group_vars`; leave them
empty since your vars already live in the repo. *Environment variables* become
shell env vars for the `ansible-playbook` process. `ANSIBLE_FORCE_COLOR` makes
the streamed log readable in the browser.
</details>

> Setting `ANSIBLE_HOST_KEY_CHECKING=False` gets you running quickly, but it
> disables host key verification for every run. The better fix is to add a task
> that populates `~/.ssh/known_hosts` in the Semaphore container, or to mount a
> pre-seeded `known_hosts`. Treat the `False` as a temporary crutch and remove
> it once things work.

### Step 8 — Commit a requirements.yml

Semaphore's container does not have `community.docker` installed. Add this at
the **root** of your playbook repo so it installs collections before each run:

`~/civitech-deploy/requirements.yml`:

```yaml
---
collections:
  - name: community.docker
  - name: community.general
```

```bash
git add requirements.yml && git commit -m "Declare collection requirements" && git push
```

### Step 9 — Create the task templates

**Task Templates** → **New Template**. Make four.

<details>
<summary>Template 1 — "Provision host"</summary>

```
Name:               Provision host
Description:        Installs Docker, creates the deploy user, configures ufw
Playbook Filename:  provision.yml
Inventory:          production
Repository:         civitech-deploy
Environment:        prod
Vault Password:     ansible-vault-pass
CLI Args:           []
Type:               Task
```
</details>

<details>
<summary>Template 2 — "Deploy"</summary>

```
Name:               Deploy
Description:        Pulls the app, renders .env files, rebuilds and migrates
Playbook Filename:  deploy.yml
Inventory:          production
Repository:         civitech-deploy
Environment:        prod
Vault Password:     ansible-vault-pass
CLI Args:           []
Type:               Task
```
</details>

<details>
<summary>Template 3 — "Deploy — config only"</summary>

```
Name:               Deploy — config only
Playbook Filename:  deploy.yml
Inventory:          production
Repository:         civitech-deploy
Environment:        prod
Vault Password:     ansible-vault-pass
CLI Args:           ["--tags", "config"]
```
</details>

<details>
<summary>Template 4 — "Dry run (check)"</summary>

```
Name:               Dry run (check)
Description:        Reports drift without changing anything
Playbook Filename:  deploy.yml
Inventory:          production
Repository:         civitech-deploy
Environment:        prod
Vault Password:     ansible-vault-pass
CLI Args:           ["--check", "--diff"]
```
</details>

**CLI Args is a JSON array, and each flag and each value is its own string.**
This is the single most common place people get the syntax wrong:

| | |
|---|---|
| ✅ Correct | `["--tags", "config"]` |
| ❌ Wrong | `["--tags config"]` |
| ❌ Wrong | `--tags config` |

<details>
<summary>What the wrong form produces</summary>

```
ERROR! the playbook: config could not be found
```

Ansible received `--tags config` as one argument, could not parse it as a flag,
and treated the remainder as a filename.
</details>

---

## 6. Running your first task

Open the **Provision host** template and click **Run**. A dialog appears; leave
the defaults and confirm.

<details>
<summary>What the task view shows</summary>

```
Task #1  ·  Provision host  ·  by admin  ·  a few seconds ago     [ RUNNING ]

Started: 2026-08-28 14:22:07

14:22:07  Started: 1
14:22:07  Run TaskRunner with template: Provision host
14:22:07  Preparing: 1
14:22:08  Cloning git@github.com:your-org/civitech-deploy.git into /tmp/semaphore/repository_1_1
14:22:09  Cloning into '/tmp/semaphore/repository_1_1'...
14:22:11  Installing collection requirements
14:22:14  community.docker:4.5.2 was installed successfully
14:22:14  community.general:10.3.0 was installed successfully
14:22:15  PLAY [Provision the CiviTech host] *****************************
14:22:15
14:22:17  TASK [Gathering Facts] ****************************************
14:22:19  ok: [civitech-prod]
14:22:19
14:22:19  TASK [Install base packages] **********************************
14:22:41  changed: [civitech-prod]
...
14:25:03  PLAY RECAP ****************************************************
14:25:03  civitech-prod  : ok=11  changed=8  unreachable=0  failed=0
14:25:04  Task 1 finished
```

Status flips to green **SUCCESS**. The first four lines — clone, then install
collections — are Semaphore's own work; everything from `PLAY [` onward is the
exact `ansible-playbook` output you saw in the terminal.
</details>

Once provisioning succeeds, run **Deploy**.

<details>
<summary>What a failed task looks like</summary>

```
Task #2  ·  Deploy  ·  by admin                                    [ ERROR ]

14:31:02  TASK [Check out the requested branch] *************************
14:31:04  fatal: [civitech-prod]: FAILED! => changed=false
14:31:04    msg: |-
14:31:04      Failed to download remote objects and refs: Permission denied (publickey).
14:31:04      fatal: Could not read from remote repository.
14:31:04
14:31:04  PLAY RECAP ****************************************************
14:31:04  civitech-prod  : ok=2  changed=0  unreachable=0  failed=1
14:31:05  Task 2 failed
```

Note *which* clone failed: this is the app server cloning `our-website`, not
Semaphore cloning the playbooks. That is the step 4 deploy key.
</details>

**Do this before trusting it:** run **Dry run (check)** first and read the diff.
Semaphore makes it very easy to click a button that changes production; the
check-mode habit matters more here than in the terminal.

---

## 7. Survey variables — deploy a branch on demand

Right now `app_branch` is fixed in `group_vars`. Survey variables turn it into a
form field at run time.

Edit the **Deploy** template → **Survey Variables** → **Add**:

<details>
<summary>The form, filled in</summary>

```
Name:         app_branch
Title:        Branch to deploy
Description:  Git branch or tag to check out on the server
Type:         String
Required:     ☑
```
</details>

<details>
<summary>What clicking Run looks like now</summary>

```
Run "Deploy"

  Branch to deploy *
  ┌──────────────────────────────────┐
  │ v1-week3                         │
  └──────────────────────────────────┘
  Git branch or tag to check out on the server

  ☐ Debug     ☐ Dry Run     ☐ Diff

              [ Cancel ]  [ Run ]
```

The three checkboxes are built in: **Debug** adds `-vvvv`, **Dry Run** adds
`--check`, **Diff** adds `--diff` — so you can get a check run from any
template without a dedicated one.
</details>

<details>
<summary>What appears in the log</summary>

```
14:48:12  ansible-playbook deploy.yml -i inventory.ini
          --extra-vars '{"app_branch":"v1-week3"}' --vault-password-file /tmp/...
...
14:48:31  TASK [Show which commit is deployed] **************************
14:48:31  ok: [civitech-prod] =>
14:48:31    msg: Deploying v1-week3 @ 20ec3441
```

Extra-vars beat `group_vars`, so the playbook picks it up with no changes. That
`Show which commit is deployed` debug task from the Ansible guide earns its
keep here — the log now records exactly what shipped.
</details>

This is genuinely useful for this repo: deploying `v1-week3` to a staging host
becomes a text field rather than a config edit.

> One caution: a free-text survey variable is a string interpolated into your
> playbook. Only give run access to people you would give shell access to — see
> the next section.

---

## 8. Schedules, and chaining templates

### Schedules

Open a template → **Schedules** → **New Schedule**.

<details>
<summary>The form, filled in</summary>

```
Cron expression:  0 3 * * *
Repository:       civitech-deploy

Next run: 2026-08-29 03:00:00 (Asia/Tehran)
```

Semaphore previews the next fire time as you type, which catches cron typos
immediately.
</details>

Cron syntax reference:

```
0 3 * * *      every day at 03:00
0 */6 * * *    every six hours
30 2 * * 1     Mondays at 02:30
*/15 * * * *   every fifteen minutes
```

Sensible things to schedule for this project:

- A nightly **Dry run (check)**, which tells you if anyone has hand-edited
  configuration on the server. Drift detection, free.

  <details>
  <summary>What a drift-detecting nightly run reports</summary>

  ```
  03:00:14  TASK [Render the server .env] ******************************
  03:00:14  --- before: /opt/civitech/civitechglobal-server/.env
  03:00:14  +++ after: /tmp/semaphore/.../server.env.j2
  03:00:14  @@ -14,7 +14,7 @@
  03:00:14   CORS_ORIGIN="https://civitechglobal.com"
  03:00:14  -COOKIE_SECURE="false"
  03:00:14  +COOKIE_SECURE="true"
  03:00:14  changed: [civitech-prod]
  03:00:19  civitech-prod  : ok=11  changed=1  unreachable=0  failed=0
  ```

  Someone flipped `COOKIE_SECURE` on the box by hand. Nothing was modified —
  `--check` only reports — but now you know, at 03:00, without looking.
  </details>

- A weekly `apt upgrade` playbook.

Do **not** schedule the real deploy. Deploys should be a decision someone makes.

### Build / Deploy template types

When creating a template you can pick a type: **Task** (default), **Build**, or
**Deploy**. A Deploy template can be linked to a Build template so that a
successful build automatically triggers the deploy, and the artifact version
carries across. For a single-server Compose setup this is more machinery than
you need — stay with plain Task templates until you have a real build/promote
pipeline.

### Alerts

In project settings you can enable Slack, Telegram, or email notifications on
task failure. Given this repo already runs a Telegram bot, the Telegram
integration is the low-friction choice.

<details>
<summary>Setting it up</summary>

Project Settings:

```
Alert:              ☑
Telegram chat ID:   -1001234567890
```

Plus, in the Semaphore container environment:

```yaml
      SEMAPHORE_TELEGRAM_ALERT: "True"
      SEMAPHORE_TELEGRAM_TOKEN: "8123456789:AAG_a_separate_bot_token"
      SEMAPHORE_TELEGRAM_CHAT: "-1001234567890"
```

Use a **separate** bot token from `TELEGRAM_BOT_TOKEN` in the app, and point it
at a private admin chat — not the lead-notification chat your users' data flows
through. The message you get looks like:

```
Task: Deploy
Status: error
Author: admin
Project: CiviTech Global
```
</details>

---

## 9. Users, teams, and the audit trail

**Team** (inside the project) is where you add people. Roles, from least to
most privileged:

| Role | Can do |
|---|---|
| **Guest** | Read-only: see templates and past task logs. |
| **Task Runner** | Run existing templates. Cannot edit them or see key contents. |
| **Manager** | Create and edit templates, inventories, repositories. |
| **Owner** | Everything, including team membership. |

<details>
<summary>Adding a teammate</summary>

First create the user globally (**Settings → Users → New User**, admin only):

```
Name:      Sara
Username:  sara
Email:     sara@civitechglobal.com
Password:  (temporary; they change it at first login)
Admin:     ☐
```

Then in the project: **Team → New Team Member**:

```
User:  sara
Role:  Task Runner
```

Sara can now log in, click **Deploy**, and watch the log — without ever seeing
the production SSH key or the vault passphrase.
</details>

The useful pattern: give everyone who deploys **Task Runner**, and keep
**Manager** for the one or two people who maintain the playbooks.

Be clear-eyed about the boundary, though: anyone who can run a template runs
code as root on your servers, and anyone with Manager can edit what that code
is. Semaphore's roles reduce credential *spread*; they do not sandbox what a
run can do.

<details>
<summary>What the audit trail looks like</summary>

**Activity** in the sidebar:

```
2026-08-28 14:48  admin  ran task "Deploy" (#3)
2026-08-28 14:31  admin  ran task "Deploy" (#2)
2026-08-28 14:22  admin  ran task "Provision host" (#1)
2026-08-28 14:19  admin  created template "Provision host"
2026-08-28 14:16  admin  created key "civitech-prod-ssh"
```

And the task history keeps the full log of every one of those runs
indefinitely. That history is the main governance win over people running
`ansible-playbook` from their laptops.
</details>

---

## 10. Putting it behind HTTPS

Semaphore on plain HTTP means your session cookie and every secret you type
cross the network in the clear. Put a reverse proxy in front. Caddy is the
shortest path — it obtains and renews certificates automatically.

On the Semaphore host:

```bash
sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:

```
semaphore.civitechglobal.com {
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

<details>
<summary>What you'll see</summary>

```
● caddy.service - Caddy
     Loaded: loaded (/usr/lib/systemd/system/caddy.service; enabled)
     Active: active (running) since Fri 2026-08-28 15:02:11 +0330; 12s ago

Aug 28 15:02:11 semaphore caddy[3312]: {"level":"info","msg":"serving initial configuration"}
Aug 28 15:02:14 semaphore caddy[3312]: {"level":"info","logger":"tls.obtain","msg":"certificate obtained successfully","identifier":"semaphore.civitechglobal.com"}
```

`certificate obtained successfully` means Let's Encrypt issued the cert. If you
instead see `no solvers succeeded`, DNS is not pointing at this host yet, or
port 80 is closed.
</details>

Point the DNS record at the host, allow 80 and 443 through `ufw`, and leave
Semaphore itself bound to `127.0.0.1` so it is only reachable via the proxy:

```bash
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw status
```

<details>
<summary>What you'll see</summary>

```
Rule added
Rule added
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

Port 3000 is deliberately absent — that is the point.
</details>

Then set `SEMAPHORE_WEB_ROOT` in the compose environment so links Semaphore
generates use the right host, and recreate the container:

```yaml
      SEMAPHORE_WEB_ROOT: https://semaphore.civitechglobal.com
```

```bash
cd ~/semaphore && docker compose up -d
```

<details>
<summary>What you'll see</summary>

```
[+] Running 2/2
 ✔ Container semaphore-semaphore-db-1  Running
 ✔ Container semaphore-semaphore-1     Started
```

Only the changed service is recreated; the database container is untouched.
</details>

For an internal-only tool, restricting access to a VPN or an IP allowlist on
top of this is worth the small effort.

---

## 11. Backups and upgrades

**What to back up:**

1. The Postgres database (projects, templates, task history).
2. `SEMAPHORE_ACCESS_KEY_ENCRYPTION` from your `.env` — without it the database
   backup is useless, because every stored key is encrypted with it.

```bash
cd ~/semaphore
docker compose exec -T semaphore-db pg_dump -U semaphore semaphore \
  > "semaphore-$(date +%F).sql"
ls -lh semaphore-*.sql
```

<details>
<summary>What you'll see</summary>

```
-rw-r--r-- 1 root root 148K Aug 28 15:14 semaphore-2026-08-28.sql
```

A fresh install is around 100–200 KB; it grows mostly with task log history.
</details>

Put that on a schedule, and store the `.env` in a password manager.

**Upgrading:**

```bash
cd ~/semaphore
docker compose exec -T semaphore-db pg_dump -U semaphore semaphore > "pre-upgrade-$(date +%F).sql"
docker compose pull
docker compose up -d
docker compose logs semaphore | tail -10
```

<details>
<summary>What you'll see</summary>

```
[+] Pulling 2/2
 ✔ semaphore-db Pulled
 ✔ semaphore Pulled

[+] Running 2/2
 ✔ Container semaphore-semaphore-db-1  Running
 ✔ Container semaphore-semaphore-1     Started

semaphore-1  | Executing migrations
semaphore-1  | Applying migration 2.17.0
semaphore-1  | Migrations Finished
semaphore-1  | Semaphore v2.17.3
semaphore-1  | Server is running
```

Semaphore runs its own schema migrations on start — always check these lines
after an upgrade.
</details>

Pinning `semaphoreui/semaphore:latest` is convenient but means an unplanned
upgrade whenever you `pull`. Pin an explicit version tag (`semaphoreui/semaphore:v2.16.19`)
once you depend on it.

---

## 12. Troubleshooting

Each entry shows the real log text so you can match it against the task view.

**Permission denied during the play**

```
fatal: [civitech-prod]: UNREACHABLE! => changed=false
  msg: 'Failed to connect to the host via ssh: root@203.0.113.42: Permission denied (publickey).'
```

The inventory's `ansible_ssh_private_key_file` is overriding Semaphore's key.
Remove that line (step 6). Also confirm the **Username** on the Key Store entry
matches the remote user.

**Host key verification**

```
fatal: [civitech-prod]: UNREACHABLE! => changed=false
  msg: 'Failed to connect to the host via ssh: Host key verification failed.'
```

Set `ANSIBLE_HOST_KEY_CHECKING: "False"` in the environment as a temporary
measure, then fix it properly by seeding `known_hosts`.

**Playbook not found**

```
ERROR! the playbook: deploy.yml could not be found
```

The path is relative to the repository root. If your playbooks are in a
subdirectory, the filename must be `ansible/deploy.yml`, not `deploy.yml`.

**Vault key not attached**

```
ERROR! Attempting to decrypt but no vault secrets found
```

No Vault Password key is attached to the template. Edit it and set
**Vault Password** → `ansible-vault-pass`.

**Collection missing**

```
ERROR! couldn't resolve module/action 'community.docker.docker_compose_v2'.
This often indicates a misspelling, missing collection, or incorrect module path.
```

`requirements.yml` is missing or not at the repository root (step 8). When it
is working you will see this near the top of the log:

```
14:22:11  Installing collection requirements
14:22:14  community.docker:4.5.2 was installed successfully
```

If your playbooks live in a subdirectory, either move `requirements.yml` to the
root or add a template that runs `ansible-galaxy install -r ...` first.

**Changes pushed to git are not picked up**
Semaphore caches the repository under `/tmp/semaphore/repository_<id>_<id>`.
Re-run the task — it pulls on each run — and confirm the **Branch** on the
Repository object matches the branch you pushed. To force a clean clone:

```bash
docker compose exec semaphore rm -rf /tmp/semaphore/repository_1_1
```

**The task hangs forever**

```
14:52:08  TASK [Apply database migrations] ******************************
          (nothing further, minutes pass, status stays RUNNING)
```

Something is prompting for input. Ansible cannot answer interactive prompts
here: no `--ask-become-pass`, no `vars_prompt`, no `prisma migrate dev`. Hit
**Stop** on the task and make the step non-interactive.

**Every key is suddenly invalid**

```
Failed to decrypt access key: cipher: message authentication failed
```

`SEMAPHORE_ACCESS_KEY_ENCRYPTION` changed. Restore the original value from your
password manager; the keys are not recoverable without it.

---

## 13. Is it worth it?

Honestly: for one developer deploying one server, Semaphore is overhead. The
terminal workflow from the first guide is enough, and you avoid running one
more internet-facing service that holds your production keys.

Semaphore earns its keep when at least one of these is true:

- More than one person needs to deploy, and you would rather not distribute
  production SSH keys.
- You want a record of who deployed what, without building one.
- You want scheduled runs with logs in the same place as manual runs.
- You want to hand deploy capability to someone who should not have shell.

For CiviTech Global specifically, the nightly drift-detection schedule from
section 8 — a `--check` run that Telegrams you when the server no longer
matches the playbook — is the feature most likely to pay for the setup on its
own.

---

## Further reading

- Semaphore UI docs — <https://docs.semaphoreui.com/>
- Ansible module index — <https://docs.ansible.com/ansible/latest/collections/index_module.html>
- Back to [**Ansible from zero**](./ansible-getting-started.md)
