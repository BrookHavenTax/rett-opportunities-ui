# Handoff — Capital-Gains Outreach (BrookHaven)

_Last updated: 2026-07-01. Single source of truth for the project's current state._
_(Repo/routes are still named `rett-*` / `/listings` / `Listing` internally; the
domain is **capital-gains outreach leads**.)_

## Current state: DEPLOYED TO PRODUCTION on EC2 — live & verified

Public URL: **http://3.15.178.38:3000** (HTTP, port 3000). Running under PM2,
backed by a local MongoDB single-node replica set. 661 real leads loaded from the
Marketing Deliverable sheet. Green bar (typecheck + lint + prod build) passing.

### Production infrastructure (EC2)

- **Instance:** `i-0d0695b25d66487e8`, Ubuntu 26.04, kernel `7.0.0-1006-aws`,
  ~908 MB RAM, 2 vCPU. Public IP `3.15.178.38`, private `172.31.38.92`.
  SSH: `ssh -i <rett-database-website.pem> ubuntu@3.15.178.38`.
- **App:** `/home/ubuntu/rett-app`, Node v22, built with `npm ci && npm run build`,
  served by `pm2 start npm --name rett -- start` (Next `start`, binds 0.0.0.0:3000).
  PM2 boot-persistence enabled (`systemctl is-enabled pm2-ubuntu` → enabled;
  `pm2 save` done). Restart on crash is automatic.
- **Database:** MongoDB 8.0.26, local only (`bindIp 127.0.0.1`, replSet `rs0`,
  wiredTiger cache 0.25 GB). Auto-starts on boot (`systemctl enable mongod`).
  Single-node RS is initiated → transactions work (import runs its txn path).
- **`.env.local` (prod, on box, NOT in git):**
  `MONGODB_URI=mongodb://127.0.0.1:27017/rett?replicaSet=rs0`,
  `NEXT_PUBLIC_APP_URL=http://3.15.178.38:3000`. **`ADMIN_SECRET` intentionally
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

## Ops runbook

- **Deploy a code change:** from the Mac repo,
  `rsync -rlptz --exclude node_modules --exclude .next --exclude .git --exclude .env.local -e "ssh -i <pem>" ./ ubuntu@3.15.178.38:/home/ubuntu/rett-app/`,
  then on the box: `cd ~/rett-app && npm ci` (only if deps changed) `&& npm run build && pm2 restart rett && pm2 save`.
- **Import new monthly sheet:** use the website **Import Excel** button (Listings →
  Import). It cross-references and upserts; existing notes/assignees are safe.
- **Logs:** `pm2 logs rett`; Mongo: `sudo tail -f /var/log/mongodb/mongod.log`.
- **Health:** `curl localhost:3000/api/stats`; `pm2 list`; `systemctl is-active mongod`.
- **Mongo shell:** `mongosh` (localhost). RS status: `mongosh --eval 'rs.status().myState'` (1 = PRIMARY).

## What's left (prioritized)

1. **Rotate the SSH key** — `rett-database-website.pem` was pasted in chat; treat as
   exposed. Create a new key pair, add to the instance, remove the old one.
2. **Access control decision** — port 3000 is open per the "coworkers from any
   network, no login" requirement. That exposes real owner PII to anyone who finds
   the IP. Options when ready: a single shared password via an nginx reverse proxy
   (no per-user accounts, ~5 min), a VPN, or real staff-portal SSO. No app change
   needed for the nginx-password option.
3. **HTTPS** — currently plain HTTP. Add a domain + TLS (Caddy/nginx + Let's Encrypt)
   so credentials/PII aren't sent in the clear.
4. **Backups** — schedule `mongodump` (cron) off-box; the data is currently only on
   the single EBS volume.
5. **Monitoring** — disk/mem alerts (the box is small; watch PM2 + Mongo logs and
   disk usage).

## Gotchas

- MongoDB will not start without the `GLIBC_TUNABLES` override (see above).
- The box is small (~908 MB RAM). The build relies on the 4 GB swap; keep it.
- In-memory dev DB is per-process (dev only; prod uses the real Mongo).
- `next dev` uses webpack on Next 14 (fine). On Next 16 use `--webpack`.
