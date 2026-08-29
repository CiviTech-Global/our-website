# Ansible from zero — deploying CiviTech Global

This guide assumes you have **never used Ansible**. It explains the mental
model first, then walks you through installing it, proving it works, and
finally building a real playbook that deploys this monorepo (postgres, redis,
api, bot, web, backup) onto a Linux server.

Every command below is followed by **what you should actually see**, so you can
compare against your own terminal instead of guessing whether it worked.

Everything here is done from your terminal. Once it works from the terminal,
[`ansible-semaphore-ui.md`](./ansible-semaphore-ui.md) shows you how to put a
web UI on top of it.

### The running example

To keep things concrete, the whole guide uses one fictional but consistent
setup. Substitute your own values as you go:

| Thing | Value used in this guide |
|---|---|
| Server IP | `203.0.113.42` |
| Server OS | Ubuntu 24.04 LTS (`noble`) |
| Public site | `https://civitechglobal.com` |
| Control node | Ubuntu 24.04 under WSL2 on Windows |
| Your local user | `mohammad` |
| Deploy directory on server | `/opt/civitech` |
| Deploy user on server | `civitech` |

(`203.0.113.42` is from a range reserved for documentation, so it is safe to
copy-paste around without accidentally hitting a real machine.)

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

| Term | What it means | Concrete example from this guide |
|---|---|---|
| **Control node** | The machine you run `ansible` from. Must be Linux/macOS/WSL — *not* native Windows. | Your WSL2 Ubuntu shell |
| **Managed node** | A server Ansible configures. Needs SSH + Python 3. | `203.0.113.42` |
| **Inventory** | A file listing your servers, optionally in groups. | `inventory.ini` |
| **Module** | A single unit of work Ansible knows how to do. Hundreds ship built in. | `ansible.builtin.apt` |
| **Task** | One invocation of a module, with a human-readable `name`. | "Install Docker Engine" |
| **Play** | A set of tasks mapped to a set of hosts. | "Provision the CiviTech host" |
| **Playbook** | A YAML file containing one or more plays. This is the thing you run. | `deploy.yml` |
| **Role** | A reusable, directory-shaped bundle of tasks/templates/vars. | `roles/docker/` |
| **Handler** | A task that only runs if something else reported a change. | "Reload nginx" |
| **Facts** | Info Ansible gathers about a host automatically, exposed as variables. | `ansible_distribution_release` → `noble` |
| **Idempotent** | Running it twice produces the same result as running it once. | Second run shows `changed=0` |
| **Vault** | Ansible's built-in encryption for secrets stored in git. | `group_vars/civitech_prod_vault.yml` |

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

<details>
<summary>What you'll see</summary>

```
Installing: Windows Subsystem for Linux
Windows Subsystem for Linux has been installed.
Installing: Ubuntu
Ubuntu has been installed.
The requested operation is successful. Changes will not be effective until
the system is restarted.
```
</details>

Reboot, let Ubuntu finish first-time setup (it asks you to create a username
and password — these are the Linux user, unrelated to your Windows login), then
do everything below **inside the Ubuntu shell**.

### Install Ansible

On Ubuntu/Debian (including WSL):

```bash
sudo apt update
sudo apt install -y python3 python3-pip pipx
pipx ensurepath
pipx install --include-deps ansible
```

<details>
<summary>What you'll see</summary>

```
$ pipx ensurepath
Success! Added /home/mohammad/.local/bin to the PATH environment variable.

$ pipx install --include-deps ansible
  installed package ansible 11.2.0, installed using Python 3.12.3
  These apps are now globally available
    - ansible
    - ansible-config
    - ansible-console
    - ansible-doc
    - ansible-galaxy
    - ansible-inventory
    - ansible-playbook
    - ansible-pull
    - ansible-vault
done! ✨ 🌟 ✨
```
</details>

Restart your shell, then verify:

```bash
ansible --version
```

<details>
<summary>What you'll see</summary>

```
ansible [core 2.18.2]
  config file = None
  configured module search path = ['/home/mohammad/.ansible/plugins/modules']
  ansible python module location = /home/mohammad/.local/pipx/venvs/ansible/lib/python3.12/site-packages/ansible
  ansible collection location = /home/mohammad/.ansible/collections:/usr/share/ansible/collections
  executable location = /home/mohammad/.local/bin/ansible
  python version = 3.12.3 (main, Feb  4 2025, 14:48:35) [GCC 13.3.0]
  jinja version = 3.1.5
  libyaml = True
```

Note `config file = None` — that changes once you create `ansible.cfg` below.
</details>

If you get `ansible: command not found`, your `PATH` did not pick up pipx — run
`pipx ensurepath` again and open a new terminal.

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

<details>
<summary>What you'll see</summary>

```
Starting galaxy collection install process
Process install dependency map
Starting collection install process
Downloading https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/artifacts/community-docker-4.5.2.tar.gz to /home/mohammad/.ansible/tmp/ansible-local-8421/tmp9xk2/community-docker-4.5.2-8f2j.tar.gz
Installing 'community.docker:4.5.2' to '/home/mohammad/.ansible/collections/ansible_collections/community/docker'
community.docker:4.5.2 was installed successfully
Installing 'community.general:10.3.0' to '/home/mohammad/.ansible/collections/ansible_collections/community/general'
community.general:10.3.0 was installed successfully
```
</details>

Confirm they landed:

```bash
ansible-galaxy collection list
```

<details>
<summary>What you'll see</summary>

```
# /home/mohammad/.ansible/collections/ansible_collections
Collection        Version
----------------- -------
community.docker  4.5.2
community.general 10.3.0
```
</details>

### Where to put your Ansible files

Create a `deploy/` directory *outside* this repo, or a separate `infra` repo.
Deployment credentials and server inventories generally should not live in the
application repo. This guide assumes:

```
~/civitech-deploy/
├── ansible.cfg
├── inventory.ini
├── group_vars/
│   ├── civitech_prod.yml
│   └── civitech_prod_vault.yml
├── templates/
│   ├── compose.env.j2
│   ├── server.env.j2
│   └── web.env.j2
├── provision.yml
└── deploy.yml
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
  server.

Instead of disabling it, add the real key once — after verifying the
fingerprint against what your VPS provider's console shows you:

```bash
ssh-keyscan -H 203.0.113.42 >> ~/.ssh/known_hosts
```

<details>
<summary>What you'll see</summary>

```
# 203.0.113.42:22 SSH-2.0-OpenSSH_9.6p1 Ubuntu-3ubuntu13.5
# 203.0.113.42:22 SSH-2.0-OpenSSH_9.6p1 Ubuntu-3ubuntu13.5
# 203.0.113.42:22 SSH-2.0-OpenSSH_9.6p1 Ubuntu-3ubuntu13.5
```

The `#` lines go to stderr (that is why they still appear on screen); the
actual key lines were appended to `known_hosts`. Verify with:

```
$ tail -1 ~/.ssh/known_hosts
|1|Xk3n...redacted...=|9Fv2...= ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL4rXk...
```
</details>

Now re-check that Ansible picked up the config:

```bash
ansible --version | head -2
```

<details>
<summary>What you'll see</summary>

```
ansible [core 2.18.2]
  config file = /home/mohammad/civitech-deploy/ansible.cfg
```

`config file` is no longer `None`. Ansible only reads `ansible.cfg` from the
**current working directory**, so always run these commands from
`~/civitech-deploy`.
</details>

---

## 4. Preparing the server

You need one Linux server (Ubuntu 22.04 or 24.04 LTS is the easy choice) that
you can SSH into.

### Set up key-based SSH

Password SSH will fight you constantly. Generate a key on the control node if
you do not have one:

```bash
ssh-keygen -t ed25519 -C "civitech-deploy" -f ~/.ssh/civitech_deploy
```

<details>
<summary>What you'll see</summary>

```
Generating public/private ed25519 key pair.
Enter passphrase for "/home/mohammad/.ssh/civitech_deploy" (empty for no passphrase):
Enter same passphrase again:
Your identification has been saved in /home/mohammad/.ssh/civitech_deploy
Your public key has been saved in /home/mohammad/.ssh/civitech_deploy.pub
The key fingerprint is:
SHA256:8kQ2vN5rT9wXcL1mYpZbH3jF7dR4sK6aE0gU2nV8iOw civitech-deploy
```

Leave the passphrase empty for an automation key, **or** set one and load it
into `ssh-agent` (`eval $(ssh-agent) && ssh-add ~/.ssh/civitech_deploy`) so
Ansible is not prompted mid-run.
</details>

Copy the public half to the server:

```bash
ssh-copy-id -i ~/.ssh/civitech_deploy.pub root@203.0.113.42
```

<details>
<summary>What you'll see</summary>

```
/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/home/mohammad/.ssh/civitech_deploy.pub"
/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed
/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys
root@203.0.113.42's password:

Number of key(s) added: 1

Now try logging into the machine, with:   "ssh -i '/home/mohammad/.ssh/civitech_deploy.pub' 'root@203.0.113.42'"
and check to make sure that only the key(s) you wanted were added.
```

This is the **one and only** time you type the server password.
</details>

Confirm it works with no password prompt:

```bash
ssh -i ~/.ssh/civitech_deploy root@203.0.113.42 'echo connected; python3 --version'
```

<details>
<summary>What you'll see</summary>

```
connected
Python 3.12.3
```
</details>

If that does not print `connected`, **stop here and fix SSH first.** Ansible
cannot do anything your SSH client cannot do. The Python version line matters
too — Ansible needs Python 3 on the managed node.

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
civitech-prod ansible_host=203.0.113.42

[civitech_prod:vars]
ansible_user=root
ansible_ssh_private_key_file=~/.ssh/civitech_deploy
ansible_python_interpreter=/usr/bin/python3
```

Reading this:

- `[civitech_prod]` is a **group name**. Playbooks target groups.
- `civitech-prod` is the host's **alias** — a friendly name for your logs.
- `ansible_host=` is the real address it connects to.
- `[civitech_prod:vars]` sets variables for every host in that group.

First, check Ansible parses it the way you expect:

```bash
ansible-inventory --graph
```

<details>
<summary>What you'll see</summary>

```
@all:
  |--@ungrouped:
  |--@civitech_prod:
  |  |--civitech-prod
```
</details>

```bash
ansible-inventory --host civitech-prod
```

<details>
<summary>What you'll see</summary>

```json
{
    "ansible_host": "203.0.113.42",
    "ansible_python_interpreter": "/usr/bin/python3",
    "ansible_ssh_private_key_file": "~/.ssh/civitech_deploy",
    "ansible_user": "root"
}
```

This is the single best debugging command when a host behaves unexpectedly —
it shows every variable Ansible will apply, merged from every source.
</details>

Now the traditional first command — `ping` here is not ICMP, it is "can I log
in and run Python on this host":

```bash
ansible civitech_prod -m ping
```

<details>
<summary>What you'll see</summary>

```yaml
civitech-prod | SUCCESS => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/bin/python3"
    },
    "changed": false,
    "ping": "pong"
}
```
</details>

If instead you see `UNREACHABLE`, it is an SSH problem, not an Ansible problem:

<details>
<summary>What a failure looks like</summary>

```yaml
civitech-prod | UNREACHABLE! => {
    "changed": false,
    "msg": "Failed to connect to the host via ssh: root@203.0.113.42: Permission denied (publickey).",
    "unreachable": true
}
```

See [Troubleshooting](#14-troubleshooting).
</details>

---

## 6. Ad-hoc commands

Before playbooks, get a feel for modules by running single tasks directly. The
shape is `ansible <hosts> -m <module> -a "<arguments>"`.

**Gather facts about the OS:**

```bash
ansible civitech_prod -m setup -a 'filter=ansible_distribution*'
```

<details>
<summary>What you'll see</summary>

```yaml
civitech-prod | SUCCESS => {
    "ansible_facts": {
        "ansible_distribution": "Ubuntu",
        "ansible_distribution_file_parsed": true,
        "ansible_distribution_file_path": "/etc/os-release",
        "ansible_distribution_file_variety": "Debian",
        "ansible_distribution_major_version": "24",
        "ansible_distribution_release": "noble",
        "ansible_distribution_version": "24.04"
    },
    "changed": false
}
```

`ansible_distribution_release` → `noble` is the fact the Docker apt repo task
in section 11 uses, so it works on 22.04 (`jammy`) too with no edits.
</details>

Run bare `ansible civitech_prod -m setup` to dump *all* facts — it is several
hundred lines, which is why you normally filter.

**Check disk space:**

```bash
ansible civitech_prod -m shell -a 'df -h /'
```

<details>
<summary>What you'll see</summary>

```
civitech-prod | CHANGED | rc=0 >>
Filesystem      Size  Used Avail Use% Mounted on
/dev/vda1        79G  4.2G   71G   6% /
```

Note it says **CHANGED** even though nothing changed. `shell` cannot know
whether it altered anything, so it always claims it did — exactly the problem
real modules solve.
</details>

**Install a package** (`-b` = become, i.e. sudo):

```bash
ansible civitech_prod -m apt -a 'name=htop state=present update_cache=yes' -b
```

<details>
<summary>What you'll see — first run</summary>

```yaml
civitech-prod | CHANGED => {
    "cache_update_time": 1756377600,
    "cache_updated": true,
    "changed": true,
    "stdout_lines": [
        "Reading package lists...",
        "Building dependency tree...",
        "The following NEW packages will be installed:",
        "  htop",
        "Setting up htop (3.3.0-4build1) ..."
    ]
}
```
</details>

<details>
<summary>What you'll see — second run</summary>

```yaml
civitech-prod | SUCCESS => {
    "cache_update_time": 1756377600,
    "cache_updated": true,
    "changed": false
}
```

`SUCCESS` and `"changed": false`. It checked, found htop already installed, and
did nothing. That is a real module behaving idempotently.
</details>

Two habits from day one:

- **`-b` / `--become`** is Ansible's sudo. Anything touching system state needs
  it (unless you connect as root).
- Prefer a real module (`apt`) over `shell`. The module is idempotent and tells
  you the truth about whether it changed anything.

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

Always syntax-check before running — it catches indentation mistakes in a
second instead of halfway through a deploy:

```bash
ansible-playbook first.yml --syntax-check
```

<details>
<summary>What you'll see</summary>

```
playbook: first.yml
```

That is all. Silence plus the filename means valid. A broken file instead
gives you the line number:

```
ERROR! We were unable to read either as JSON nor YAML, these are the errors we got from each:
JSON: Expecting value: line 1 column 1 (char 0)
Syntax Error while loading YAML.
  mapping values are not allowed in this context

The error appears to be in '/home/mohammad/civitech-deploy/first.yml': line 9, column 14
```
</details>

Run it:

```bash
ansible-playbook first.yml
```

<details>
<summary>What you'll see — first run</summary>

```
PLAY [My first play] ***********************************************************

TASK [Gathering Facts] *********************************************************
ok: [civitech-prod]

TASK [Make sure curl and git are installed] ************************************
changed: [civitech-prod]

TASK [Create a marker file] ****************************************************
changed: [civitech-prod]

PLAY RECAP *********************************************************************
civitech-prod              : ok=3    changed=2    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
```
</details>

- **ok** = checked, already correct, nothing done.
- **changed** = Ansible modified the system.
- **failed** = task errored; the play stops for that host.

Now run the exact same command again:

<details>
<summary>What you'll see — second run</summary>

```
PLAY [My first play] ***********************************************************

TASK [Gathering Facts] *********************************************************
ok: [civitech-prod]

TASK [Make sure curl and git are installed] ************************************
ok: [civitech-prod]

TASK [Create a marker file] ****************************************************
ok: [civitech-prod]

PLAY RECAP *********************************************************************
civitech-prod              : ok=3    changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
```

**`changed=0`.** That is idempotency, and it is the whole point. You can run
this a thousand times and the server ends up identical every time.
</details>

<details>
<summary>What a failed task looks like</summary>

```
TASK [Make sure curl and git are installed] ************************************
fatal: [civitech-prod]: FAILED! => changed=false
  msg: |-
    No package matching 'gti' is available

PLAY RECAP *********************************************************************
civitech-prod              : ok=1    changed=0    unreachable=0    failed=1
```

Ansible stops that host at the failing task and does not run the rest of the
play for it. Other hosts in the group keep going.
</details>

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

<details>
<summary>What the `creates:` guard looks like on the second run</summary>

```
TASK [Run a one-time setup script] *********************************************
ok: [civitech-prod] => changed=false
  msg: skipped, since /opt/civitech/.setup-done exists
```
</details>

`register:` saves a task's result into a variable you can inspect or use in a
`when:` condition later. To see what is actually inside a registered variable:

```yaml
- name: Show what we captured
  ansible.builtin.debug:
    var: compose_status.stdout_lines
```

<details>
<summary>What you'll see</summary>

```
TASK [Show what we captured] ***************************************************
ok: [civitech-prod] =>
  compose_status.stdout_lines:
  - 'NAME                  IMAGE                    STATUS'
  - 'civitech-api-1        civitech-api             Up 2 minutes'
  - 'civitech-bot-1        civitech-bot             Up 2 minutes'
  - 'civitech-postgres-1   postgres:16-alpine       Up 2 minutes (healthy)'
```

`ansible.builtin.debug` is your `print()`. Use it liberally while learning.
</details>

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
telegram_admin_user_ids: "111111111,222222222"
telegram_webhook_url: https://civitechglobal.com/telegram/webhook

backup_retention_days: 14

# Mapped from the encrypted vault file — see section 10
postgres_password: "{{ vault_postgres_password }}"
jwt_secret: "{{ vault_jwt_secret }}"
jwt_refresh_secret: "{{ vault_jwt_refresh_secret }}"
telegram_bot_token: "{{ vault_telegram_bot_token }}"
telegram_webhook_secret: "{{ vault_telegram_webhook_secret }}"
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

<details>
<summary>What this renders to on the server</summary>

`/opt/civitech/civitechglobal-server/.env`:

```bash
# Managed by Ansible — do not edit on the server.
DATABASE_URL="postgresql://civitech:7f3a9c2e8b1d4a6f5e0c3b7a9d2f4e81@postgres:5432/civitechglobal"
REDIS_URL="redis://redis:6379"

JWT_SECRET="4e9b1c7a3f8d2e5b6a0c9f4d7e1b8a3c6f2d9e5b1a7c4f8d3e6b0a9c2f5d7e1b"
JWT_REFRESH_SECRET="8a2f5c9d1e4b7a3f6c0d9e2b5a8f1c4d7e0b3a6f9c2d5e8b1a4f7c0d3e6b9a2f"

TELEGRAM_BOT_TOKEN="7891234567:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
TELEGRAM_ADMIN_USER_IDS="111111111,222222222"
TELEGRAM_WEBHOOK_SECRET="c4f8d3e6b0a9c2f5d7e1b4a7c0d3e6b9"
TELEGRAM_WEBHOOK_URL="https://civitechglobal.com/telegram/webhook"
TELEGRAM_BOT_MODE="webhook"

PORT=5000
BOT_PORT=4000

CORS_ORIGIN="https://civitechglobal.com"
COOKIE_SECURE="true"

NODE_ENV="production"
LOG_LEVEL="info"

SENTRY_DSN=""
```

(Those secret values are invented for the example — yours come from the vault.)
</details>

Compare this against `civitechglobal-server/.env.example` and note what
changed. `COOKIE_SECURE="true"`, `NODE_ENV="production"`, and
`TELEGRAM_BOT_MODE="webhook"` are all flipped — the committed example is tuned
for local HTTP development, and every one of those needs to change for a real
deployment. `| default('')` is a Jinja2 filter: use the variable if defined,
otherwise an empty string.

Deliberately absent: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. Those exist so
local seeding is reproducible; do not template a known admin password onto a
production host.

The other two templates:

`templates/compose.env.j2`:

```jinja
POSTGRES_USER={{ postgres_user }}
POSTGRES_PASSWORD={{ postgres_password }}
POSTGRES_DB={{ postgres_db }}
BACKUP_RETENTION_DAYS={{ backup_retention_days | default(14) }}
```

<details>
<summary>Renders to `/opt/civitech/.env`</summary>

```bash
POSTGRES_USER=civitech
POSTGRES_PASSWORD=7f3a9c2e8b1d4a6f5e0c3b7a9d2f4e81
POSTGRES_DB=civitechglobal
BACKUP_RETENTION_DAYS=14
```

This is the file `docker-compose.yml` reads for its `${POSTGRES_USER:-civitech}`
style defaults.
</details>

`templates/web.env.j2`:

```jinja
VITE_API_URL=/api
VITE_TELEGRAM_BOT_URL={{ telegram_bot_url }}
```

<details>
<summary>Renders to `/opt/civitech/civitechglobal-web/.env`</summary>

```bash
VITE_API_URL=/api
VITE_TELEGRAM_BOT_URL=https://t.me/civitechglobal_bot
```
</details>

> **Vite caveat:** `VITE_*` values are baked in at **build** time, not read at
> run time. Because the compose task uses `build: always`, changing
> `telegram_bot_url` does take effect on the next deploy — but if you ever
> switch to prebuilt images, editing the web `.env` alone will change nothing.

---

## 10. Secrets with Ansible Vault

`postgres_password`, `jwt_secret`, and `telegram_bot_token` cannot sit in
plaintext in git. Ansible Vault encrypts a file with a passphrase; playbooks
read it transparently at run time.

Generate strong values first, as `civitechglobal-server/.env.example` suggests:

```bash
openssl rand -hex 32
```

<details>
<summary>What you'll see</summary>

```
4e9b1c7a3f8d2e5b6a0c9f4d7e1b8a3c6f2d9e5b1a7c4f8d3e6b0a9c2f5d7e1b
```

Run it once per secret — never reuse one value across `JWT_SECRET` and
`JWT_REFRESH_SECRET`.
</details>

Create the encrypted vars file:

```bash
cd ~/civitech-deploy
ansible-vault create group_vars/civitech_prod_vault.yml
```

<details>
<summary>What you'll see</summary>

```
New Vault password:
Confirm New Vault password:
```

Then your `$EDITOR` opens on an empty file. (If it opens `vi` and you are
stuck: press `i`, type, then `Esc` `:wq` `Enter`. Or set
`export EDITOR=nano` first.)
</details>

Put the secrets in:

```yaml
---
vault_postgres_password: "7f3a9c2e8b1d4a6f5e0c3b7a9d2f4e81"
vault_jwt_secret: "4e9b1c7a3f8d2e5b6a0c9f4d7e1b8a3c6f2d9e5b1a7c4f8d3e6b0a9c2f5d7e1b"
vault_jwt_refresh_secret: "8a2f5c9d1e4b7a3f6c0d9e2b5a8f1c4d7e0b3a6f9c2d5e8b1a4f7c0d3e6b9a2f"
vault_telegram_bot_token: "7891234567:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
vault_telegram_webhook_secret: "c4f8d3e6b0a9c2f5d7e1b4a7c0d3e6b9"
```

Save and close. Now look at what is actually on disk:

```bash
head -3 group_vars/civitech_prod_vault.yml
```

<details>
<summary>What you'll see</summary>

```
$ANSIBLE_VAULT;1.1;AES256
33623764653966363733353938616637663539333764373766613461363539363162383961
6234653639346235303534373938653933616635353761370a316263623764316662393264
```

Ciphertext. This file is safe to commit to git.
</details>

The convention is to prefix vaulted names with `vault_` and map them to plain
names in `group_vars/civitech_prod.yml` (already done in section 9). That way
you can grep for where any value comes from.

Working with vault files:

```bash
ansible-vault view group_vars/civitech_prod_vault.yml    # read only
ansible-vault edit group_vars/civitech_prod_vault.yml    # edit in place
ansible-vault rekey group_vars/civitech_prod_vault.yml   # change passphrase
```

<details>
<summary>What `view` shows</summary>

```
Vault password:
---
vault_postgres_password: "7f3a9c2e8b1d4a6f5e0c3b7a9d2f4e81"
vault_jwt_secret: "4e9b1c7a3f8d2e5b6a0c9f4d7e1b8a3c6f2d9e5b1a7c4f8d3e6b0a9c2f5d7e1b"
...
```
</details>

Running a playbook that needs the vault:

```bash
ansible-playbook deploy.yml --ask-vault-pass
```

<details>
<summary>What you'll see if you forget the flag</summary>

```
ERROR! Attempting to decrypt but no vault secrets found
```
</details>

For automation (and for Semaphore later), keep the passphrase in a file
instead of typing it:

```bash
echo 'your-vault-passphrase' > ~/.civitech-vault-pass
chmod 600 ~/.civitech-vault-pass
ansible-playbook deploy.yml --vault-password-file ~/.civitech-vault-pass
```

Never commit that passphrase file. Add it to `.gitignore` in your deploy repo.

You can also encrypt a single value inline, which is handy for one-off secrets:

```bash
ansible-vault encrypt_string 'super-secret-value' --name 'sentry_dsn'
```

<details>
<summary>What you'll see</summary>

```
Vault password:
sentry_dsn: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          62313365396662343061393464336163383764373764613633653634306232626433
          3136626431346435346463663461393464616163366338660a383737656365363464
Encryption successful
```

Paste that block straight into a normal (unencrypted) vars file — Ansible
decrypts just that value at run time.
</details>

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
the host, so the repo line resolves to `.../ubuntu noble stable` on 24.04 and
`.../ubuntu jammy stable` on 22.04 with no edits from you.

Run it:

```bash
ansible-playbook provision.yml --vault-password-file ~/.civitech-vault-pass
```

<details>
<summary>What you'll see — first run (abridged)</summary>

```
PLAY [Provision the CiviTech host] *********************************************

TASK [Gathering Facts] *********************************************************
ok: [civitech-prod]

TASK [Install base packages] ***************************************************
changed: [civitech-prod]

TASK [Ensure the apt keyrings directory exists] ********************************
ok: [civitech-prod]

TASK [Add Docker's official GPG key] *******************************************
changed: [civitech-prod]

TASK [Add the Docker apt repository] *******************************************
changed: [civitech-prod]

TASK [Install Docker Engine and the Compose plugin] ****************************
changed: [civitech-prod]

TASK [Ensure Docker is running and enabled at boot] ****************************
ok: [civitech-prod]

TASK [Install the Docker SDK for Python (needed by community.docker)] **********
changed: [civitech-prod]

TASK [Create the deploy user] **************************************************
changed: [civitech-prod]

TASK [Allow SSH and HTTP/HTTPS through the firewall] ***************************
changed: [civitech-prod] => (item=22)
changed: [civitech-prod] => (item=80)
changed: [civitech-prod] => (item=443)

TASK [Enable the firewall with a default-deny policy] **************************
changed: [civitech-prod]

PLAY RECAP *********************************************************************
civitech-prod              : ok=11   changed=8    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
```

Note the `loop` task prints one line **per item** — that is what loops look
like in the output. Takes roughly 2–4 minutes on a fresh host, almost all of it
the Docker install.
</details>

<details>
<summary>What you'll see — second run</summary>

```
PLAY RECAP *********************************************************************
civitech-prod              : ok=11   changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
```

`changed=0` — the server already matches the playbook. This is what "safe to
re-run any time" looks like in practice.
</details>

Sanity-check the result yourself:

```bash
ansible civitech_prod -m shell -a 'docker --version && docker compose version && ufw status' -b
```

<details>
<summary>What you'll see</summary>

```
civitech-prod | CHANGED | rc=0 >>
Docker version 27.5.1, build 9f9e405
Docker Compose version v2.32.4
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```
</details>

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

    - name: Show which commit is deployed
      ansible.builtin.debug:
        msg: "Deploying {{ app_branch }} @ {{ checkout.after[:8] }}"
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
        url: "http://127.0.0.1:{{ api_port }}/api/health/ready"
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

Run it:

```bash
ansible-playbook deploy.yml --vault-password-file ~/.civitech-vault-pass
```

<details>
<summary>What you'll see — first deploy</summary>

```
PLAY [Deploy CiviTech Global] **************************************************

TASK [Gathering Facts] *********************************************************
ok: [civitech-prod]

TASK [Ensure the application directory exists] *********************************
changed: [civitech-prod]

TASK [Check out the requested branch] ******************************************
changed: [civitech-prod]

TASK [Show which commit is deployed] *******************************************
ok: [civitech-prod] =>
  msg: Deploying main @ 20ec3441

TASK [Render the compose-level .env] *******************************************
changed: [civitech-prod]

TASK [Render the server .env] **************************************************
changed: [civitech-prod]

TASK [Render the web .env] *****************************************************
changed: [civitech-prod]

TASK [Build images and start the stack] ****************************************
changed: [civitech-prod]

TASK [Apply database migrations] ***********************************************
changed: [civitech-prod]

TASK [Wait for the API to answer] **********************************************
FAILED - RETRYING: [civitech-prod]: Wait for the API to answer (12 retries left).
FAILED - RETRYING: [civitech-prod]: Wait for the API to answer (11 retries left).
ok: [civitech-prod]

TASK [Remove dangling images] **************************************************
changed: [civitech-prod]

PLAY RECAP *********************************************************************
civitech-prod              : ok=11   changed=8    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
```

The `FAILED - RETRYING` lines are **normal and not an error** — that is the
`retries`/`until` loop waiting for the API container to finish booting. It only
becomes a real failure if all 12 attempts are exhausted. Expect the first
deploy to take 5–10 minutes because Docker builds every image from scratch.
</details>

<details>
<summary>What you'll see — re-deploying with no code changes</summary>

```
TASK [Check out the requested branch] ******************************************
ok: [civitech-prod]

TASK [Show which commit is deployed] *******************************************
ok: [civitech-prod] =>
  msg: Deploying main @ 20ec3441

TASK [Render the server .env] **************************************************
ok: [civitech-prod]

TASK [Build images and start the stack] ****************************************
ok: [civitech-prod]

TASK [Apply database migrations] ***********************************************
ok: [civitech-prod]

PLAY RECAP *********************************************************************
civitech-prod              : ok=11   changed=1    unreachable=0    failed=0
```

`changed=1` is the prune task, which reports a change whenever there is
anything to clean up.
</details>

Points worth understanding:

- **`prisma migrate deploy`, not `migrate dev`.** The repo's
  `npm run prisma:migrate` maps to `prisma migrate dev`, which is interactive
  and can reset data. `migrate deploy` only applies pending migrations and is
  the production-safe command.

  <details>
  <summary>What the migration output looks like</summary>

  ```
  $ docker compose exec -T api npx prisma migrate deploy
  Prisma schema loaded from prisma/schema.prisma
  Datasource "db": PostgreSQL database "civitechglobal", schema "public"

  3 migrations found in prisma/migrations

  Applying migration `20250812_add_lead_status`
  Applying migration `20250819_product_slug_unique`
  Applying migration `20250826_session_lifecycle`

  All migrations have been successfully applied.
  ```

  And on a re-run with nothing pending — this is the string the
  `changed_when:` condition keys off:

  ```
  No pending migrations to apply.
  ```
  </details>

- **No seeding task.** `prisma:seed` creates a `SUPER_ADMIN` and is a
  deliberate one-time human action, not part of every deploy. Run it manually
  once, then change the password as the root README describes:

  ```bash
  ansible civitech_prod -m shell \
    -a 'chdir=/opt/civitech docker compose exec -T api npm run prisma:seed' -b
  ```

- The health check hits `/api/health/ready`, which `src/app.ts` defines: it
  probes Postgres with `SELECT 1` and pings Redis, returning 503 unless both
  answer. That is exactly the right thing to gate a deploy on — the process
  being up is not the same as the process being able to serve. There is also
  `/api/health/live` if you only want a liveness signal.
- `docker-compose.yml` binds postgres and redis to `127.0.0.1` only, which is
  correct. The `api` (5000), `bot` (4000), and `web` (5173) services publish on
  all interfaces, so put nginx or Caddy in front terminating TLS on 443 rather
  than opening those ports in ufw.
- `docker-compose.override.yml` is local-machine-only and gitignored, so it
  will not follow you to the server. Good — that is exactly what it is for.
- The compose file's `backup` service already handles nightly `pg_dump`s to a
  volume. If you move to managed Postgres later, drop that service and use the
  provider's backups, as the comment in `docker-compose.yml` says.

Confirm the stack is actually up:

```bash
ansible civitech_prod -m shell -a 'chdir=/opt/civitech docker compose ps' -b
```

<details>
<summary>What you'll see</summary>

```
civitech-prod | CHANGED | rc=0 >>
NAME                  IMAGE                COMMAND                  SERVICE    STATUS                    PORTS
civitech-api-1        civitech-api         "node dist/index.js"     api        Up 3 minutes              0.0.0.0:5000->5000/tcp
civitech-backup-1     civitech-backup      "/backup-loop.sh"        backup     Up 3 minutes
civitech-bot-1        civitech-bot         "node dist/bot/index…"   bot        Up 3 minutes              0.0.0.0:4000->4000/tcp
civitech-postgres-1   postgres:16-alpine   "docker-entrypoint.s…"   postgres   Up 3 minutes (healthy)    127.0.0.1:5432->5432/tcp
civitech-redis-1      redis:7-alpine       "docker-entrypoint.s…"   redis      Up 3 minutes (healthy)    127.0.0.1:6379->6379/tcp
civitech-web-1        civitech-web         "/docker-entrypoint.…"   web        Up 3 minutes              0.0.0.0:5173->80/tcp
```
</details>

---

## 12. Handlers, tags, and safe dry runs

### Dry runs

Before any real deploy:

```bash
ansible-playbook deploy.yml --check --diff --vault-password-file ~/.civitech-vault-pass
```

- `--check` = "tell me what you *would* change, change nothing."
- `--diff` = show line-by-line diffs of files that would change.

<details>
<summary>What you'll see when someone hand-edited a config on the server</summary>

```
TASK [Render the server .env] **************************************************
--- before: /opt/civitech/civitechglobal-server/.env
+++ after: /home/mohammad/.ansible/tmp/ansible-local-9921/tmpk3f2/server.env.j2
@@ -14,7 +14,7 @@
 BOT_PORT=4000

 CORS_ORIGIN="https://civitechglobal.com"
-COOKIE_SECURE="false"
+COOKIE_SECURE="true"

 NODE_ENV="production"
 LOG_LEVEL="info"
changed: [civitech-prod]

PLAY RECAP *********************************************************************
civitech-prod              : ok=11   changed=1    unreachable=0    failed=0
```

Someone flipped `COOKIE_SECURE` to `false` on the box directly. Nothing was
modified by this run — `--check` only reported. This is exactly the drift
detection you schedule nightly in the Semaphore guide.
</details>

<details>
<summary>What a clean dry run looks like</summary>

```
PLAY RECAP *********************************************************************
civitech-prod              : ok=11   changed=0    unreachable=0    failed=0
```

`changed=0` in check mode = the server matches the playbook exactly.
</details>

Check mode is not perfect — tasks whose result depends on an earlier task's
side effect may report oddly, since the earlier change never happened. Treat it
as a strong hint, not a guarantee.

### Tags

Tags let you run part of a playbook. Given the tags above:

```bash
ansible-playbook deploy.yml --tags config --vault-password-file ~/.civitech-vault-pass
```

<details>
<summary>What you'll see</summary>

```
PLAY [Deploy CiviTech Global] **************************************************

TASK [Gathering Facts] *********************************************************
ok: [civitech-prod]

TASK [Render the compose-level .env] *******************************************
ok: [civitech-prod]

TASK [Render the server .env] **************************************************
changed: [civitech-prod]

TASK [Render the web .env] *****************************************************
ok: [civitech-prod]

PLAY RECAP *********************************************************************
civitech-prod              : ok=4    changed=1    unreachable=0    failed=0    skipped=0
```

Only the three `config`-tagged tasks ran — no git checkout, no rebuild, no
migration. Roughly 8 seconds instead of several minutes.
</details>

Other tag usage:

```bash
ansible-playbook deploy.yml --tags migrate
ansible-playbook deploy.yml --skip-tags cleanup
ansible-playbook deploy.yml --list-tags
```

<details>
<summary>What `--list-tags` shows</summary>

```
playbook: deploy.yml

  play #1 (civitech_prod): Deploy CiviTech Global	TAGS: []
      TASK TAGS: [cleanup, code, config, deploy, migrate]
```
</details>

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

<details>
<summary>What you'll see when the template changed</summary>

```
TASK [Render nginx site config] ************************************************
changed: [civitech-prod]

RUNNING HANDLER [Reload nginx] *************************************************
changed: [civitech-prod]
```

The `RUNNING HANDLER` section always appears at the very end of the play.
</details>

<details>
<summary>What you'll see when it did not</summary>

```
TASK [Render nginx site config] ************************************************
ok: [civitech-prod]
```

No handler section at all. nginx was left completely alone. If several tasks
notify the same handler, it still runs exactly once.
</details>

### Limiting and verbosity

```bash
ansible-playbook deploy.yml --limit civitech-prod   # one host only
ansible-playbook deploy.yml --start-at-task "Apply database migrations"
ansible-playbook deploy.yml -vvv                    # full connection debug
```

<details>
<summary>What `-vvv` adds (one task's worth)</summary>

```
TASK [Render the server .env] **************************************************
task path: /home/mohammad/civitech-deploy/deploy.yml:28
<203.0.113.42> ESTABLISH SSH CONNECTION FOR USER: root
<203.0.113.42> SSH: EXEC ssh -o ControlMaster=auto -o ControlPersist=60s -o
  'IdentityFile="/home/mohammad/.ssh/civitech_deploy"' -o KbdInteractiveAuthentication=no
  -o PreferredAuthentications=publickey -o PasswordAuthentication=no -o 'User="root"'
  -o ConnectTimeout=10 203.0.113.42 '/bin/sh -c ...'
<203.0.113.42> (0, b'{"changed": true, "dest": "/opt/civitech/...
```

That literal `ssh` command line is the single most useful thing `-vvv` gives
you — copy it, run it by hand, and you will usually see the real error.
</details>

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

<details>
<summary>What you'll see</summary>

```
- Role roles/docker was created successfully
```

```
$ find roles/docker -type f | sort
roles/docker/README.md
roles/docker/defaults/main.yml
roles/docker/handlers/main.yml
roles/docker/meta/main.yml
roles/docker/tasks/main.yml
roles/docker/tests/inventory
roles/docker/tests/test.yml
roles/docker/vars/main.yml
```
</details>

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

<details>
<summary>How role tasks appear in output</summary>

```
TASK [docker : Install Docker Engine and the Compose plugin] *******************
changed: [civitech-prod]
```

The task name is prefixed with `rolename : ` — handy for knowing where a task
lives once you have a dozen roles.
</details>

Do not start here. Write the flat playbook, get it working, refactor into roles
when the size actually hurts.

---

## 14. Troubleshooting

Each entry shows the real error text so you can match it against your terminal.

**`UNREACHABLE` / "Failed to connect to the host via ssh"**

```
civitech-prod | UNREACHABLE! => {
    "msg": "Failed to connect to the host via ssh: root@203.0.113.42: Permission denied (publickey).",
    "unreachable": true
}
```

Not an Ansible problem. Test plain `ssh root@203.0.113.42` first. Check
`ansible_user`, `ansible_host`, and the key path via
`ansible-inventory --host civitech-prod`. Run with `-vvv` to see the exact SSH
command Ansible built.

**`Missing sudo password`**

```
fatal: [civitech-prod]: FAILED! => {"msg": "Missing sudo password"}
```

The remote user needs passwordless sudo, or you pass `--ask-become-pass` (`-K`).

**Missing Python interpreter**

```
"module_stderr": "/bin/sh: 1: /usr/bin/python3: not found"
```

Install it over plain SSH once: `ssh root@203.0.113.42 'apt install -y python3'`.

**Collection not installed**

```
ERROR! couldn't resolve module/action 'community.docker.docker_compose_v2'.
This often indicates a misspelling, missing collection, or incorrect module path.
```

The collection is missing on the **control node**:
`ansible-galaxy collection install community.docker`.

**Vault flag forgotten**

```
ERROR! Attempting to decrypt but no vault secrets found
```

Add `--ask-vault-pass` or `--vault-password-file ~/.civitech-vault-pass`.

**Undefined variable**

```
fatal: [civitech-prod]: FAILED! => {"msg": "The task includes an option with an
undefined variable. The error was: 'sentry_dsn' is undefined"}
```

Either define it in `group_vars`, or give it a fallback in the template with
`{{ sentry_dsn | default('') }}`.

**A task reports `changed` on every single run**
It is a `command`/`shell` task with no `creates:` or `changed_when:`. Either
add one, or switch to a real module.

**YAML errors that make no sense**
Almost always indentation, a tab character, or an unquoted value starting with
`{{`. Validate first: `ansible-playbook deploy.yml --syntax-check`.

**Linting**

```bash
pipx install ansible-lint
ansible-lint deploy.yml
```

<details>
<summary>What you'll see</summary>

```
WARNING  Listing 2 violation(s) that are fatal
name[casing]: All names should start with an uppercase letter.
deploy.yml:12 Task/Handler: ensure the application directory exists

risky-file-permissions: File permissions unset or incorrect.
deploy.yml:31 Task/Handler: ansible.builtin.template

                     Rule Violation Summary
count  tag                       profile    rule associated tags
    1  name[casing]              basic      idiom
    1  risky-file-permissions    safety     unpredictability

Failed: 2 failure(s), 0 warning(s) on 1 files.
```

It catches missing `name:` fields, deprecated syntax, unset file modes, and
non-idempotent patterns. Worth running before every commit.
</details>

---

## 15. Cheat sheet

```bash
# Connectivity
ansible all -m ping
ansible all -m setup -a 'filter=ansible_distribution*'

# Ad-hoc
ansible civitech_prod -m apt -a 'name=htop state=present' -b
ansible civitech_prod -m shell -a 'chdir=/opt/civitech docker compose ps' -b

# Playbooks
ansible-playbook deploy.yml --syntax-check
ansible-playbook deploy.yml --check --diff
ansible-playbook deploy.yml --tags config
ansible-playbook deploy.yml --list-tags
ansible-playbook deploy.yml --limit civitech-prod -vvv
ansible-playbook deploy.yml --vault-password-file ~/.civitech-vault-pass

# Inventory
ansible-inventory --graph
ansible-inventory --host civitech-prod

# Vault
ansible-vault create|edit|view|rekey group_vars/civitech_prod_vault.yml
ansible-vault encrypt_string 'secret-value' --name 'jwt_secret'

# Collections
ansible-galaxy collection install community.docker community.general
ansible-galaxy collection list

# Docs, without leaving the terminal
ansible-doc ansible.builtin.template
ansible-doc -l | grep docker
```

<details>
<summary>What `ansible-doc` gives you</summary>

```
$ ansible-doc ansible.builtin.template
> ANSIBLE.BUILTIN.TEMPLATE    (.../ansible/plugins/action/template.py)

  Templates are processed with the Jinja2 templating language. Documentation
  on the template formatting can be found in the Template Designer
  Documentation.

OPTIONS (= is mandatory):

= dest
        Location to render the template to on the remote machine.
        type: path

- mode
        The permissions the resulting filesystem object should have.
        ...

EXAMPLES:
- name: Template a file to /etc/file.conf
  ansible.builtin.template:
    src: etc/file.conf.j2
    dest: /etc/file.conf
    owner: bin
    mode: '0644'
```

Every module page ends with copy-pasteable examples. This is faster than the
website once you know the module name.
</details>

**Where to look things up:** the module index at
<https://docs.ansible.com/ansible/latest/collections/index_module.html>.

---

## Next

Your deploy now runs from the terminal with one command. Next:
[**Semaphore UI**](./ansible-semaphore-ui.md) — the same playbook behind a web
UI, with scheduled runs, stored secrets, and a record of who deployed what.
