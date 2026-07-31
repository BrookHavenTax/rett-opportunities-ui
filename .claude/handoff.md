# Handoff — Capital-Gains Outreach (BrookHaven)

_Last updated: 2026-07-30. Single source of truth for the project's current state._
_(Repo/routes are still named `rett-*` / `/listings` / `Listing` internally; the
domain is **capital-gains outreach leads**.)_

## Current state: DEPLOYED TO PRODUCTION on EC2 — live & verified

Public URL: **https://3-15-178-38.sslip.io** (HTTPS via nginx + Let's Encrypt → app
on 3000; HTTP :80 301-redirects to HTTPS — note the redirect is keyed on the
`sslip.io` server_name, so hitting the bare IP over HTTP correctly 404s on
certbot's catch-all). Running under PM2, backed by a local MongoDB single-node
replica set. **1,178 real leads** live (S 5 / A 55 / B 211 / C 907) after
subsequent Marketing Deliverable imports. Green bar (typecheck + lint + prod
build) passing.

**Deployed commit: `469d78b`** ("Security: patch reachable dependency advisories"),
shipped 2026-07-30. Cert valid to 2026-09-29.
_(Requires inbound security-group rules for TCP 80 **and 443**. Port 3000 can be
closed — nginx is the single entry point.)_

### Production infrastructure (EC2)

- **Instance:** `i-0d0695b25d66487e8`, Ubuntu 26.04, kernel `7.0.0-1006-aws`,
  ~908 MB RAM, 2 vCPU. Public IP `3.15.178.38`, private `172.31.38.92`.
  SSH: `ssh -i <rett-database-website.pem> ubuntu@3.15.178.38`.
- **App:** `/home/ubuntu/rett-app`, Node v22, built with `npm ci && npm run build`,
  served by `pm2 start npm --name rett -- start` (Next `start`, binds 0.0.0.0:3000).
  PM2 boot-persistence enabled (`systemctl is-enabled pm2-ubuntu` → enabled;
  `pm2 save` done). Restart on crash is automatic.
- **Reverse proxy + TLS:** nginx proxies to `127.0.0.1:3000`
  (`/etc/nginx/sites-available/rett`, default site removed). `client_max_body_size
  25m` so the .xlsx import isn't blocked. Enabled on boot. **HTTPS** via Let's
  Encrypt (certbot `--nginx`) for `3-15-178-38.sslip.io` — a free public DNS that
  maps to the IP (LE won't issue for bare IPs or `amazonaws.com` names). Cert in
  `/etc/letsencrypt/live/3-15-178-38.sslip.io/`; **auto-renews** via `certbot.timer`
  (dry-run verified). Port 80 stays open for the ACME renewal challenge + the
  HTTP→HTTPS redirect. A shared-password (basic auth) can be added here later.
- **Database:** MongoDB 8.0.26, local only (`bindIp 127.0.0.1`, replSet `rs0`,
  wiredTiger cache 0.25 GB). Auto-starts on boot (`systemctl enable mongod`).
  Single-node RS is initiated → transactions work (import runs its txn path).
- **`.env.local` (prod, on box, NOT in git):**
  `MONGODB_URI=mongodb://127.0.0.1:27017/rett?replicaSet=rs0`,
  `NEXT_PUBLIC_APP_URL=https://3-15-178-38.sslip.io` (matches the HTTPS host). **`ADMIN_SECRET` intentionally
  unset** so the browser Import button works (no secret a browser could hold).
- **Disk:** EBS grown 8 GB → **30 GB** (was 100% full and crashed mongod; now ~30%
  used). **Swap: 4 GB** (`/swapfile` + `/swapfile2`, both in `/etc/fstab`).

### Critical fix — MongoDB on kernel 6.19+ (SERVER-121912)

Ubuntu 26.04's kernel enables Intel CET/Shadow-Stacks by default, which crashes
MongoDB 8.0 (and it hard-refuses to start). **Fix:** a per-process systemd
override disables shadow stacks for mongod only —
`/etc/systemd/system/mongod.service.d/override.conf`:
```
[Service]
Environment=GLIBC_TUNABLES=glibc.cpu.hwcaps=-SHSTK
```
No reboot, no kernel downgrade. If MongoDB is ever reinstalled/upgraded, re-apply
this override or mongod will not start.

### What works (verified live on prod, 2026-07-01)

- **/listings** — grade stat cards (Total 661 / S 4 / A 43 / B 145 / C 469),
  full-text search, filter pills (grade/state/gain-sort/listed price/LTV/years/loan
  status/outreached), server-side sort, pagination, CSV export. URL is source of truth.
- **Detail drawer + /listings/[id]** — metrics, owner contact, financials, extra
  fields, outreached dropdown, notes thread.
- **/admin** — .xlsx import with result summary + import history.
- **Import (the key requirement)** — POST .xlsx to `/api/import`; upsert by
  (`ownerName` + `address`). Verified on prod: first import **661 added**; re-import
  of the same file **0 added / 661 updated, 4 blank-grade rows flagged (not lost)** —
  **assignee (outreachedBy) and notes/comments PRESERVED**, lead data refreshed.
  Unknown columns are captured verbatim into `extra` (future sheets just work).
- **Stats cache** — `/api/stats` memoizes counts for 5 min; the import route now
  **invalidates the cache on every import** (`lib/statsCache.ts`), so the cards
  update immediately after an import instead of showing a stale value.

## Dependency security posture (triaged 2026-07-30)

GitHub reported 37 Dependabot alerts. Counted by *reachability from the public
request path* rather than raw volume, almost all are noise. What matters:

**Patched and shipped (`469d78b`):**

| Package | Change | Advisories | Reachability |
|---|---|---|---|
| `mongoose` | 8.24.0 → 8.24.2 | GHSA-664h-wqgq-64gw | Runtime, but **not directly exploitable** — see below |
| `postcss` | 8.5.15 → 8.5.25 | GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849 | Build-time only |
| `brace-expansion` | 1.1.15/2.1.1/5.0.6 → 1.1.18/2.1.4/5.0.9 | GHSA-3jxr-9vmj-r5cp | Dev toolchain |
| `glob` | 10.3.10 → 10.5.0 | GHSA-5j98-mcp5-4vw2 | Dev toolchain (advisory is the glob **CLI**, never invoked) |
| `js-yaml` | 4.2.0 → 4.3.0 | GHSA-52cp-r559-cp3m | Dev toolchain (eslint config parsing) |

The mongoose prototype-pollution advisory needs an attacker-controlled
`__proto__`-prefixed dotted path to reach update casting. **No route allows
that**: every mutation zod-validates the body and then builds an explicit
`$set` from fixed keys (`app/api/listings/[id]/route.ts`), and the import
pipeline's unknown columns land in an `extra: [{label,value}]` **array**, never
as object paths (invariant #4 is what protects this). Probed live with four
`__proto__`/`constructor.prototype` payloads: rejected 400 or silently
stripped, no pollution. The bump is defense-in-depth.

postcss is build-time only — it appears under `next/dist/build/`, never
`next/dist/server/`. `next start` does not run it, so no attacker CSS reaches
it. The `"postcss": "$postcss"` override collapses next's pinned 8.4.31 into
our 8.5.25; **emitted CSS is byte-identical** before/after (verified by hash).

**`package.json` `overrides` — why they exist.** Scoped per major
(`brace-expansion@1`, `glob@10`, …) so no consumer is forced onto a breaking
major. Do not "simplify" them to bare package names: `brace-expansion` 5.x
changes `require()` from a function to an object and breaks every `minimatch`
in the tree. Verified `npm ci` reproduces them on the box's npm 10.

**Deliberately still open:**

- **`next` 14.2.35 — 21 advisories, no fix available on the 14.x line.** Every
  one is first patched in 15.5.x or 16.x; 14.2.35 is the last 14.x release, so
  the branch is EOL for security backports. Most are unreachable here anyway —
  the app has **no middleware, no Server Actions, no `next/image`, no
  rewrites/redirects/i18n, no `pages/`, and every API route pins
  `runtime = 'nodejs'`** — which rules out the middleware-bypass, Server-Action,
  Image-Optimizer, rewrite-SSRF and Edge-payload classes outright. What *is*
  plausibly reachable is the RSC/App-Router set: DoS via RSC request
  deserialization (GHSA-h25m-26qc-wcjf, GHSA-q4gf-8mx6-v5v3, GHSA-8h8q-6873-q5fj)
  and RSC response cache confusion/poisoning (GHSA-68g3-v927-f742,
  GHSA-4633-3j49-mh5q, GHSA-wfc6-r584-vfw7). On an unauthenticated public app
  serving real PII, the DoS ones are the practical risk. **Fix = upgrade to Next
  15.5.22** (see "What's left" #1). Not bundled here: a major bump on a 908 MB
  box needs its own build + verify cycle.
- **`uuid` <11.1.1 (GHSA-w5hq-g745-h8pq) — unreachable.** The flaw needs v3/v5/v6
  with a `buf` argument; exceljs calls `uuidv4()` with no arguments, in the
  conditional-formatting **write** path, and this app only ever *reads* .xlsx.
  The only npm-offered "fix" is exceljs@3.4.0 — a **downgrade**. Ignore it.
- **`brace-expansion` GHSA-mh99-v99m-4gvg on the 1.x/2.x lines — no upstream
  fix.** The sole patch is 5.0.8, and 5.x is API-breaking for minimatch. Not
  reachable: the only runtime path is exceljs → archiver → readdir-glob, and
  archiver is the xlsx *writer*, which this app never calls. Note this one
  advisory makes `npm audit` fan out to ~22 entries because it has no fix —
  that number is an artifact, not a regression.

## Ops runbook

- **Deploy a code change** (the box is rsync-deployed — there is **no git repo** on
  it, so the Mac working tree is the deploy source; `git pull` locally first):
  1. Green bar on the Mac **before** shipping: `npm run typecheck && npm run lint && npm run build`.
  2. Rollback snapshot on the box (`.next` is the live serving artifact — a failed
     rebuild would otherwise leave prod serving a half-written build):
     `cd ~/rett-app && rm -rf .next.prev && cp -a .next .next.prev`.
  3. `rsync -rlptz --exclude node_modules --exclude .next --exclude .git --exclude .env.local --exclude .claude --exclude tsconfig.tsbuildinfo -e "ssh -i <pem>" ./ ubuntu@3.15.178.38:/home/ubuntu/rett-app/`
     — dry-run it first with `--dry-run --itemize-changes`. Excluding `.env.local`
     is what protects prod's DB URI; excluding `tsconfig.tsbuildinfo` keeps the
     Mac's incremental-tsc cache from poisoning the box's type check.
  4. On the box: `cd ~/rett-app && npm ci` (**only** if package-lock changed — if
     rsync didn't transfer it, skip) `&& npm run build && pm2 restart rett --update-env && pm2 save`.
  5. Smoke: loopback `/api/stats`, `/listings`, `/admin`, `/api/listings`, then
     public HTTPS on all three + `/api/export`. Confirm the lead total is unchanged.
  - **Rollback:** `rm -rf .next && mv .next.prev .next && pm2 restart rett`, then
    re-rsync from the previous commit. Exactly one snapshot is kept (step 2 clears
    the prior one), so this costs ~92 MB steady-state.
- **Import new monthly sheet:** use the website **Import Excel** button (Listings →
  Import). It cross-references and upserts; existing notes/assignees are safe.
- **nginx:** config at `/etc/nginx/sites-available/rett`; after edits
  `sudo nginx -t && sudo systemctl reload nginx`. Access logs in `/var/log/nginx/`.
- **Logs:** `pm2 logs rett`; Mongo: `sudo tail -f /var/log/mongodb/mongod.log`.
- **Health:** `curl localhost:3000/api/stats`; `pm2 list`; `systemctl is-active mongod`.
- **Mongo shell:** `mongosh` (localhost). RS status: `mongosh --eval 'rs.status().myState'` (1 = PRIMARY).

## What's left (prioritized)

1. **Upgrade Next 14.2.35 → 15.5.22** (own session). This is the only way to close
   the 21 `next` advisories — there is no 14.x patch. Scope: App Router 14→15 is a
   moderate migration; the breaking changes that touch this repo are (a) `params`
   in dynamic routes becomes a Promise — affects `app/api/listings/[id]/route.ts`,
   both comments routes, and `app/listings/[id]/page.tsx`; (b)
   `experimental.serverComponentsExternalPackages` moves to the stable
   `serverExternalPackages` key in `next.config.mjs` (mongoose/exceljs depend on
   it); (c) fetch/route-handler caching stops defaulting to cached — the API routes
   already set `dynamic = 'force-dynamic'`, so that one should be a no-op. Also
   bump `eslint-config-next` in lockstep (that clears the glob/@next-plugin
   alerts). **Build on the box needs watching: 908 MB RAM + 4 GB swap**, and the
   Next 15 build is heavier than 14 — take the `.next.prev` snapshot first and be
   ready to roll back. Do NOT jump to 16: it wants a newer toolchain and
   `next dev --webpack` handling, which is a bigger change than the security need
   justifies. 15.5.22 patches every currently-open advisory.
2. **Rotate the SSH key** — `rett-database-website.pem` was pasted in chat; treat as
   exposed. Create a new key pair, add to the instance, remove the old one.
3. **Access control decision** — port 3000 is open per the "coworkers from any
   network, no login" requirement. That exposes real owner PII to anyone who finds
   the IP. Options when ready: a single shared password via an nginx reverse proxy
   (no per-user accounts, ~5 min), a VPN, or real staff-portal SSO. No app change
   needed for the nginx-password option.
4. **HTTPS is on** (sslip.io + Let's Encrypt, auto-renewing). Optional upgrade:
   point a branded `leads.brookhaven.us` A-record at the IP and reissue the cert
   (`certbot --nginx -d leads.brookhaven.us`) for a company URL.
5. **Backups** — schedule `mongodump` (cron) off-box; the data is currently only on
   the single EBS volume.
6. **Monitoring** — disk/mem alerts (the box is small; watch PM2 + Mongo logs and
   disk usage).
7. **Import: header named `constructor` is silently dropped** (minor, found
   2026-07-30). `HEADER_FIELD[norm(label)]` in `lib/importPipeline.ts` is a plain
   object literal, so a column header normalizing to `constructor` resolves to
   `Object.prototype.constructor` — truthy — and takes the "known field" branch
   instead of being captured into `extra`, violating invariant #4 for that one
   column. Not a security issue (it's a `Map` set, nothing writes to a prototype;
   `__proto__` normalizes to `proto` and is unaffected). Fix: `Object.create(null)`
   for the map or an `Object.prototype.hasOwnProperty.call` guard, plus a
   regression test.

## Gotchas

- MongoDB will not start without the `GLIBC_TUNABLES` override (see above).
- The box is small (~908 MB RAM). The build relies on the 4 GB swap; keep it.
- In-memory dev DB is per-process (dev only; prod uses the real Mongo).
- `next dev` uses webpack on Next 14 (fine). On Next 16 use `--webpack`.
