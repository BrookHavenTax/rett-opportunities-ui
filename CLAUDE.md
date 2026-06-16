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

## Conventions

- Server brain (lib + API routes) and the page orchestrator are hand-written for
  consistency; presentational components live under `components/{atoms,molecules,
  organisms,layout}` with frozen prop interfaces.
- Brand tokens are Tailwind classes (`brand.*`, `status.*`, `profit.*`); badge fills
  use arbitrary hex (`bg-[#e8f0fe]` etc.). Currency cells use `tabular-nums`.
- Don't use emojis in code/commits. Run the full green bar before every commit.
