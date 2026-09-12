# Production deployment — CiviTech Global

The complete path from a bare Linux server to `https://civitechglobal.com`,
using Ansible for the machine and Semaphore UI for the button.

**The playbooks are in [`civitech-deploy/`](../civitech-deploy/).** They are
heavily commented — every non-obvious task says why it is there and what
breaks without it. This guide is the map: the order to run things in, the
decisions behind the shape, and the parts that cannot live in a file comment.
Where a file already explains itself, this points at it rather than copying
it, so the two cannot drift apart.

If you have never used Ansible, read
[`ansible-getting-started.md`](./ansible-getting-started.md) first — it
explains inventories, plays, handlers and facts from zero, and shows the
expected output of every command.

Design borrowed, with attribution, from
`C:\Workspace\RTJG-clients\jolfa-retail-gateway\ansible` (roles, Vault,
placeholder guards, bootstrap-before-hardening, edge rate limiting,
loopback-only Semaphore) and `C:\Workspace\verifywise\ansible` (`serial: 1`,
health gates, the `enable_ssl` flag).

---

## 0. The decision that shapes everything else

**Do not build on the server. Deploy the images CI already built.**

`.github/workflows/ci.yml` lints, typechecks, tests, builds, scans with Trivy
at CRITICAL/HIGH with `exit-code: 1`, and pushes two images to GHCR tagged
with both `latest` and the commit SHA:

```
ghcr.io/civitech-global/civitechglobal-api:<sha>
ghcr.io/civitech-global/civitechglobal-web:<sha>
```

Those immutable SHA tags are the release mechanism. Deploying them means:

- **A 2 GB server is enough.** A `npm ci` plus a Vite build peaks around
  1.5 GB and gets OOM-killed on a small box, in a way that reads as a
  mysterious npm crash. That never runs on the server.
- **A deploy is a pull**, measured in seconds.
- **Rollback is one variable:** `-e app_version=<previous sha>`.
- **What ships is exactly what CI tested and Trivy scanned.** A server-side
  `npm install` can resolve a different tree than CI saw; a pinned digest
  cannot.

Everything below assumes this.

---

> **No Telegram bot is deployed.** The company offers nothing Telegram-based,
> so the bot is not built by CI, not defined in either compose file and not
> started by these playbooks. Its source stays in
> `civitechglobal-server/src/bot/` — see the note in `docker-compose.yml` for
> what bringing it back would involve. The one Telegram left in this tree is
> the optional health-alert channel in `roles/monitoring`, which is internal
> operations tooling rather than a customer-facing service, and is a no-op
> while `vault_telegram_alert_*` stay empty.

## 1. Prerequisites

**Control machine.** Ansible has no native Windows control node. Use WSL2 —
`wsl --install -d Ubuntu` from an elevated PowerShell, reboot, then work
inside the Ubuntu shell. Install with `pipx install --include-deps ansible`.
Full walkthrough with expected output in
[`ansible-getting-started.md` §3](./ansible-getting-started.md).

**Server.** Ubuntu 24.04 LTS, ≥ 2 GB RAM, ≥ 20 GB disk, public IP, root SSH.
`ping.yml` checks the memory and warns if it is short. The roles are
Debian/Ubuntu only — they use `apt`, `ufw` and the Docker apt repository
throughout, and `ping.yml` says so rather than letting you find out three
tasks into `provision.yml`.

**DNS.** `civitechglobal.com` and `www` pointing at that IP. Not propagated
yet is fine — §5 has the HTTP-only path.

**An SMS account.** Kavenegar or SMS.ir, with an approved OTP template. Every
insurance request submitted from the website proves its phone number with a
one-time code before it is accepted — that number is what a specialist rings
back, and an unverified public form fills the queue with typos and worse. There
is no way to turn this off in production: `config/env.ts` refuses to start on
the console provider when `NODE_ENV=production`, and `deploy.yml` refuses to
deploy without credentials. Get the account before the deploy, not during it.

**Collections.**

```bash
cd civitech-deploy
ansible-galaxy collection install -r requirements.yml
```

---

## 2. What is in `civitech-deploy/`

```
civitech-deploy/
├── ansible.cfg                 pipelining + a persistent SSH control connection
├── requirements.yml            the three collections the roles use
├── inventory.example.ini       copy to inventory.ini (gitignored)
├── group_vars/all/
│   ├── main.yml                everything non-secret, one commented block per concern
│   └── vault.example.yml       copy to vault.yml, fill in, encrypt
└── roles/
    ├── common/     packages, app user, ufw, hardened SSH, fail2ban
    ├── docker/     engine + compose plugin from Docker's own apt repo
    ├── app/        the release: pull, migrate, start, health-gate
    ├── nginx/      reverse proxy, edge rate limits, TLS, maintenance page
    ├── backup/     nightly dump, off-host copy, pruning
    ├── monitoring/ systemd timer → Telegram alerts
    └── semaphore/  the web UI, on loopback
```

Ten playbooks sit at the top level:

| Playbook | What it does | When |
|---|---|---|
| `ping.yml` | Reachability, sudo, size and OS sanity | first, always |
| `bootstrap.yml` | Installs your SSH key and **proves** it works | before `provision.yml`, if still using a password |
| `provision.yml` | `common` + `docker` + `backup` | once, then whenever `group_vars` changes the base system |
| `deploy.yml` | The release | every deploy |
| `rollback.yml` | Puts a previous image back | when a deploy goes wrong |
| `nginx.yml` | Reverse proxy and TLS | after the first deploy, and on config changes |
| `backup.yml` | Re-installs the cron job; `-e run_now=true` dumps now | ad hoc |
| `monitoring.yml` | The health timer | once |
| `semaphore.yml` | Semaphore UI | once |
| `site.yml` | `provision` → `deploy` → `nginx` in order | a fresh server |

`ansible.cfg` is worth one note: `pipelining = True` plus
`ControlMaster=auto ControlPersist=15m`. Every task otherwise pays a full SSH
handshake; on a long-haul link that is the difference between a three-minute
and a twelve-minute run.

---

## 3. Configure it

Three files. Only one of them is a secret.

### `inventory.ini` — where the server is

```bash
cd civitech-deploy
cp inventory.example.ini inventory.ini
# replace every REPLACE_ME_*
```

Gitignored, so the customer's IP never lands in source control. It carries
`domain_name`, `domain_alias` and `certbot_email` — those three deliberately
have **no** entry in `group_vars/all/main.yml`, which is what makes the
inventory the right place for them. Everything else must be set in
`main.yml`, because `group_vars/all` outranks inventory group vars and a
value written in the wrong place is silently ignored.

### `group_vars/all/main.yml` — everything non-secret

Read it top to bottom once. The ones you will actually change:

- `registry_owner` — your GHCR org.
- `enable_ssl` — `false` until DNS resolves to the server.
- `backup_remote` — an rclone destination. **Empty means backups live on the
  machine they protect**, and both the role and the nightly job say so loudly
  every time they run.
- `sms_provider` — `kavenegar` or `smsir`. See the prerequisite above.
- `otp_ttl_seconds`, `otp_resend_cooldown_seconds`, `otp_max_attempts`,
  `phone_token_ttl_seconds` — the defaults (5 min, 60 s, 5 tries, 15 min) are
  sensible; the last one is how long a verified number stays usable to submit
  the form behind it, so raising it lengthens a long form's grace period and
  the window a stolen token is worth stealing in equal measure.
- `fail2ban_ignore_ips` — add your own address so three fat-fingered
  passwords cannot lock you out of your own server.

### `group_vars/all/vault.yml` — the secrets

```bash
cp group_vars/all/vault.example.yml group_vars/all/vault.yml
# generate each value:  openssl rand -hex 32
ansible-vault encrypt group_vars/all/vault.yml

echo 'your-vault-password' > ~/.civitech-vault-pass
chmod 600 ~/.civitech-vault-pass
```

`vault.yml` **is** committed — encrypted, which is how Semaphore and your
teammates get it. `~/.civitech-vault-pass` lives outside the repo and is
never committed. If `head -1 group_vars/all/vault.yml` does not start with
`$ANSIBLE_VAULT`, stop: `.github/workflows/secret-scan.yml` exists to catch
exactly that, and you would rather it never had to.

`deploy.yml` asserts, before touching anything, that no secret still reads
`REPLACE_ME`, that both JWT secrets are ≥ 32 characters, and that they differ
from each other — one secret signing both token types means a stolen
15-minute access token can be replayed as a 7-day refresh token. The failure
message tells you how to generate real ones, and `no_log: true` keeps the
values out of the output.

A second assertion covers the SMS gateway: `sms_provider` must be a real
provider, and `vault_sms_api_key` and `vault_sms_otp_template` must be set to
something other than their placeholders. A missing key would not stop the API
from starting — it would fail on the first applicant, one send at a time,
quietly. Catching it in the playbook means the running release keeps serving
instead.

---

## 4. The design decisions worth knowing

The files explain themselves task by task. These are the four choices that
shape the whole thing.

**Bootstrap before hardening.** `roles/common` sets `PasswordAuthentication
no`. If your key is not working when that task runs, the next connection
attempt is your last one and recovery means the VPS provider's web console.
So `bootstrap.yml` installs the key and then *proves* key auth works by
shelling out to `ssh -o BatchMode=yes -o PasswordAuthentication=no`, failing
loudly if it does not. Run it first, or accept the risk knowingly.

**Pull, then migrate, then start.** In `roles/app`, in that order, on purpose:

- A typo'd tag or an unreachable registry fails at the pull, while the old
  containers are still serving.
- A failed migration fails before anything restarts.
- Only once both succeed does the running stack change.

**The migration runs as its own compose service.** `docker-compose.yml`
defines a one-shot `migrate` service running `prisma migrate deploy` from the
same image as the API, and `api` declares
`depends_on: migrate: condition: service_completed_successfully`. `roles/app`
runs it explicitly anyway — letting `up` trigger it would mean a failed
migration aborts halfway through a stack restart instead of before one.

`migrate deploy`, never `migrate dev`: it applies committed migrations and
never generates, prompts, or resets.

**A dump before every migration.** Prisma migrations are forward-only — there
is no `migrate down`. `rollback.yml` can put the old image back; only that
dump can put the data back. `deploy.yml` takes it before migrating, and skips
it on the very first deploy when there is nothing to lose.

The corollary: **destructive migrations must ship in two releases.** Add the
new shape, move the reads, drop the old shape in a later deploy. Otherwise a
rollback puts old code in front of a schema it cannot read.

---

## 5. nginx, TLS, and what runs at the edge

`ansible-playbook nginx.yml`, or with `-e enable_ssl=false` while DNS is
still propagating — Let's Encrypt cannot issue for a bare IP, and certbot
fails when the domain does not resolve to the server. Re-run without the flag
once DNS is live.

The interesting parts of `roles/nginx/templates/civitech.conf.j2`:

**Edge rate limiting.** Two zones — `{{ nginx_api_rate }}` on `/api/` and a
much tighter `{{ nginx_auth_rate }}` with `burst=5 nodelay` on `/api/auth/`.
The application's own limiter is Redis-backed and correct; the point is that
every request it rejects has already been accepted, parsed, run through
`optionalAuth` (a database read whenever a token is present) and
round-tripped to Redis. nginx drops a flood before any of that, for
microseconds. The auth burst tolerates a human retyping a password while a
credential-stuffing run hits the wall immediately.

**Health checks are exempt from both layers.** `/api/health/live` and
`/api/health/ready` are unlimited and unlogged here, and the API registers
them before its own limiter in `src/app.ts`. A monitor that gets throttled is
a monitor that lies to you.

**Named upstreams with keepalive**, not a bare `proxy_pass`. Reusing the
backend connection removes a handshake per request, and it is the seam where
a second API replica goes. The app is stateless per request — JWT auth,
Redis-backed counters — so adding one is a line in that block.

**Security headers live in an include.** nginx inherits `add_header` into a
location *only* when that location declares none of its own, so a block that
sets a single `Cache-Control` silently serves no security headers at all. The
repo's own `civitechglobal-web/nginx.conf` documents having hit this. CSP is
deliberately *not* in the include — the web container sets it on the
responses it serves, and two owners for one header means two definitions that
drift.

**A maintenance page** on 502/503/504, in Persian and English. Without one, a
visitor during a deploy sees a bare nginx error, which reads as "the company
is gone" rather than "back shortly".

**HTTP/2** is enabled after certbot writes the TLS listener. certbot stops at
`listen 443 ssl`; HTTP/2 is one more directive and the largest latency win
available to an audience far from the server.

The role also checks that `certbot.timer` is active and warns if it is not —
a certificate that quietly stops renewing takes the site down ninety days
from now, on a day nobody is expecting it.

---

## 6. Backups that survive the host

The nightly job runs on the **host**, not as a container sidecar. The compose
`backup` service is kept in the base file (so a plain `docker compose up` on
a laptop still works) but disabled in production behind a
`sidecar-backup` profile, because:

- `deploy.yml` needs one command it can call before migrating, that works
  whether or not the stack is currently up;
- one schedule is easier to reason about than two, and running both would
  dump the same database twice a night into the same directory;
- the host job survives `docker compose down` — exactly when you are most
  likely to want a recent dump.

`pg_dump` itself runs *inside* the postgres container via `docker compose
exec`, so the host never needs a `postgresql-client` whose major version has
to be kept in step with the server's.

Three details in `roles/backup/templates/civitech-backup.sh.j2` that exist
because of how backups actually fail:

- It **checks `pg_isready` first** and exits non-zero, rather than writing a
  valid-looking empty gzip that nobody notices until the day they need it.
- It writes to `.partial` and moves into place **only on success**, so an
  interrupted dump never leaves a truncated file that looks like a backup.
- It **prunes after the off-host copy, never before** — a failed sync plus a
  successful prune loses data that was never copied anywhere.

The off-host copy uses `--max-age` across the whole retention window rather
than just tonight's file, so a remote that was unreachable last night catches
up tonight instead of leaving a permanent hole. When the copy fails it says
so loudly: an off-host copy that has been silently failing for a month is
indistinguishable from never having configured one.

### The part that is still yours

`backup_remote` is empty by default. Set it to an rclone destination and put
the rclone config where `rclone_config_src` points. Until you do, every dump
lives on the same disk as the database it protects, and a host loss takes
both.

### Restore, and the drill

```bash
gunzip -c /var/backups/civitech/civitechglobal_<ts>.sql.gz | \
  docker compose -f /opt/civitech/docker-compose.yml \
                 -f /opt/civitech/docker-compose.prod.yml \
    exec -T postgres psql -U civitech -d civitechglobal
```

**A backup you have not restored is a hypothesis.** Once a quarter, restore
the newest dump into a scratch database and count the rows — the script's
header has the exact commands. Write down the date and the count. That record
is the difference between having backups and knowing you do.

---

## 7. Rollback

```bash
ansible-playbook rollback.yml -e app_version=<previous sha> \
  --vault-password-file ~/.civitech-vault-pass
```

It refuses to run without an explicit target, and refuses to "roll back" to
the version already deployed. `/opt/civitech/DEPLOYED_VERSION` holds the
current SHA and the timestamp it went live.

**What it does not undo: database migrations.** If the release you are
rolling back *from* only added a column, the old code ignores it and
everything is fine. If it dropped or renamed one, the old code fails against
the new schema and a code rollback is not enough — restore the dump
`deploy.yml` took immediately before it migrated.

`migrate deploy` still runs on the way back through `roles/app`. That is
harmless: it applies pending migrations and is a no-op when there are none.
It cannot un-apply anything, which is the whole point of the paragraph above.

---

## 8. Monitoring

`ansible-playbook monitoring.yml` installs a systemd timer that checks both
health URLs and alerts to Telegram after two consecutive failures.

The two URLs fail for different reasons on purpose: one goes through nginx,
so it also catches a broken vhost or a stopped nginx; the other hits the API
container directly, so a failure there is unambiguously the app.
`/api/health/ready` probes Postgres *and* Redis and returns 503 when either
is down, so a 200 means genuinely serving rather than merely listening.

It alerts **once**, on the firing edge, and once again on recovery.
Re-alerting every two minutes about an outage everyone already knows about
trains people to mute the channel, which is worse than not alerting at all.

**Say the scope out loud so it does not become false confidence.** A checker
running on the server catches the *application* dying. It cannot tell you the
*machine* is gone — it would be gone too. Run the same script from a laptop,
or point a free uptime service at
`https://civitechglobal.com/api/health/live`, for that half. Both halves are
cheap; having only one is the mistake.

With no `vault_telegram_alert_*` set, the timer writes to
`/var/log/civitech/health.log` and nothing else. The role warns about it,
because a log file on the machine you are watching is a record, not a
monitor.

---

## 9. Semaphore UI

```bash
ansible-playbook semaphore.yml --vault-password-file ~/.civitech-vault-pass
```

It binds to `127.0.0.1:8888` and is **not** in the firewall's allow list
(22/80/443). Semaphore holds the SSH key to this server and the Ansible Vault
password; putting its login form on the public internet makes it the softest
target on the box, and everything these playbooks harden becomes irrelevant
if it falls. For contrast,
`C:\Workspace\verifywise\ansible\semaphore-compose.yml` publishes `8888:3000`
on all interfaces with the admin password committed in git — that is the
arrangement this one exists to avoid.

Reach it over a tunnel:

```bash
ssh -L 8888:127.0.0.1:8888 root@<server-ip>
# then open http://localhost:8888
```

### Wiring it up

Click-by-click detail with screenshots is in
[`ansible-semaphore-ui.md`](./ansible-semaphore-ui.md). The order:

1. **Key Store** — the deploy SSH private key (type: SSH Key), and the vault
   password (type: Login/Password, password field only).
2. **Repository** — this repo, branch `main`, via a read-only deploy key.
3. **Inventory** — type File, path `civitech-deploy/inventory.ini`, with the
   SSH key attached. Or paste it as Static if you would rather it never live
   in git.
4. **Environment** — non-secret extra vars as JSON.
5. **Task templates**, one per playbook:

| Template | Playbook | Notes |
|---|---|---|
| Ping | `civitech-deploy/ping.yml` | run this first |
| Provision | `civitech-deploy/provision.yml` | vault password required |
| **Deploy** | `civitech-deploy/deploy.yml` | survey variable `app_version`, required |
| nginx + TLS | `civitech-deploy/nginx.yml` | survey variable `enable_ssl` |
| Backup now | `civitech-deploy/backup.yml` | `-e run_now=true`; schedule it nightly |
| Rollback | `civitech-deploy/rollback.yml` | survey variable `app_version`, required |

The **survey variable** is what makes Semaphore worth installing: whoever
deploys picks the SHA from a form field instead of remembering
`-e app_version=...`, and every run is recorded with who ran it, what they
chose, and the full output.

Semaphore does not replace Ansible. If a playbook does not work from your
terminal it will not work here — it will just fail more colourfully. Get §10
working from WSL first.

---

## 10. First run, in order

```bash
cd civitech-deploy
export VP=~/.civitech-vault-pass

ansible-playbook ping.yml                                    # can we reach it?
ansible-playbook bootstrap.yml                               # key auth, proven
ansible-playbook provision.yml       --vault-password-file $VP
ansible-playbook nginx.yml -e enable_ssl=false               # if DNS isn't ready
ansible-playbook deploy.yml -e app_version=<sha> --vault-password-file $VP
ansible-playbook nginx.yml           --vault-password-file $VP   # now with TLS
ansible-playbook monitoring.yml      --vault-password-file $VP
ansible-playbook semaphore.yml       --vault-password-file $VP
```

Then verify from your laptop, not the server:

```bash
curl -sI https://civitechglobal.com | head -1
curl -s  https://civitechglobal.com/api/health/ready | jq
# {"success":true,"message":"API is ready","checks":{"database":true,"redis":true}}
```

Seed the first admin and the insurance catalog. The same script does both.
It only creates a `SUPER_ADMIN` when none exists, and it upserts the nine
categories and thirty-four products by slug — so it is safe to run twice, and
running it after every deploy is how a catalog change reaches production:

```bash
ssh root@<ip> 'cd /opt/civitech && docker compose \
  -f docker-compose.yml -f docker-compose.prod.yml \
  run --rm --entrypoint "" api npx tsx prisma/seed.ts'
```

Log in at `/admin` with the vault's `SEED_ADMIN_*` values, then change the
password.

The seed never deletes: a product dropped from the catalog is marked inactive
instead, because submitted requests reference it and an admin still has to be
able to read what someone asked for.

Then check the catalog actually landed, from your laptop:

```bash
curl -s https://civitechglobal.com/api/insurance/catalog | jq '[.data[] | {slug, products: (.products | length)}]'
```

### Dry runs

```bash
ansible-playbook deploy.yml -e app_version=<sha> --check --diff
```

`--check` makes no changes and `--diff` shows what would change in every
templated file. Some tasks are `command`-based and cannot be checked
meaningfully, which Ansible marks as skipped — that is expected, not a
failure.

---

## 11. Continuous delivery

Implemented in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) as the
`deploy` job, gated on the `docker` job and on a **GitHub Environment with
required reviewers** — so a merge to `main` *proposes* a deploy rather than
performing one. (CI renders `inventory.ini` from secrets, because the real one
is gitignored; see the workflow.)

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
          ansible-galaxy collection install -r requirements.yml
          echo "${{ secrets.ANSIBLE_VAULT_PASSWORD }}" > /tmp/vp
          chmod 600 /tmp/vp
          ansible-playbook deploy.yml \
            -e app_version=${{ github.sha }} \
            --vault-password-file /tmp/vp
```

`app_version=${{ github.sha }}` closes the loop: the images the `docker` job
just built and Trivy just scanned are precisely the ones that go live.

The `ansible-lint` job in the same workflow runs on every push and pull
request — a playbook is code, and it is the code that touches production:

```yaml
  ansible-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pipx install ansible-lint
      - run: ansible-lint civitech-deploy/
```

---

## 12. Day-2 operations

| Task | Command |
|---|---|
| What is live? | `ssh … 'cat /opt/civitech/DEPLOYED_VERSION'` |
| Deploy | `ansible-playbook deploy.yml -e app_version=<sha> --vault-password-file $VP` |
| Roll back | `ansible-playbook rollback.yml -e app_version=<previous sha> --vault-password-file $VP` |
| Logs | `docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api` |
| One request's trail | `docker compose logs api \| grep <x-request-id>` |
| Backup now | `ansible-playbook backup.yml -e run_now=true` |
| List backups | `ls -lh /var/backups/civitech/` |
| Health | `curl -s localhost:5000/api/health/ready \| jq` |
| Restart one service | `docker compose … restart api` |
| Rotate a secret | edit `vault.yml`, then re-run `deploy.yml` — it re-renders the env and recreates the containers |
| Force-logout a user | bump their `tokenVersion`; every access and refresh token they hold stops being trusted |
| Renew TLS by hand | `certbot renew --force-renewal && systemctl reload nginx` |
| Check the health timer | `systemctl list-timers \| grep civitech` |
| Read the ban list | `fail2ban-client status sshd` |

### Two failure modes worth rehearsing before they happen

**A deploy that comes up unhealthy.** `roles/app` polls
`/api/health/ready` twenty times at three-second intervals and fails the run
if it never returns 200 — but by then the new images are running. Read
`docker compose logs api` first: the readiness probe reports *which*
dependency failed (`checks.database` / `checks.redis`), which is usually the
whole answer. If it is not, roll back to the previous SHA and debug with the
site up.

**A migration you need to undo.** You cannot. Restore the dump `deploy.yml`
took immediately before migrating, then deploy the previous image. This is
why that backup exists and why it runs before the migration rather than after.

---

## 13. What this does not cover

Honest boundaries, so nothing here reads as more than it is:

- **One server.** No load balancer, no second API replica, no read replica.
  The `upstream` blocks and the stateless-JWT design mean adding one is a
  small change — but this does not do it.
- **No CDN.** §5 gets you TLS and HTTP/2 from a single origin. A CDN in front
  is the next latency win and is configuration outside this repo.
- **No metrics or log aggregation.** §8 gives up/down alerting, which is not
  observability. `C:\Workspace\verifywise\observability\` — Prometheus, Loki,
  provisioned Grafana, an OTel collector — is the template for when you want
  trends rather than incidents.
- **No secret rotation schedule.** The mechanism is one `deploy.yml` run;
  deciding how often is yours.
- **Debian/Ubuntu only.** The roles use `apt` and `ufw`. `ping.yml` warns on
  anything else rather than failing obscurely later.

---

*Companion to [`platform-review.md`](./platform-review.md). The playbooks live
in [`civitech-deploy/`](../civitech-deploy/).*
