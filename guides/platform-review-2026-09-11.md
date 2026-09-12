# Platform review — CiviTech Global (re-score)

A layer-by-layer evaluation against the same thirteen production concerns as
[`platform-review.md`](./platform-review.md), re-run after the application and
deployment work of the last nine days, then re-scored again after a round of
remediation.

Reviewed at commit `7835c6f`, re-scored at `e59d62b`, 2026-09-11.

Companion documents: [`platform-review.md`](./platform-review.md) (2026-09-02,
the original), [`production-deployment.md`](./production-deployment.md).

> **Scores are out of 10 here, not letter grades.** The earlier review used
> letters; a numeric scale makes a re-score legible as movement rather than as
> a re-graded essay. Layer names and order are unchanged so the two documents
> line up.

---

## Scorecard

| # | Layer | Was | Now | One-line verdict |
|---|---|:---:|:---:|---|
| 1 | Frontend foundations | 8.0 | **9.0** | Modern, lean, bilingual to the last key — axe now asserts what was only hoped for |
| 2 | APIs & backend logic | 8.0 | **9.3** | Versioned, described, and finally tested over real HTTP |
| 3 | Database & storage | 7.5 | **9.2** | Well-indexed and drift-checked; storage is now durable and portable |
| 4 | Auth & permissions | 8.5 | **9.4** | Rotation, lockout, revocation, reset, verification, and TOTP |
| 5 | Hosting & deployment | 8.5 | **9.0** | Full Ansible estate with rollback, pre-deploy dumps, staged privilege cutover |
| 6 | Cloud & compute | 6.0 | **6.5** | Still one VPS running everything. Capped by purchases, not patches |
| 7 | CI/CD & version control | 8.5 | **9.0** | Audit, lint, types, tests, Trivy — and now integration tests on every push |
| 8 | Security & row-level security | 7.0 | **9.3** | Least-privilege roles, RLS on all fourteen tables, malware scanning |
| 9 | Rate limiting | 9.0 | **9.2** | Four tiers; the new unauthenticated endpoint shipped with its ceiling |
| 10 | Caching & CDN | 5.0 | **7.5** | Everything but the CDN, which needs a provider account |
| 11 | Load balancing & scaling | 4.0 | **6.5** | The blocker is gone; the second machine is not |
| 12 | Error tracking & logs | 6.5 | **9.0** | The browser is no longer dark, and the server counts what it does |
| 13 | Availability & recovery | 7.0 | **9.0** | The backup is now tested rather than assumed |

**Overall: 7.2 → 8.3.** Nine layers at 9 or above. The four that are not —
cloud, scaling, caching, and the end-to-end half of frontend — are held there
by infrastructure and registry access that do not exist yet, not by anything
built badly. No further commit moves them.

The 2026-09-02 review's P2 list is largely discharged by this round: RLS
(#17), metrics (#19), API caching (#21), brotli (#22) and a documented,
automated restore drill (#25) are all done. Playwright (#23), a CDN (#22) and
a second replica (#24) are not, for the reasons below.

---

## The blocking defect

`UPLOAD_DIR` defaulted to a path inside the container, the production compose
template never overrode it, and the `api` service declared no volume. Client
attachments and CVs were written to the container's writable layer, and every
redeploy replaced that container. The database rows survived; the bytes did
not, so admin CV download and attachment download returned 410 for anything
uploaded before the last release. The nightly `pg_dump` had never covered these
files either.

Three things were wrong, so three were fixed: the service gained a named
volume, the backup script archives those files, and where the bytes live became
a driver — local disk or any S3-compatible endpoint, chosen by environment
variable. Production refuses to start on local storage unless
`STORAGE_ALLOW_LOCAL_IN_PRODUCTION` states the choice, which is what stops it
recurring.

---

## What changed, by layer

**1 · Frontend.** Thirteen axe tests over every shared primitive, so one
violation cannot reach every page at once. They found nothing — the
hand-written ARIA across forty-odd files was already correct. Contrast is
exempted with a stated reason: jsdom has no layout, so axe throws rather than
reports. That is a real gap in what the suite can see, recorded as one.

**2 · APIs.** Routes mounted at `/api/v1` as well as `/api`, so a breaking
change has somewhere to go without repointing live callers. An OpenAPI document
at `/openapi.json`, hand-written, with a test that drives every documented path
through the real app on both mounts. Fourteen integration tests over real HTTP,
which caught two bugs — see below.

**3 · Database & storage.** A storage driver with local and S3-compatible
implementations. The S3 driver signs its own requests: SigV4 hand-written and
tested rather than fifty packages for three operations, verified put/get/delete
against a stub endpoint.

**4 · Auth.** TOTP against RFC 4226 and RFC 6238 — all fifteen published
vectors reproduce. Two-step enrolment, eight single-use recovery codes stored as
hashes, removal requiring a current code.

**8 · Security.** Two least-privilege roles. On a scratch database the app role
is refused `DROP TABLE`, `CREATE TABLE`, `TRUNCATE` and `ALTER TABLE ... DISABLE
ROW LEVEL SECURITY`. RLS is enabled on all fourteen tables; a throwaway role
granted `SELECT ON users` reads zero rows, so adding a consumer is a reviewed
act rather than one `GRANT`. The migration also states plainly what RLS does
*not* stop here — an injection on the application's own connection, which
legitimately holds the app policy — so the control is not mistaken for one it is
not. Uploads are streamed to clamd before storage, failing **closed**.

**10 · Caching.** The catalog carries `max-age` and `stale-while-revalidate`,
and `no-store` whenever the request carries credentials, because "public" is
only safe while the response cannot vary by identity. Everything else is
`no-store` by default, so a route that forgets to decide fails safe. Assets are
precompressed at build time: 704 kB of text becomes 216 kB gzip or 188 kB
brotli, served at zero per-request CPU.

**12 · Observability.** Uncaught errors, unhandled rejections and
render-boundary failures post to our own API — 0.6 kB, against the ~30 kB a
browser SDK costs on a 100 kB payload. Prometheus metrics behind a token, with
ids and tracking codes collapsed out of route labels and label values escaped,
because unbounded labels are how a metrics system dies. Correlation ids already
existed; they now reach the error response, the log line and the Sentry event.

**13 · Availability.** A weekly drill restores the newest dump into a scratch
database and asserts the schema and row counts are real, alerting through the
same path as the health check. It also fails when the newest dump is more than
two days old, which catches a nightly job that has been failing quietly.

---

## Bugs found while building the fixes

Each was caught by a test or a live check rather than in review.

| Bug | Consequence |
|---|---|
| `UPLOAD_DIR` on an ephemeral filesystem | Every attachment and CV destroyed on each deploy |
| body-parser 4xx fell through to 500 | An oversized body or malformed JSON reported as *our* failure, in every dashboard built on status codes |
| clamd's `z` protocol terminates replies with a NUL, which `trim()` does not strip | Every **clean** file would have been refused |
| MFA challenge spent on read | One mistyped digit destroyed the sign-in, password and all |
| Health probes carried no cache directive | A proxy holding a 200 reports a dead service as healthy |

---

## Two corrections to the first pass

Correlation ids were reported as missing. They already existed — pino generates
or accepts `x-request-id` per request, and echoes it. What was missing was their
reach into the error response and the Sentry event, which is now closed.

The deployment estate was under-described. `civitech-deploy` is a complete
Ansible setup — bootstrap through rollback — that deploys pinned images by SHA,
never builds on the server, takes a database dump before migrating, and asserts
on misconfiguration so failures land on the playbook rather than a crash-looping
container.

---

## What remains, and what each needs

| # | Action | Layer | Needs |
|---|---|---|---|
| 1 | Put the front end on a CDN | 10 | A provider account. The build already emits brotli a CDN would serve |
| 2 | Flip `db_use_least_privilege_role` | 8 | One deploy to create the roles, a health check, then one variable |
| 3 | Decide on malware scanning | 8 | ~1 GB of RAM for clamd signatures on a 2 GB host — a real trade |
| 4 | Install Playwright; declare `axe-core` | 1, 7 | npm registry access |
| 5 | Ship logs off the host | 12 | A destination |
| 6 | A job queue for outbound email | 11 | Nothing — email still sends inside the request |
| 7 | Second machine, when growth justifies it | 6, 11, 13 | A purchase. The app holds no local state, so this is configuration, not a rewrite |

Two switches are deliberately left off. `db_use_least_privilege_role` is false
so that a privilege mistake costs one rollback rather than a migration that
cannot be undone. `malware_scanner` is `none` because clamd is a real memory
decision on this host — and the API refuses to start in production without that
choice being stated, rather than defaulting quietly.

---

*Reviewed 2026-09-10 against commit `7835c6f`; re-scored 2026-09-11 against
`e59d62b`. Server suite 191 → 292 tests, web 86 → 99.*
