# Setup & Migration Guide — RETT Opportunities Database

Everything you need to run this app on a **fresh machine** after `git clone`.

> **You can hand this file to Claude Code.** After cloning, just say:
> _"Read SETUP.md and get the app running locally."_
> (There's an explicit step-by-step for the AI at the bottom.)

---

## TL;DR

```bash
git clone https://github.com/BrookHavenTax/rett-opportunities-ui.git
cd rett-opportunities-ui
npm install
npm run dev          # → http://localhost:3000
```

That's it. **No database to install** — on first load the app spins up an
in-memory MongoDB and seeds 50 sample listings automatically.

---

## Prerequisites

| Need | Notes |
| --- | --- |
| **Node.js 20+** (22 LTS recommended) | Check with `node -v`. A `.nvmrc` is included — run `nvm use` if you use nvm. |
| **npm 9+** | Ships with Node. |
| **git** | To clone. |
| **Internet (first run only)** | `npm install` hits the npm registry, and the in-memory MongoDB downloads a binary **once** (~a few hundred MB, then cached). After that you can work offline. |

No MongoDB, Docker, or any other service needs to be installed for local dev.

---

## What's different about this project (the stuff `git clone` won't tell you)

1. **No database setup.** Local dev needs **no MongoDB**. When `MONGODB_URI` is
   unset (or `=memory`), the app boots an in-memory MongoDB **replica set** and
   **seeds 50 sample listings** (30 active / 12 new / 8 sold) on the first request.

2. **The in-memory DB is ephemeral.** It **resets every time you restart** the
   dev server and re-seeds on the next boot. That's expected locally. For
   persistent data, point `MONGODB_URI` at a real MongoDB — see _Production_.

3. **`.env.local` is NOT in the repo** (it's gitignored, for secrets). Local dev
   works fine **without it**. To be explicit or to use a real DB, copy the
   template: `cp .env.example .env.local`.

4. **First run downloads a MongoDB binary** (via `mongodb-memory-server`). It's a
   one-time download, cached under `~/.cache/mongodb-binaries/` (macOS/Linux).
   Needs internet that first time; the first `npm run dev` can take ~10–60s.

5. **Some files are generated, not cloned:** `node_modules/` (run `npm install`),
   `.next/`, `next-env.d.ts` (Next creates it on the first `dev`/`build`), and
   `tsconfig.tsbuildinfo`. **Don't run `npm run typecheck` before the first
   `npm run dev` or `npm run build`** — `next-env.d.ts` won't exist yet.

---

## Step-by-step

```bash
# 1. Clone and enter
git clone https://github.com/BrookHavenTax/rett-opportunities-ui.git
cd rett-opportunities-ui

# 2. (optional) match the Node version
nvm use                      # reads .nvmrc (Node 22)

# 3. Install dependencies
npm install

# 4. (optional) create your local env file
cp .env.example .env.local   # then leave MONGODB_URI blank, or set it to: memory

# 5. Run it
npm run dev                  # http://localhost:3000
# or, to match the preview config in .claude/launch.json:
npm run dev -- -p 3100       # http://localhost:3100
```

Open **http://localhost:3000/listings** — you should see 50 listings, filters,
stat cards, and the table. The import tool is at **/admin**.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server (in-memory DB auto-seeds; first boot downloads the Mongo binary) |
| `npm run build` | Production build |
| `npm start` | Run the production build (needs a real `MONGODB_URI`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (run only **after** a first `dev`/`build`) |
| `npm run seed` | Wipe + re-seed the configured database |

**Green bar before any commit:** `npm run typecheck && npm run lint && npm run build`.

---

## Production (later — not needed for local dev)

The in-memory fallback is **dev-only**. For a real deployment:

1. Set environment variables on the host:
   - `MONGODB_URI` → a real MongoDB Atlas connection string (**required** in prod)
   - `NEXT_PUBLIC_APP_URL` → e.g. `https://portal.brookhaven.us`
   - `ADMIN_SECRET` → optional shared secret guarding `POST /api/import`
2. `npm run build && npm start` (or deploy to Vercel / a Node host).
3. Seed or import data: `npm run seed`, or upload the monthly Excel via `/admin`.

See **`.claude/handoff.md`** (current state + remaining work) and **`CLAUDE.md`**
(architecture, invariants, conventions) for the full picture.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Port 3000 is in use` | `npm run dev -- -p 3001`, or kill the process on that port. |
| First boot hangs on "downloading mongodb…" | One-time binary download — wait it out (needs internet). |
| Offline and first run fails | The Mongo binary needs internet **once**. After it's cached, offline works. |
| `tsc`/typecheck complains about `next-env.d.ts` | Run `npm run dev` or `npm run build` once first — it generates that file. |
| Data "disappeared" after restart | Expected: the in-memory DB resets on restart. Use a real `MONGODB_URI` to persist. |
| Want a clean re-seed | `npm run seed` (wipes + reinserts the 50 sample listings). |

---

## For an AI assistant (Claude Code) setting this up

If you've been asked to set up and start this project locally, do exactly this:

1. **Check Node:** `node -v` (need ≥ 20; if `nvm` is present, `nvm use` reads `.nvmrc`).
2. **Install:** `npm install` from the repo root.
3. **Start the dev server in the background** on port 3100:
   `PORT=3100 npm run dev` — run it in the background. The **first** boot
   downloads a MongoDB binary and seeds the DB, so allow up to ~90s.
4. **Verify it's actually healthy** (don't trust the "Ready" line alone — the
   first HTTP request is what triggers the DB boot + seed):
   - `curl -s http://localhost:3100/api/stats` → expect
     `{"total":50,"active":30,"new":12,"sold":8}`
   - `curl -s "http://localhost:3100/api/listings?status=active&limit=1"` → a listing
5. **Report** the app is live at `http://localhost:3100/listings` (admin import at `/admin`).

Important notes for the agent:
- **Do not** run `npm run typecheck` before the first `dev`/`build` — `next-env.d.ts`
  is generated then, and tsc will otherwise error on a fresh clone.
- **No** MongoDB install and **no** `.env.local` are required for local dev (the
  in-memory fallback handles it). Only set `MONGODB_URI` for a real/persistent DB.
- Read **`CLAUDE.md`** (invariants + conventions) and **`.claude/handoff.md`**
  (current state) before making changes. Keep the green bar
  (`npm run typecheck && npm run lint && npm run build`) before any commit.
