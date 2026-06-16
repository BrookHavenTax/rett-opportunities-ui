# CLAUDE.md — RETT Opportunities Database

Project-specific instructions and state for this repo. See `.claude/handoff.md` for
the live "current state" snapshot.

## What this is

Internal Next.js 14 web app for Brookhaven staff to browse/filter/search RETT
opportunity listings, with a monthly Excel import pipeline. Stack: Next.js 14 App
Router, TypeScript strict, Tailwind, shadcn/ui, TanStack Table v8, MongoDB/Mongoose,
zod, exceljs, papaparse.

## Phase status

- **Phase 1 complete (built & verified):** full data model, API layer, import
  pipeline, all pages (listings + drawer + permalink + admin), filtering/search/sort,
  CSV export, 50-listing seed. Typecheck + lint + production build all green.
  Verified in the running app (desktop + responsive) and via API/pipeline tests.
- **Not yet done:** real MongoDB Atlas connection, staff-portal SSO/auth wiring,
  production deploy, v2 candidates (map view, per-listing email alerts).

## How to run / test

```bash
npm run dev          # in-memory DB auto-seeds 50 listings — no setup needed
npm run typecheck    # tsc --noEmit (strict)
npm run lint         # eslint
npm run build        # production build
npm run seed         # reseed the configured DB (uses MONGODB_URI or in-memory)
```

Local dev needs **no database**: `MONGODB_URI=memory` (in `.env.local`) boots an
in-memory replica set and seeds on first boot.

## Critical invariants (do not break)

1. **URL is the single source of truth** for filter/search/sort/pagination state.
   `lib/filters.ts` owns `parseFilters` / `serializeFilters` / `filtersToApiQuery` /
   `deriveActiveChips`. `ListingsView` derives `filters` from `useSearchParams()` and
   updates via `router.push` — never store filter state independently of the URL.
2. **Profit & profit% are computed in MongoDB** (`lib/query.ts` `$addFields`), so
   they can be filtered/sorted server-side. Don't sort the table client-side
   (TanStack is configured `manualSorting`).
3. **`mlsNumber` is a unique *sparse* index.** Anything inserting a listing without an
   MLS number must leave the field **unset** (not `""`). Seed + importPipeline comply.
4. **Import is one transaction** (`lib/importPipeline.ts`): archive sold → insert new →
   write `ImportRun`. Invalid rows are collected & skipped; empty rows are skipped
   silently; unmatched sold rows become auditable errors; a `failed` run is still
   recorded on fatal errors. A non-transactional fallback exists only for topologies
   that genuinely lack transactions.
5. **In-memory dev DB is per-process.** The seed script and the dev server are
   separate processes, so seeding happens *inside* the app on first boot
   (`autoSeedIfEmpty` in `lib/mongodb.ts`), not only via `npm run seed`.
6. **`ImportRun.errors`**: `errors` is a reserved Mongoose Document key — assign via
   `run.set('errors', …)`, and the schema sets `suppressReservedKeysWarning: true`.

## Deliberate deviation

- **No `multer`.** App Router uploads use native `request.formData()` in
  `app/api/import/route.ts`. multer is Express-coupled and wrong for this runtime.

## Test / verification files

- `lib/seedData.ts` — deterministic 50-listing dataset (also the manual fixtures).
- Verified behaviors (re-check after changes): stats counts (50/30/12/8), profit
  sort (computed field), text search, profit/RETT/price/date filters, single fetch,
  CSV export filename + rows, and the import pipeline (add/archive/skip-empty/
  error-rows/transaction). The import was validated end-to-end against the live API.

## Navigation & filtering UX

There is **no persistent nav sidebar** (removed 2026-06-16 — it ate too much
horizontal space). Pages are full-width and navigate via top-bar actions:
Listings has an **Import Excel** button (→ /admin), and Admin has a **Back to
Listings** button (→ /listings). `AppShell` is just a full-width wrapper now.

**Filtering uses a top filter-pill bar, not a left rail** (redesigned 2026-06-16
toward the Airtable/Linear pattern — fixes the horizontal-scroll/"wonky" feel).
`components/organisms/FilterBar.tsx` renders one pill per filter dimension
(Status, County, Price, Profit, Profit %, Date added, Type, Days on market,
RETT). Each pill is a Popover; when a filter is set the pill fills accent-blue
and shows `Label: value` with an × to clear, plus a global "Clear all". This
doubles as the "applied filters" display. The table is full-width below it (no
horizontal scroll on desktop). The old `FilterSidebar` / `FilterPanel` /
`FilterChip` components were removed. `lib/filters.ts` still owns URL ⟷ state.

## Staff-editable fields (listings are no longer import-only)

Added 2026-06-16. Two per-listing fields are editable in the UI and survive the
monthly import (import only inserts new / archives sold — it never overwrites an
existing active listing's staff data):

- **`outreachedBy`** — enum Greg/Crystal/Jacob/Blake or `null` (unassigned).
  Inline `OutreachSelect` dropdown in the table's Outreached column + the drawer.
  Also a **filter pill** (`outreachedBy` filter, supports the `Unassigned`
  sentinel via `OUTREACH_UNASSIGNED`). Edited via `PATCH /api/listings/[id]`.
- **`comments`** — a timestamped notes thread (Mongoose subdocs with their own
  `_id` + timestamps + a `pinned` flag). Viewed/added/edited/deleted/**pinned** in
  a modal (`NotesDialog` from the table's Notes column) and in the drawer
  (`NotesPanel`, the shared inner UI). Pinned notes sort to the top (gold styling).
  CRUD via `POST /api/listings/[id]/comments` (body) and
  `PATCH|DELETE /api/listings/[id]/comments/[commentId]` (PATCH accepts `body`
  and/or `pinned`). Each mutation returns the full updated `Listing`;
  `ListingsView.updateListingLocal` syncs the table, drawer, and modal from that.
  There is **no separate "import note" block** — the Excel import note
  (`listing.notes`) is surfaced as a **pinned note** (the seed + import pipeline
  create it as `{ body: notes, pinned: true }`). `listing.notes` is still kept as
  the raw import value for CSV export / the permalink page.

Note on the query builder: geo and outreach filters both use `$or`, so
`lib/query.ts` composes OR-groups under a single `$and` (never two top-level
`$or`s). The table column count is kept fit-to-width (no horizontal scroll) by
showing street-only addresses and short headers; adding columns means trimming.

## Conventions

- Server brain (lib + API routes) and the page orchestrator are hand-written for
  consistency; presentational components live under `components/{atoms,molecules,
  organisms,layout}` with frozen prop interfaces.
- Brand tokens are Tailwind classes (`brand.*`, `status.*`, `profit.*`); badge fills
  use arbitrary hex (`bg-[#e8f0fe]` etc.). Currency cells use `tabular-nums`.
- Don't use emojis in code/commits. Run the full green bar before every commit.
