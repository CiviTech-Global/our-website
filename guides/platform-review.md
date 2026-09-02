# Platform review — CiviTech Global

A layer-by-layer evaluation of this repository against thirteen production
concerns, followed by an analysis of how three sibling projects
(`verifywise`, `VerifyWise Analysis`, `jolfa-retail-gateway`) solve the
deployment problem with Ansible and Semaphore UI.

Reviewed at commit `3d0b3c5` on `main`, 2026-09-02.

Companion document: [`production-deployment.md`](./production-deployment.md)
— the complete deployment guide this review concludes you need.

---

## Scorecard

| # | Layer | Grade | One-line verdict |
|---|---|:---:|---|
| 1 | Front-end foundations | **A−** | Modern, split, i18n/RTL, tested — leaks source maps, ships TTF fonts, has no error boundary |
| 2 | API & backend logic | **A−** | Clean layering, validated, observable — unversioned, undocumented, `optionalAuth` on every route |
| 3 | Database & storage | **B+** | Sound schema and indexes — no migration step in the deploy path, PII in plaintext |
| 4 | Auth & permissions | **A** | Genuinely strong: rotation, hashed jti, `tokenVersion`, lockout — no reuse detection, no reset flow |
| 5 | Hosting & deployment | **D** | `civitech-deploy/deploy.yml` is an empty file. Nothing deploys. No TLS anywhere |
| 6 | Cloud & compute | **D** | No IaC, no resource limits, no sizing, no provider |
| 7 | CI/CD & version control | **B** | Excellent CI, **zero CD**, 27 unmerged Dependabot branches |
| 8 | Security & RLS | **B+** | Strong headers/scanning/redaction; row-level security is app-level only |
| 9 | Rate limiting | **A−** | Redis-backed, multi-tier, fails open, IPv6-safe — nothing at the edge |
| 10 | Caching & CDN | **C+** | nginx caching is correct and subtle; no CDN, no API caching, no HTTP/2, no brotli |
| 11 | Load balancing & scaling | **D+** | Architecturally ready to scale, operationally single-instance everywhere |
| 12 | Error tracking & logs | **B−** | Sentry + structured pino + PII redaction; no metrics, no aggregation, no alerts |
| 13 | Availability & recovery | **C−** | Backups exist but live on the machine they protect. No rollback, no monitoring |

**Overall: the application is built well ahead of the platform it runs on.**
Layers 1–4 and 8–9 are the work of someone who has thought carefully about
correctness and security. Layers 5–6 and 11–13 barely exist. The gap between
"the code is production-grade" and "this is running in production" is almost
entirely operational, and that is exactly the gap the three sibling repos
have already closed.

---

## 1. Front-end foundations

### What is there

React 19 + Vite 6 + TypeScript, Tailwind v4 via the official Vite plugin,
`react-router` 7, TanStack Query 5, `react-hook-form` + `zod` resolvers,
`framer-motion`. 76 source files, 12 test files under Vitest + Testing
Library + jsdom, with `@vitest/coverage-v8` wired up.

Things done right that are easy to get wrong:

- **Route-level code splitting.** Public pages load eagerly; every
  `/dashboard` and `/admin` page is `lazy()` behind a `Suspense` fallback
  (`src/App.tsx`). Admin code never reaches an anonymous visitor.
- **Deliberate vendor chunking.** `manualChunks` splits `vendor`, `query`
  and `motion` (`vite.config.ts:20`), so a React patch does not invalidate
  the Framer Motion chunk.
- **Query defaults are set, not left at library defaults.** `retry: 1`,
  `refetchOnWindowFocus: false`, `staleTime: 30_000` (`src/main.tsx:13`).
  Most projects never touch these and then wonder about the request storm.
- **Real i18n with RTL.** `LocaleProvider` plus `fa`/`en` dictionaries and
  its own test file — not a bolt-on.
- **`eslint-plugin-jsx-a11y` is installed and enforced**, which is more
  than most repos this size do.
- **Access token never touches storage.** `src/config/api.ts` keeps it in a
  module-level variable with an explicit comment about XSS. The refresh
  flow queues concurrent 401s behind a single in-flight refresh — a
  correct implementation of a pattern that is usually written wrong.

### Findings

| Sev | Finding |
|---|---|
| **High** | `build.sourcemap: true` (`vite.config.ts:17`) publishes full source maps to production. Your entire front-end source, including comments, is downloadable from `/assets/*.js.map`. Either set it to `false`, or set it to `'hidden'` and upload the maps to Sentry. |
| **Med** | **No error boundary anywhere.** `grep` for `ErrorBoundary`/`componentDidCatch` across `src/` returns nothing. A render-time throw in any component blanks the whole page with no recovery and no report. |
| **Med** | **No front-end error tracking.** Sentry is initialized in the API and the bot but not in the browser, so every client-side failure is invisible. |
| **Med** | **Fonts are TTF, not WOFF2.** Five Vazir faces totalling ~470 KB in `src/assets/fonts/`, all declared `format('truetype')` in `index.css`. WOFF2 typically cuts that by 50–70%; on a Persian-first site loading five weights this is the single largest render-blocking asset. Convert, subset to the Persian + Latin ranges you actually use, and drop the weights you never render. |
| **Low** | No bundle-size budget in CI — nothing fails when a chunk doubles. |
| **Low** | No end-to-end tests. Both sibling repos have Playwright; the login → admin → lead-detail path is never exercised as a whole. |

---

## 2. API & backend logic

### What is there

Express 5 with a clean four-layer separation — `routes/` → `controllers/` →
`services/` → `database/prisma/repositories/` — and validation as a
middleware boundary (`middleware/validate.ts` + `validators/*.schema.ts`
with zod). Responses are wrapped in a consistent `{ success, message, data,
meta? }` envelope that the front-end interceptor unwraps in one place.

Operationally mature details:

- `createApp()` is separated from `listen()` so tests can drive the app
  directly (`src/app.ts`).
- **Request IDs propagate.** `pinoHttp.genReqId` honours an inbound
  `x-request-id` and echoes it back on the response — the thing that makes
  a log line traceable across a proxy.
- **Split liveness and readiness.** `/api/health/live` answers unconditionally;
  `/api/health/ready` actually probes Postgres (`SELECT 1`) and Redis
  (`PING`) and returns 503 when either is down. Both are registered
  *before* `generalRateLimiter`, so an uptime monitor can never be
  throttled — a subtlety most codebases get wrong.
- **Graceful shutdown** with a 10s forced-exit backstop, plus
  `uncaughtException`/`unhandledRejection` handlers that log before dying.
- The Telegram bot is a **separate process** (Fastify + grammY) sharing the
  same Prisma/Redis config modules. Correct: a bot polling loop should not
  share an event loop with your API.

### Findings

| Sev | Finding |
|---|---|
| **Med** | **`optionalAuth` is mounted globally** (`app.ts:57`) before the health routes and all of `/api`. Every request carrying a Bearer token triggers a `userRepository.findUnique` — including on public endpoints like `GET /api/insurance/categories`. It is there so the rate limiter can key on `userId`, which is a good reason, but the cost is an unindexed-in-your-head DB round trip on every request. Cache the lookup in Redis for the token's 15-minute life, or accept the token claims for rate-limit keying and only hit the DB in `authenticate`. |
| **Med** | **No API versioning.** Routes mount at `/api/auth`, not `/api/v1/auth`. Jolfa uses `/api/v1` (`api_prefix` in its group_vars) precisely so a breaking change can ship beside the old shape. Adding the prefix later means coordinating a front-end deploy; adding it now costs one line. |
| **Med** | **Every error goes to Sentry, including 4xx.** `errorHandler` calls `Sentry.captureException(err)` before checking whether it is an `AppError` — so every "Invalid credentials" and every 404 consumes quota and buries real 500s. Gate it: `if (!(err instanceof AppError) \|\| err.statusCode >= 500)`. |
| **Low** | No OpenAPI/Swagger document. The API surface exists only as route files. |
| **Low** | No server-side request timeout. A slow Prisma query holds a connection until Postgres gives up. |
| **Low** | `/api/health/ready` is public and enumerates which dependency is down. Harmless, but it is free reconnaissance; consider returning a bare 503 to unauthenticated callers. |

---

## 3. Database & storage

### What is there

PostgreSQL 16 with Prisma 6. The schema (`prisma/schema.prisma`) is better
reasoned than most:

- **Every index earns its place**: `status`, `createdAt`, `deletedAt`,
  `assignedToId`, `phoneNumberHash` on `Lead`; `role`, `createdAt`,
  `deletedAt` on `User`; `userId` and `expiresAt` on `RefreshToken`.
- **Referential actions are chosen, not defaulted**: `Restrict` on a lead's
  category (you cannot delete a category out from under live leads),
  `SetNull` on the assignee (deleting an admin unassigns rather than
  deletes leads), `Cascade` on refresh tokens.
- **Hash columns are prepared for future encryption.** `User.emailHash` and
  `Lead.phoneNumberHash` exist so that every lookup path already goes
  through a deterministic key — meaning `email` can become ciphertext later
  without rewriting a single query. The rationale is written into the
  schema comments. This is genuinely forward-thinking design.
- Soft deletes via `deletedAt`, honoured in `authenticate`, `login`,
  `register` (which correctly *reactivates* a soft-deleted row rather than
  leaving the address permanently squatted) and `assignLead`.
- A backup sidecar (`Dockerfile.backup` + `scripts/backup-loop.sh`) taking
  daily `pg_dump | gzip` snapshots with 14-day pruning, pinned to
  `postgres:16-alpine` so `pg_dump` always matches the server major
  version — a footgun the author clearly hit before.

### Findings

| Sev | Finding |
|---|---|
| **Critical** | **Nothing applies migrations on deploy.** `Dockerfile` ends at `CMD ["node", "dist/index.js"]`; `docker-compose.yml` has no migrate step; no entrypoint script exists. A new release with a new migration starts against an old schema and fails at runtime. Jolfa runs `npx prisma migrate deploy` as an explicit ordered step (build → migrate → switch). You need the equivalent. |
| **High** | **Backups are stored on the machine they protect.** The `postgres_backups` volume lives on the same host and the same disk as `postgres_data`. Host loss, disk loss or a `docker volume prune` takes the database and all fourteen days of its backups together. Jolfa's `backup_remote` (rclone to off-box storage) is the missing half — and its backup role prints a loud warning when it is empty, precisely because this is the failure everyone discovers too late. |
| **High** | **No restore has ever been tested.** `scripts/backup-postgres.sh` documents the restore command, which is not the same as knowing it works. An untested backup is a hypothesis. |
| **Med** | `phoneNumberHash` is nullable with a non-unique index. Its stated purpose is "lookup/dedupe", but nothing enforces dedupe and nothing backfills it. Either make it required and unique-per-category, or drop the pretence. |
| **Med** | PII (`email`, `fullName`, `phoneNumber`, `city`, `notes`) is stored in plaintext. The logger redacts it thoroughly, which shows the sensitivity is understood — but a database dump exposes all of it. The `emailHash`/`phoneNumberHash` groundwork means field-level encryption is now a contained change; do it before the lead volume matters. |
| **Med** | No connection-pool bound. `.env.example` documents `?connection_limit=10&pool_timeout=20` but nothing sets it. Prisma's default is `num_cpus * 2 + 1` per process; run three API replicas on a 4-core box and you are asking Postgres for 27 connections against a default `max_connections` of 100 — fine now, not fine later. |
| **Low** | Only two migrations exist and there is no documented forward-only policy. Prisma has no `migrate down`; a destructive migration must ship in two releases (add shape → move reads → drop old shape). Jolfa writes this policy into `rollback.yml`'s header. Write yours down. |

---

## 4. Auth & permissions

**The strongest layer in the repository.** Reviewed specifically for the
mistakes that are usually present, and they are mostly absent.

### What is there

| Control | Implementation |
|---|---|
| Access token | HS256, 15 min, held **in memory only** in the browser |
| Refresh token | HS256, 7 days, `httpOnly` + `Secure` + `SameSite=strict` cookie |
| Refresh at rest | Only `sha256(jti)` is stored — a DB dump cannot be replayed |
| Rotation | Single-use; the old row is revoked before the new pair is issued |
| Global revocation | `User.tokenVersion`, checked on every `authenticate` and refresh |
| Password hashing | bcrypt, with a dedicated `passwordPolicy` module and tests |
| Enumeration | Unknown email, soft-deleted account and wrong password all take the same path and return the same message |
| Brute force | Redis counter, 5 failures → 15-minute lockout, keyed by normalized email |
| Weak secrets | `assertNotWeak` **throws at startup** in production if a JWT secret is under 32 chars — a warning in dev, fatal in prod |
| Cookie downgrade | `COOKIE_SECURE` is forced true whenever `NODE_ENV=production`, regardless of the env var |
| Authorization | Three-tier: `Role` enum → per-user `permissions[]` → named `AdminRole` bundles |
| Stale grants | `requirePermission` falls back to a fresh DB read merging user + `AdminRole` permissions, so a newly granted bundle works without re-login |
| Sensitive ops | `PATCH /admin/users/:id/role`, `/admin-role`, `/deactivate` are `SUPER_ADMIN` only, even though the router already allows `ADMIN` |

### Findings

| Sev | Finding |
|---|---|
| **High** | **No refresh-token reuse detection.** Presenting an already-revoked refresh token returns 401 and nothing else. That event is the signature of a stolen token being replayed — the correct response is to revoke the entire token family for that user (bump `tokenVersion`) and alert. You already have both mechanisms; you just do not connect them. This is a ~10-line change in `refreshTokens()` and it is the highest-value security fix available in the codebase. |
| **High** | **No password reset flow.** There is no way for a user who forgets their password to recover, and no way for you to force a rotation. The README's guidance for a locked-out admin is "delete that row from the database". |
| **Med** | `emailVerified` exists on the model and is never set or checked. Either build the verification flow or remove the field so it stops implying a guarantee. |
| **Med** | **Permission *revocation* lags by up to 15 minutes.** `requirePermission` refreshes from the DB when the token lacks a permission — the grant direction. It never re-checks when the token *has* one, so revoking a permission leaves the outstanding access token able to use it until expiry. Bumping `tokenVersion` on any permission change closes this and reuses machinery you already have. |
| **Low** | No MFA on `SUPER_ADMIN`. Given that role can change other users' roles, a TOTP second factor is proportionate. |
| **Low** | CSRF relies entirely on `SameSite=strict`. That is genuinely sufficient for modern browsers against `POST /api/auth/refresh`, and CORS is locked to a single origin — but it is one property away from being a problem, so record the reasoning. |

---

## 5. Hosting & deployment

### What is there

Docker Compose describing the full stack: `postgres`, `redis`, `api`, `bot`,
`web`, `backup`. Multi-stage Dockerfiles with a separate production-deps
stage, a non-root `app` user, and `HEALTHCHECK` instructions. The web image
serves the built SPA from nginx with a hand-tuned config. `depends_on` uses
`condition: service_healthy`, not the useless bare form.

### Findings

> **`civitech-deploy/deploy.yml` and `civitech-deploy/inventory.ini` are
> zero-byte files.** Only `ansible.cfg` (189 bytes) has content. The 2,069-line
> `guides/ansible-getting-started.md` describes a playbook in detail; that
> playbook does not exist on disk. **Nothing in this repository can deploy it.**

| Sev | Finding |
|---|---|
| **Critical** | The deploy playbook is an empty file (above). The guide is excellent and the implementation is absent. |
| **Critical** | **No TLS anywhere.** No certbot, no Let's Encrypt, no 443 listener. `nginx.conf` listens on 80 only. Helmet sets a 2-year HSTS header the site cannot honour. Both sibling repos solve this with a certbot task; Jolfa additionally handles the DNS-not-ready case with `-e enable_ssl=false`. |
| **Critical** | **The API and bot publish to all interfaces.** `ports: "5000:5000"` and `"4000:4000"` bind `0.0.0.0`. Postgres and Redis are correctly bound to `127.0.0.1` — the same care was not applied to the application ports, so on a public host anyone can bypass nginx and hit the API directly, defeating any edge protection you add later. Change to `127.0.0.1:5000:5000` / `127.0.0.1:4000:4000`. |
| **High** | No `docker-compose.prod.yml`. The single compose file mixes dev conveniences (published Postgres port, `latest`-style local builds) with production intent. VerifyWise layers `-f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod`; that separation is what lets you keep both honest. |
| **Med** | The web Dockerfile uses `npm install`, not `npm ci`, and `COPY . .`. The lockfile is the contract — `npm install` may silently resolve a different tree than CI tested. The server Dockerfiles have the same issue. |
| **Med** | No release/rollback concept. `docker compose up -d` with a rebuilt image has no previous version to return to. CI already pushes `ghcr.io/.../civitechglobal-api:${{ github.sha }}` — those immutable tags are the rollback mechanism you are not using. |
| **Low** | Compose has no `deploy.resources.limits`. Any one container can consume the whole host. |

---

## 6. Cloud & compute

Effectively nothing exists at this layer.

| Sev | Finding |
|---|---|
| **High** | No infrastructure-as-code. The server, its firewall, its users and its packages are undefined; whichever box you deploy to becomes a pet you cannot recreate. This is the same gap as layer 5 and the same fix — Jolfa's `roles/common` (packages, firewall, hardened SSH, fail2ban, the app user) is exactly this. |
| **Med** | No documented sizing. The stack is six containers including a Postgres and a Node build; Jolfa's `ping.yml` explicitly warns below 1.9 GB RAM because `npm ci` + a Vite build peaks around 1.5 GB and gets OOM-killed on a 1 GB box. You will build images rather than build on the box, which changes the number — but you have not written down what the number is. |
| **Med** | No resource limits or swap policy. |
| **Low** | No Kubernetes manifests. VerifyWise has a full `kubernetes/` tree with `base`/`dev`/`prod` kustomize overlays. That is the right destination *if* you outgrow one box — but for a single-site lead-capture app, one well-provisioned VPS with Ansible is the correct answer today, and the sibling repos agree: Jolfa chose Ansible + PM2 over the k8s it could have had. |

---

## 7. CI/CD & version control

### What is there

The CI is genuinely good and better than most commercial repos:

- **Two parallel jobs** (server, web), each running `npm ci` → `npm audit
  --audit-level=high` → lint → `tsc --noEmit` → test → build.
- **A Docker matrix job** gated on both, building all three images, scanning
  each with **Trivy at CRITICAL/HIGH with `exit-code: 1`** — the build
  actually fails on a vulnerable image rather than printing a report — and
  pushing to GHCR with both `:latest` and `:${{ github.sha }}` tags, only on
  `main`.
- **CodeQL** on push, PR, and a weekly cron (so newly-disclosed patterns are
  caught without a code change).
- **gitleaks** with `fetch-depth: 0`, scanning full history.
- **Dependabot** across five ecosystems including Docker base images and
  GitHub Actions, with dev-dependencies grouped.
- **Husky + lint-staged**, with a custom `scripts/eslint-subproject.mjs`
  that solves the real monorepo problem of running each subproject's own
  flat config with the right cwd.

### Findings

| Sev | Finding |
|---|---|
| **Critical** | **There is no CD.** `grep -n "deploy\|ansible\|ssh" .github/workflows/` returns nothing. Images are built, scanned and pushed to GHCR, and then nobody collects them. The pipeline stops one step short of being a pipeline. |
| **High** | **27 open Dependabot branches, none merged.** Including `prisma/client-7.9.1` and `ioredis-6.0.0` — major-version bumps that will only get harder. Dependabot without a merge habit is a queue that converts into a migration project. |
| **Med** | Only 7 commits, all on `main`, with one merged PR. There is no evidence of branch protection. If `main` is the deploy trigger, it needs required checks and no direct pushes. |
| **Med** | Coverage is collected (`@vitest/coverage-v8`) but no threshold is enforced. 12 test files across a 76-file front end and a 70-file server is thin — `auth.service`, `lead.service`, `admin.service` and the validators are covered; controllers, middleware and repositories are not. |
| **Med** | Ansible files are not linted. Once `civitech-deploy/` has content, add `ansible-lint` + `yamllint` to CI — a playbook is code, and it is the code that touches production. |
| **Low** | No tags, releases or changelog, so "which commit is live" has no answer. |

---

## 8. Security & row-level security

### What is there

- **helmet** with explicit HSTS (`maxAge: 63072000, includeSubDomains,
  preload`).
- **A real CSP** at nginx: `default-src 'self'`, `script-src 'self'` (no
  `unsafe-inline` on scripts), `frame-ancestors 'self'`, `base-uri 'self'`,
  `form-action 'self'`, plus `nosniff`, `X-Frame-Options`,
  `Referrer-Policy` and a `Permissions-Policy` denying camera/mic/geo.
- **The nginx `add_header` inheritance trap is handled.** A location block
  that declares any `add_header` inherits none from the server block — so
  the security headers are deliberately repeated inside `location =
  /index.html`, with a comment explaining why. Jolfa hit the same trap and
  solved it with an include file after shipping `/uploads/` without
  `nosniff`. Both repos learned it the hard way; yours learned it first.
- **Exceptional PII redaction.** `config/logger.ts` redacts ~30 paths —
  Telegram identifiers, lead names, phone numbers, city, free-text notes,
  emails, and both hash columns — with a comment explaining that Telegram
  IDs are PII *for this project specifically*. This is the most careful
  logging configuration in any of the four repositories.
- **Sentry receives the exception object only**, never `req` or user
  context, with a comment saying so.
- **CORS** locked to a single configured origin with credentials, explicit
  method and header allowlists.
- **No secrets in git.** `git ls-files | grep env` returns only
  `.env.example` files; both real `.env` files are ignored and confirmed
  untracked.
- Trivy + CodeQL + gitleaks in CI (layer 7).

### Row-level security

Implemented in `services/lead.service.ts` via a single `scopeWhere()`
helper: `SUPER_ADMIN` sees everything; every other principal sees only leads
assigned to them **or** unassigned. It is applied consistently across all
five entry points — `getAllLeads`, `getLeadById`, `updateLeadStatus`,
`assignLead`, `getLeadStats` — and `assignLead` additionally refuses to
assign to a deleted user, with a comment explaining that doing so would
"silently orphan it into a scope only SUPER_ADMIN can see". That is
someone reasoning about the *second-order* consequence of their own access
model, which is rare.

| Sev | Finding |
|---|---|
| **High** | **Row-level security is application-level only.** It is one forgotten `scopeWhere()` away from a data leak, and it is enforced in the service layer while the repositories underneath expose unscoped `findMany`/`count`. PostgreSQL RLS policies plus a per-request `SET LOCAL app.current_user_id` would make the database refuse to return out-of-scope rows regardless of what the application asks for. Given that the whole product is a lead pipeline where "which admin can see which lead" *is* the business rule, that defense in depth is worth the cost. |
| **High** | Combined with layer 5: **the API is reachable on port 5000 bypassing nginx entirely**, so every header and every CSP above can be sidestepped. |
| **Med** | **No audit log.** Nothing records who changed a lead's status, who reassigned it, or who granted a role. `updatedAt` tells you *when*, never *who*. VerifyWise ships a whole `CHANGE_HISTORY_IMPLEMENTATION_GUIDE.md` for this. For a system with delegated admin access, this is a compliance gap, not a nice-to-have. |
| **Med** | `style-src 'unsafe-inline'` in the CSP. Effectively unavoidable with Tailwind's runtime style injection, but it should be a recorded decision with a nonce-based path noted for later. |
| **Med** | HSTS is set by helmet on **API** responses. nginx serves the site and sets no HSTS, and there is no HTTPS to enforce anyway. Fix with layer 5's TLS work. |
| **Med** | No SSH hardening, no fail2ban, no firewall. Jolfa's `roles/common` does all three and its `group_vars` documents the exact trade-off it made on password auth — an explicit decision rather than a default. |
| **Low** | Source maps published (layer 1) hand an attacker your unminified source. |

---

## 9. Rate limiting

Second-strongest layer. `middleware/rateLimit.ts` gets the details right:

- **Redis-backed** via `rate-limit-redis` on the shared `ioredis` client, so
  limits hold across processes and replicas rather than per-process.
- **Three tiers with different shapes:** credentials 10 / 15 min with
  `skipSuccessfulRequests: true` (a legitimate user who logs in never spends
  budget); refresh 60 / 15 min because it fires on every app load; general
  300 / 15 min.
- **Keyed by `userId` when authenticated, IP otherwise** — which is the
  reason `optionalAuth` is global, and it falls back to `ipKeyGenerator()`
  rather than raw `req.ip`, so an IPv6 client cannot trivially rotate
  addresses within its own /64.
- **Fails open.** `passOnStoreError: true` on every limiter, with a comment
  explaining that a Redis outage must not become an API outage, and noting
  that the shared client still logs the outage so it stays visible.
- `app.set('trust proxy', 1)` so `req.ip` is the client, not the proxy.
- The bot's webhook has its own Redis limiter (300/60s, also fail-open).
- Separately, a Redis-backed **account lockout** (5 failures → 15 min)
  layered *on top of* the credential rate limit — two different controls
  against two different attack shapes.

| Sev | Finding |
|---|---|
| **High** | **No edge rate limiting.** Every request, including a flood, must reach Node, be parsed, hit `optionalAuth`, and round-trip to Redis before being rejected. nginx `limit_req_zone` costs microseconds and drops the flood before it becomes your problem. Jolfa's `jolfa.conf.j2` runs two zones — `20r/s` general, `1r/s burst=5 nodelay` on auth paths — explicitly because "nginx sees every request before PM2 splits them across workers, so this is the layer that actually holds". Copy that. |
| **Med** | `trust proxy: 1` is correct for exactly one proxy hop. Behind Cloudflare *and* nginx it becomes wrong and every client shares one bucket. Pin it to your actual topology when you add TLS/CDN. |
| **Low** | Admin mutations (`PATCH /admin/users/:id/role`) sit under the general 300/15min bucket only. |

---

## 10. Caching & CDN

`nginx.conf` is small and correct: gzip at level 5 over sensible types,
`expires 1y` + `immutable` on the fingerprinted `/assets/`, `no-cache` on
`/index.html` with a comment about never letting a stale app shell survive a
deploy, and the `add_header` inheritance fix discussed in layer 8.

| Sev | Finding |
|---|---|
| **High** | **No CDN and no HTTP/2.** nginx listens on 80 only, so every asset is HTTP/1.1 from a single origin. For a Persian-first site whose users are likely far from the server, this is the largest available latency win and it arrives free with TLS. |
| **Med** | **Redis is used only for rate limits and lockout.** `GET /api/insurance/categories` is public, unauthenticated, and near-static, and it hits Postgres on every request. Cache it. The dashboard stats query runs six `count()` calls in parallel per load — also cacheable. |
| **Med** | **No caching semantics on API responses.** No `ETag`, no `Cache-Control`, no 304s. TanStack Query's 30s `staleTime` masks this client-side but does nothing for a cold load. |
| **Med** | No brotli. `gzip` only; brotli typically saves another 15–20% on JS. |
| **Low** | Fonts are not preloaded and are served as TTF (layer 1) — two compounding penalties on the same critical-path asset. |

---

## 11. Load balancing & scaling

**The good news:** the application is *architecturally* ready. Auth is
stateless JWT with no server-side session store; rate-limit and lockout
counters live in Redis rather than process memory; the bot runs as its own
process. You could run five API replicas tomorrow and nothing would break.

**The bad news:** nothing does. One `api`, one `bot`, one `web`, one
`postgres`, one `redis`, on one host, with no `replicas`, no upstream pool,
and no autoscaling. `nginx.conf` does `proxy_pass http://api:5000/api/` —
a direct single-service reference with no `upstream` block and therefore no
keepalive connection reuse, no health-based ejection, and nowhere to add a
second backend.

| Sev | Finding |
|---|---|
| **High** | Every component is a single point of failure. The `api` container restarting drops every in-flight request. |
| **Med** | No `upstream` block in nginx. Jolfa's has `upstream jolfa_api { server ...; keepalive 32; }` with `proxy_http_version 1.1` and `Connection ""` — keepalive to the backend alone measurably cuts latency, and it is the seam you need to add a second replica. |
| **Med** | Postgres has no connection-pool ceiling (layer 3), which is precisely the thing that bites when you add API replicas. Set it before you scale, not after. |
| **Low** | Bot admin notifications fan out inline in the request path with no queue. Fine at current volume; it is the first thing to move to a job queue. |
| **Low** | No read replicas, no partitioning, no archival policy for `leads`. |

---

## 12. Error tracking & logs

Sentry is initialized in both processes, gated on a DSN so it is a clean
no-op when unset, with a comment explaining that they are separate processes
each needing its own `init`. Logging is structured pino, JSON in production
and pretty in development, with request IDs and the PII redaction described
in layer 8. Fatal handlers log before exiting.

| Sev | Finding |
|---|---|
| **High** | **No metrics at all.** No `/metrics`, no Prometheus, no request-rate/latency/error-rate series. You can read what happened in a log; you cannot see a trend or set a threshold. VerifyWise runs a full `observability/` stack — Prometheus, Loki, Grafana with provisioned dashboards, and an OpenTelemetry collector. That is the reference implementation sitting on your own disk. |
| **High** | **No log aggregation or rotation.** Logs go to container stdout and live and die with the container. `docker logs` is your entire investigation toolkit, and it is bounded by the default json-file driver. |
| **High** | **No alerting.** Nothing tells you the site is down; you find out when someone messages you. Jolfa installs a systemd timer that curls both `/health` (through nginx) and the API directly — different failures, deliberately — alerts to Telegram after 2 consecutive failures, and its playbook header states plainly that an on-server check catches the *app* dying and cannot catch the *machine* dying. |
| **Med** | Front-end errors are invisible (layer 1). |
| **Med** | Sentry noise from 4xx (layer 2). |
| **Low** | No distributed tracing across web → api → bot. |

---

## 13. Availability & recovery

### What is there

`restart: unless-stopped` on every service; `HEALTHCHECK` in all three
Dockerfiles; a real readiness probe that checks both dependencies; graceful
shutdown draining in-flight requests; and a daily backup sidecar with
14-day retention and a documented restore path for both direct and
`docker exec` connections.

### Findings

| Sev | Finding |
|---|---|
| **Critical** | **Backups do not survive the host** (layer 3). This is the finding that turns a bad day into the end of the business. |
| **Critical** | **No rollback path.** A bad deploy leaves you rebuilding under pressure. You already push immutable `:${sha}` images to GHCR; pinning a tag in a prod compose file makes rollback a one-line change. Jolfa's symlink-flip achieves the same for a native install, and its `rollback.yml` waits for `/health` to return 200 before declaring success. |
| **High** | **No uptime monitoring** (layer 12). |
| **High** | No stated RPO/RTO. With daily backups your RPO is silently 24 hours. Is that acceptable for lead data that arrives all day? If not, the answer is WAL archiving or hourly dumps — but it must be a decision. |
| **Med** | No maintenance page. A 502 during a deploy shows the visitor an nginx error. Jolfa serves a rendered `maintenance.html` on `502 503 504`. |
| **Med** | No documented restore drill and no incident runbook. |
| **Low** | Single-region, single-host, no DR site. Proportionate today — but say so in writing, so it is a choice. |

---

# Part II — What the sibling repositories do

Three repositories on this machine have already solved the deployment
problem, at three different levels of maturity. Read them in this order.

## `C:\Workspace\verifywise` — the minimum viable Ansible

**Shape:** four flat playbooks, no roles.

```
ansible/
├── install.yml            # first deploy
├── update.yml             # rolling update, serial: 1
├── nginx.yml              # reverse proxy + certbot
├── group_vars/all.yml     # non-secret vars
├── templates/{.env.j2, verifywise-nginx.conf.j2}
├── inventory.example.ini  # inventory.ini is gitignored
└── semaphore-compose.yml  # Semaphore, standalone
```

**Ideas worth stealing:**

- **Secrets are generated, never written down.** `install.yml` opens with a
  `set_fact` that mints eight secrets via `lookup('password', '/dev/null
  length=64 chars=hexdigits')` — DB password, JWT secret, refresh secret,
  encryption key, service-to-service keys. Nobody ever chooses a password;
  no placeholder can ship.
- **The update playbook preserves them.** `update.yml` `slurp`s the existing
  `.env.prod` off the server and `regex_search`es each value back out before
  re-rendering the template. Config changes propagate; secrets do not
  churn. This is the elegant half of the design.
- **`serial: 1`** on update — one server at a time, so a multi-host
  inventory never goes fully dark.
- **Compose-command detection.** A shell probe picks `docker compose` vs
  `docker-compose` rather than assuming, because the servers are not
  uniform.
- **A health gate ends every run**: `uri` against `/health` with
  `retries: 24, delay: 5`. The playbook does not report success until the
  app answers.
- **TLS is a flag.** `nginx.yml -e ssl=false` uses the raw IP as
  `server_name` and skips certbot, because Let's Encrypt cannot issue for a
  bare IP and DNS is often not ready on day one.

**Weaknesses — do not copy these:**

- `semaphore-compose.yml` publishes `8888:3000` on **all interfaces** with
  `SEMAPHORE_ADMIN_PASSWORD: changeme_admin_password` committed in git.
  Semaphore holds the SSH key to your servers; that is the softest possible
  target, exposed with a known password.
- No Ansible Vault at all.
- No firewall, no SSH hardening, no fail2ban, no backups, no rollback.
- `install.yml` regenerates secrets on every run, so re-running it against a
  live server would rotate the DB password out from under the database.

## `C:\Workspace\VerifyWise Analysis` — the documentation pattern

Not code: a 30-file beginner's guide to deploying VerifyWise, structured as
numbered directories.

```
00-before-you-start/  01-prepare-control-machine/  02-prepare-target-server/
03-configure-ansible/ 04-deploy-verifywise/        05-setup-nginx-ssl/
06-semaphore-ui/      07-day-2-operations/         08-reference/
```

**The structure is the lesson.** It separates *concepts* (Part 0), *one-time
setup* (Parts 1–3), *the deploy* (Parts 4–5), *the UI layer* (Part 6),
*ongoing operations* (Part 7) and *copy-paste reference* (Part 8). Part 6
alone is seven files — install, first login, create project, add inventory
and keys, create templates, run first job, schedule updates — because that
is genuinely seven distinct things a first-timer has to get right.

Two details worth imitating:

- **It states the reader's situation in the first paragraph**: Windows 11
  laptop, a test server with a root password, a domain, no Ansible
  experience. Everything downstream is calibrated to that person.
- **It documents known breakage.** "The current VerifyWise backend may not
  expose a dedicated `/health` endpoint, so the install playbook's health
  check can fail even when the app is fine." A guide that admits where the
  code is wrong is worth ten that pretend otherwise.

Its `08-reference/` directory is a set of complete, fillable files —
`inventory.ini`, `group_vars-all.yml`, `env.prod.example`,
`verifywise-nginx.conf`, `semaphore-compose.yml` — so the reader never has
to reassemble a file from prose.

## `C:\Workspace\RTJG-clients\jolfa-retail-gateway` — the production reference

**This is the one to model.** Seven roles, ten playbooks, Vault, and 31
documentation files mirroring the VerifyWise Analysis structure.

```
ansible/
├── ansible.cfg
├── ping.yml  bootstrap.yml  provision.yml  deploy.yml
├── nginx.yml  backup.yml  monitoring.yml  rollback.yml
├── semaphore.yml  site.yml
├── group_vars/all/{main.yml, vault.yml, vault.example.yml}
└── roles/{common, postgresql, nodejs, app, nginx, backup, monitoring, semaphore}
```

### The ideas that matter

**1. `bootstrap.yml` exists so you cannot lock yourself out.**
`roles/common` sets `PasswordAuthentication no`. If your key is not working
when that task runs, your next connection attempt is your last one and
recovery means the VPS provider's web console. So `bootstrap.yml` installs
the key, then *proves* key auth works by shelling out to `ssh -o
BatchMode=yes -o PasswordAuthentication=no` and failing loudly if it does
not. That is defensive playbook design.

**2. Deploys refuse to run on placeholders.** `deploy.yml`'s `pre_tasks`
assert that `git_repo` does not start with `REPLACE_ME`, that
`vault_jwt_secret` is set, does not start with `REPLACE_ME`, and is ≥ 32
characters — with `no_log: true` and a `fail_msg` explaining that "a shipped
placeholder JWT secret means anyone who reads this repository can mint an
admin token."

**3. Ordering is a documented decision.** `roles/app/tasks/main.yml` opens
with: *build first, migrate second, switch last* — because a TypeScript
error must abort while the database is still untouched. And `deploy.yml`
takes a **backup before migrating**, because Prisma migrations are
forward-only: `rollback.yml` can restore the code, but only that dump can
restore the data.

**4. Releases are immutable directories, rollback is a symlink.**

```
/var/www/jolfa/
├── current -> releases/20260901-104500
├── releases/{20260901-104500, 20260831-221000, ...}   # newest 5 kept
└── shared/{Jolfa-Server/.env, Jolfa-web/.env.production, uploads/}
```

`rollback.yml` lists releases newest-first, skips the current one, **verifies
the target actually has a compiled `dist/`** before switching (a release that
died mid-build is not a rollback target), flips the symlink, reloads PM2,
and polls `/health` until 200.

**5. It grep-checks its own build output.** After `npm run build`, a task
runs `grep -rlF "{{ frontend_api_base_url }}" dist/assets/` — because Vite
inlines the API URL at build time, and a bundle baked against `localhost`
compiles cleanly and then fails in every visitor's browser. It calls this
"the single most expensive deploy mistake available here." **This applies
directly to your `VITE_API_URL`.**

**6. Rate limiting is layered, and the reason is written down.**
`group_vars` explains that `@fastify/rate-limit` counts per worker, so with
`pm2_instances: 2` the effective limit is double — therefore nginx runs the
real ceiling with `limit_req_zone` at `20r/s` general and `1r/s burst=5
nodelay` on `/auth/`. *(Your Redis-backed limiter does not have the
per-worker problem — but you still want the edge layer, for the reason in
layer 9.)*

**7. Semaphore is treated as a high-value target.** Bound to
`127.0.0.1:8888` only, deliberately **not** opened in the firewall, admin
password from Vault, and the role's final task prints the SSH tunnel command
with a comment: *"Semaphore holds the SSH key and the vault password for
this server; exposing its login form to the internet makes it the softest
target on the box."* This is the exact opposite of VerifyWise's setup, and
Jolfa is right.

**8. `ansible.cfg` is tuned for the actual network.** `pipelining = True`
plus `ControlMaster=auto ControlPersist=15m` with a comment: on a link to an
Iranian VPS at 150ms+ RTT, this is the difference between a 3-minute and a
12-minute deploy.

**9. `ping.yml` is a sizing check.** It reports vCPU/RAM/disk and warns below
1.9 GB because `npm ci` + a Vite build peaks near 1.5 GB and gets OOM-killed,
"which reads as a mysterious npm crash."

**10. Scope notes prevent false confidence.** `monitoring.yml`'s header
states that an on-server checker catches the *application* dying, not the
*machine* dying — "it would be gone too."

### Comparison

| | verifywise | jolfa | **our-website** |
|---|---|---|---|
| Playbooks | 4 flat | 10 + 7 roles | **1, empty** |
| Runtime | Docker Compose | Native + PM2 | Docker Compose |
| Secrets | Generated per run | Ansible Vault | *n/a* |
| Vault | ✗ | ✓ | ✗ |
| Placeholder guards | ✗ | ✓ `assert` | ✗ |
| Bootstrap-before-hardening | ✗ | ✓ | ✗ |
| Firewall / SSH hardening / fail2ban | ✗ | ✓ | ✗ |
| TLS | certbot | certbot + `enable_ssl` flag | ✗ |
| Edge rate limiting | ✗ | ✓ two zones | ✗ |
| Releases + rollback | ✗ | ✓ symlink | ✗ |
| Backups | ✗ | ✓ nightly + off-box | ✓ local only |
| Health gate on deploy | ✓ | ✓ | ✗ |
| Monitoring + alerts | ✗ | ✓ systemd timer → Telegram | ✗ |
| Semaphore exposure | **0.0.0.0, git password** | 127.0.0.1 + Vault | *n/a* |
| Deployment docs | external, 30 files | in-repo, 31 files | 2 guides, 3,394 lines |

**Your documentation is already strong** — `guides/ansible-getting-started.md`
is more pedagogically careful than either sibling, showing expected output
for every command. The problem is precisely inverted from VerifyWise's: they
have playbooks with thin docs; you have excellent docs with no playbooks.

---

# Part III — Prioritized roadmap

Ordered by (risk removed) ÷ (effort). Everything in P0 is under a day each.

### P0 — This week

Applied on branch `hardening/p0-critical-fixes` (see the status column). The
findings above are left as written, describing the state at the reviewed
commit — this table is the record of what has since changed.

| # | Action | Layer | Status |
|---|---|---|---|
| 1 | Bind `api`, `bot` and `web` to `127.0.0.1` in compose | 5, 8 | **done** |
| 2 | Set `build.sourcemap: false` | 1 | **done** |
| 3 | Add a `prisma migrate deploy` step to the deploy path | 3 | **done** — one-shot `migrate` service; `api`/`bot` gate on `service_completed_successfully`. `prisma` moved to prod dependencies so the runtime image can run it |
| 4 | Gate Sentry to `statusCode >= 500` | 2, 12 | **done** — JWT expiry/format errors excluded too |
| 5 | Revoke the token family on refresh-token reuse | 4 | **done** — plus 3 tests |
| 6 | Copy backups off-box (rclone/S3) | 3, 13 | **half** — the sidecar now ships `rclone` and copies every dump to `BACKUP_REMOTE`, warning loudly on each cycle while it is unset. **Choosing the destination is yours.** |
| 7 | Merge the 27 Dependabot PRs | 7 | **open** — GitHub-side |

Also folded in while touching the same files: all three Dockerfiles now use
`npm ci` rather than `npm install` (layer 5, Medium), so a deploy cannot
resolve a different dependency tree than CI tested.

### P1 — This month

| # | Action | Layer |
|---|---|---|
| 8 | **Write the Ansible playbooks** — see [`production-deployment.md`](./production-deployment.md) | 5, 6 |
| 9 | TLS via certbot, with an `enable_ssl` flag for the DNS-not-ready case | 5, 8, 10 |
| 10 | `docker-compose.prod.yml` pinning `ghcr.io/...:${sha}` — rollback becomes one line | 5, 13 |
| 11 | nginx `limit_req_zone` at the edge (general + auth), plus an `upstream` block with keepalive | 9, 11 |
| 12 | Uptime monitoring with alerts (systemd timer → Telegram) | 12, 13 |
| 13 | Password reset + email verification | 4 |
| 14 | Front-end error boundary + browser Sentry | 1, 12 |
| 15 | CD: a GitHub Actions job that triggers the deploy on `main`, behind an environment approval | 7 |
| 16 | Convert fonts to WOFF2 and subset them | 1, 10 |

### P2 — This quarter

| # | Action | Layer |
|---|---|---|
| 17 | PostgreSQL RLS policies as defense in depth under `scopeWhere()` | 8 |
| 18 | Audit log table for lead and role mutations | 8 |
| 19 | Prometheus metrics + Grafana + Loki (VerifyWise's `observability/` is the template) | 12 |
| 20 | Field-level encryption for PII — the hash columns already make this contained | 3, 8 |
| 21 | Redis caching for `/insurance/categories` and dashboard stats | 10 |
| 22 | CDN + HTTP/2 + brotli | 10 |
| 23 | Playwright E2E on the login → admin → lead path; coverage threshold in CI | 1, 7 |
| 24 | A second API replica behind the new upstream block | 11 |
| 25 | Documented restore drill, RPO/RTO, incident runbook | 13 |

---

*Reviewed 2026-09-02 against commit `3d0b3c5`.*
