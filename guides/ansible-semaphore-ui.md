# Semaphore UI from zero — a web UI for your Ansible deploys

**Read [`ansible-getting-started.md`](./ansible-getting-started.md) first.**
Semaphore UI does not replace Ansible or do anything Ansible cannot. It is a
web front-end that runs `ansible-playbook` for you and stores the surrounding
pieces — inventory, secrets, schedules, logs, users — in a database. If your
playbook does not work from the terminal, it will not work in Semaphore either,
and you will have twice as many places to debug.

This guide assumes you have never seen Semaphore before.

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

The relationships, in one picture:

```
Project "CiviTech Global"
├── Key Store       →  prod-ssh-key, vault-passphrase
├── Repository      →  git@github.com:your-org/civitech-deploy.git @ main
├── Inventory       →  inventory.ini  (uses prod-ssh-key)
├── Environment     →  prod-vars
└── Task Templates
    ├── "Provision host"   → provision.yml
    ├── "Deploy"           → deploy.yml
    └── "Deploy config only" → deploy.yml --tags config
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
cat ~/semaphore/.env    # copy the admin password somewhere before you forget
```

`SEMAPHORE_ACCESS_KEY_ENCRYPTION` must be a base64-encoded 32-byte value —
`head -c32 /dev/urandom | base64` produces exactly that. Start it:

```bash
docker compose up -d
docker compose logs -f semaphore
```

Wait for the log line saying it is listening on port 3000, then Ctrl-C out of
the log follow (that stops the log tail, not the container).

---

## 4. First login

Since the port is bound to localhost, tunnel to it from your machine:

```bash
ssh -L 3000:127.0.0.1:3000 root@your.semaphore.host
```

Leave that running and open <http://localhost:3000> in a browser. Log in with
`admin` and the `SEMAPHORE_ADMIN_PASSWORD` you generated.

First thing: **User Settings → change the password** to something you chose,
and remove it from the compose environment afterwards if you like (it is only
read at first boot).

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
git init && git add -A
git commit -m "Ansible deploy playbooks for CiviTech Global"
git remote add origin git@github.com:your-org/civitech-deploy.git
git push -u origin main
```

Your `group_vars/civitech_prod_vault.yml` is encrypted, so committing it is
fine. The vault *passphrase* is not in the repo — Semaphore will supply it.

### Step 2 — Create the project

Click the project dropdown (top-left) → **New Project**.

- **Name:** `CiviTech Global`
- **Alert:** leave off for now.

### Step 3 — Add keys to the Key Store

Go to **Key Store** → **New Key**. You need three entries.

**a) The deploy SSH key** — how Semaphore reaches your app server.

- **Name:** `civitech-prod-ssh`
- **Type:** `SSH Key`
- **Username:** `root` (or your deploy user)
- **Private Key:** paste the *entire* private key including the
  `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END ...-----` lines.

> Best practice: generate a **dedicated** key for Semaphore rather than pasting
> your personal one, and `ssh-copy-id` its public half to the server:
> ```bash
> ssh-keygen -t ed25519 -f ~/.ssh/semaphore_deploy -C "semaphore"
> ssh-copy-id -i ~/.ssh/semaphore_deploy.pub root@your.server.ip
> ```
> Then if Semaphore is ever compromised, you revoke one key rather than
> rotating your entire identity.

**b) The git read key** — how Semaphore clones the playbook repo.

- **Name:** `git-readonly`
- **Type:** `SSH Key`
- **Username:** `git`
- **Private Key:** a GitHub deploy key with read access to `civitech-deploy`.

If your playbook repo is public, use a `https://` URL in step 5 and a key of
type **None** instead.

**c) The vault passphrase.**

- **Name:** `ansible-vault-pass`
- **Type:** `Login with password`
- **Login:** `vault` (unused, but the field is required)
- **Password:** your Ansible Vault passphrase.

### Step 4 — Note the app repo's deploy key

Separate from the above: `deploy.yml` runs `git clone` **on the app server**
against `our-website`. That server needs its own read access. Either generate a
key on the server and add it as a GitHub deploy key, or add a task to
`provision.yml` that installs one. Semaphore is not involved in that clone.

### Step 5 — Add the repository

**Repositories** → **New Repository**.

- **Name:** `civitech-deploy`
- **URL:** `git@github.com:your-org/civitech-deploy.git`
- **Branch:** `main`
- **Access Key:** `git-readonly`

### Step 6 — Add the inventory

**Inventory** → **New Inventory**.

- **Name:** `production`
- **User Credentials:** `civitech-prod-ssh`
- **Type:** `File`
- **Path to Inventory File:** `inventory.ini`

Using type *File* means the inventory is read from your repo at run time, so it
stays in version control with everything else. Type *Static* pastes the content
into Semaphore's database instead — quicker to start, but now it lives in two
places and drifts.

Because Semaphore supplies the SSH key from **User Credentials**, delete the
`ansible_ssh_private_key_file` line from `inventory.ini` and push that change —
otherwise the file's path (which does not exist inside Semaphore's container)
wins and the run fails with a confusing key error.

### Step 7 — Add an environment

**Environment** → **New Environment**.

- **Name:** `prod`
- **Extra Variables:** leave `{}` for now — your vars come from `group_vars`.
- **Environment Variables:**
  ```json
  { "ANSIBLE_HOST_KEY_CHECKING": "False" }
  ```

> Setting `ANSIBLE_HOST_KEY_CHECKING=False` gets you running quickly, but it
> disables host key verification for every run. The better fix is to add a task
> that populates `~/.ssh/known_hosts` in the Semaphore container, or to mount a
> pre-seeded `known_hosts`. Treat the `False` as a temporary crutch and remove
> it once things work.

### Step 8 — Create the task templates

**Task Templates** → **New Template**. Make three.

**Template 1 — "Provision host"**

| Field | Value |
|---|---|
| Name | `Provision host` |
| Playbook Filename | `provision.yml` |
| Inventory | `production` |
| Repository | `civitech-deploy` |
| Environment | `prod` |
| Vault Password | `ansible-vault-pass` |

**Template 2 — "Deploy"**

Same, but Playbook Filename `deploy.yml`.

**Template 3 — "Deploy — config only"**

Same as Deploy, plus under **CLI Args**:

```json
["--tags", "config"]
```

CLI Args is a JSON array — each flag and each value is its own string. This is
the single most common place people get the syntax wrong. `["--tags config"]`
(one string) will not work; `["--tags", "config"]` will.

A "Dry run" template with `["--check", "--diff"]` is also worth adding.

---

## 6. Running your first task

Open the **Provision host** template and click **Run**. A dialog appears; leave
the defaults and confirm.

You land on the task view with live-streaming output — the same
`PLAY / TASK / PLAY RECAP` text from the terminal, now in a browser and saved
forever. Green means the task finished with exit code 0.

Once provisioning succeeds, run **Deploy**.

**Do this before trusting it:** run the dry-run template first and read the
diff. Semaphore makes it very easy to click a button that changes production;
the check-mode habit matters more here than in the terminal.

---

## 7. Survey variables — deploy a branch on demand

Right now `app_branch` is fixed in `group_vars`. Survey variables turn it into a
form field at run time.

Edit the **Deploy** template → **Survey Variables** → **Add**:

- **Name:** `app_branch`
- **Title:** `Branch to deploy`
- **Type:** `String`
- **Required:** yes

Now clicking Run prompts for a branch. Semaphore passes it as
`--extra-vars '{"app_branch": "..."}'`, and extra-vars beat `group_vars`, so
your playbook picks it up with no changes.

This is genuinely useful for this repo: deploying `v1-week3` to a staging host
becomes a text field rather than a config edit.

> One caution: a free-text survey variable is a string interpolated into your
> playbook. Only give run access to people you would give shell access to — see
> the next section.

---

## 8. Schedules, and chaining templates

### Schedules

Open a template → **Schedules** → **New Schedule**. Cron syntax:

```
0 3 * * *      every day at 03:00
0 */6 * * *    every six hours
30 2 * * 1     Mondays at 02:30
```

Sensible things to schedule for this project:

- A nightly **dry run** of `deploy.yml --check`, which tells you if anyone has
  hand-edited configuration on the server. Drift detection, free.
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
integration is the low-friction choice — point it at a private admin chat, not
the lead-notification chat.

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

The useful pattern: give everyone who deploys **Task Runner**, and keep
**Manager** for the one or two people who maintain the playbooks. Task Runners
can deploy without ever touching the production SSH key.

Be clear-eyed about the boundary, though: anyone who can run a template runs
code as root on your servers, and anyone with Manager can edit what that code
is. Semaphore's roles reduce credential *spread*; they do not sandbox what a
run can do.

Every task is recorded with who started it, when, from which template, and the
full log. That history is the main governance win over people running
`ansible-playbook` from their laptops.

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
```

Point the DNS record at the host, allow 80 and 443 through `ufw`, and leave
Semaphore itself bound to `127.0.0.1` so it is only reachable via the proxy.

Then set `SEMAPHORE_WEB_ROOT` in the compose environment to the public URL and
recreate the container, so links Semaphore generates use the right host:

```yaml
      SEMAPHORE_WEB_ROOT: https://semaphore.civitechglobal.com
```

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
```

Put that on a schedule, and store the `.env` in a password manager.

**Upgrading:**

```bash
cd ~/semaphore
docker compose pull
docker compose up -d
```

Take a database dump first. Semaphore runs its own schema migrations on start;
check `docker compose logs semaphore` afterwards.

Pinning `semaphoreui/semaphore:latest` is convenient but means an unplanned
upgrade whenever you `pull`. Pin an explicit version tag once you depend on it.

---

## 12. Troubleshooting

**"Permission denied (publickey)" during the play**
The inventory's `ansible_ssh_private_key_file` is overriding Semaphore's key.
Remove that line (step 6). Also confirm the **Username** on the Key Store entry
matches the remote user.

**"Host key verification failed"**
Set `ANSIBLE_HOST_KEY_CHECKING: "False"` in the environment as a temporary
measure, then fix it properly by seeding `known_hosts`.

**"ERROR! the playbook: deploy.yml could not be found"**
The path is relative to the repository root. If your playbooks are in a
subdirectory, the filename must be `ansible/deploy.yml`, not `deploy.yml`.

**"Attempting to decrypt but no vault secrets found"**
No Vault Password key is attached to the template. Attach
`ansible-vault-pass`.

**"couldn't resolve module/action 'community.docker.docker_compose_v2'"**
The collection is missing inside the Semaphore container. Commit a
`requirements.yml` to your playbook repo:

```yaml
---
collections:
  - name: community.docker
  - name: community.general
```

Semaphore installs collections from `requirements.yml` at the repository root
before each run. If your playbooks live in a subdirectory, either move the file
to the root or add a template that runs `ansible-galaxy install -r ...` first.

**Changes pushed to git are not picked up**
Semaphore caches the repository. Re-run the task — it pulls on each run — and
confirm the **Branch** on the Repository object matches the branch you pushed.

**The task hangs forever**
Something is prompting for input. Ansible cannot answer interactive prompts in
this context: no `--ask-become-pass`, no `vars_prompt`, no `prisma migrate dev`.
Cancel the task and make the step non-interactive.

**Everything worked yesterday and now every key is invalid**
`SEMAPHORE_ACCESS_KEY_ENCRYPTION` changed. Restore the original value; the keys
are not recoverable without it.

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

For CiviTech Global specifically, the drift-detection schedule (a nightly
`--check` run that emails or Telegrams you when the server no longer matches
the playbook) is the feature most likely to pay for the setup on its own.

---

## Further reading

- Semaphore UI docs — <https://docs.semaphoreui.com/>
- Ansible module index — <https://docs.ansible.com/ansible/latest/collections/index_module.html>
- Back to [**Ansible from zero**](./ansible-getting-started.md)
