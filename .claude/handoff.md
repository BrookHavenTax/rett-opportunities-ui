# Handoff — RETT Opportunities Database

_Last updated: 2026-06-16. Single source of truth for the project's current state._

## Current state: Phase 1 complete & verified

A full, working internal Next.js 14 app. Green bar (typecheck + lint + production
build) all passing. Verified in the running app and via API/pipeline tests.

### What works today

- **/listings** — stats bar (Total/Active/New/Sold), full-text search (300ms
  debounce), 9-section filter sidebar (status, county/state multiselect, dual-handle
  price & profit sliders, profit % inputs, month-range date-added, property type,
  days-on-market, RETT toggle), sortable TanStack table, dismissible active-filter
  chips, pagination (25/50/100), CSV export. **All state is URL-serialized.**
- **Detail drawer** — right-side slide-over with key metrics, full details, notes,
  Copy Link + Export-this-listing. Opens on row click; ESC/backdrop close.
- **/listings/[id]** — server-rendered permalink (the Copy Link target).
- **/admin** — drag-and-drop .xlsx import with progress + result summary + error
  accordion, plus an expandable import-history table.
- **API** — `/api/listings`, `/api/listings/[id]`, `/api/listings/counties`,
  `/api/stats` (5-min cache), `/api/export` (CSV), `/api/import` (POST .xlsx),
  `/api/import/runs`.
- **Import pipeline** — parses "New Listings" + "Sold Removed" sheets, validates with
  zod, dedupes, archives sold, inserts new — all in one MongoDB transaction. Invalid
  rows skipped & recorded; empty rows skipped silently; unmatched sold rows flagged.
- **Local dev needs no database** — in-memory replica set auto-seeds 50 listings + 4
  import runs on first boot.

### Verified (this session)

- Build/typecheck/lint green. No console errors in the running app.
- API: profit-sort (computed field), text search, profit/RETT/price filters, single
  fetch, CSV export (`rett-listings-2026-06.csv`, correct row count).
- Import pipeline end-to-end against the live server: 2 added, 1 archived, empty row
  skipped, invalid row + unmatched-sold flagged, target listing flipped to `sold`,
  transaction committed.
- UI: desktop layout (navy sidebar, stats, filters, table), detail drawer (profit
  correctly red on a loss), admin import history (counts match seed), filter
  interaction (chip + count + refetch), client-side nav + active states, responsive
  tablet/mobile collapse.

## What's left (prioritized)

1. **Connect MongoDB Atlas** — create a cluster, set `MONGODB_URI` in the host env,
   run `npm run seed` (or import Brooke's real master sheet via /admin).
2. **Wire auth** — set `ADMIN_SECRET` to guard `/api/import`, then integrate the
   staff-portal SSO (the app assumes it sits behind portal auth).
3. **Deploy** — `npm run build && npm start` on a Node host (or Vercel) with env vars
   set. No remote/infra is configured yet (see below).
4. **First real import cycle** with Brooke; validate the master-sheet column names
   against `lib/schemas/listing.ts` header matching.
5. **v2 candidates** — map/geo view, per-listing email alerts.

## Git / deploy status

- Local git repo initialized and committed. **No GitHub remote and no deploy target
  are configured** (this is a fresh local project), so push/deploy were not run.
  To set them up:
  ```bash
  gh repo create brookhaven/rett-opportunities-db --private --source=. --push
  # then deploy to your Node host / Vercel with MONGODB_URI + NEXT_PUBLIC_APP_URL set
  ```

## Gotchas

- The in-memory dev DB is per-process; data resets on server restart (re-seeds).
- `mlsNumber` sparse-unique index: never store `""` for a missing MLS number.
- `next dev` here uses webpack (fine on Next 14). On Next 16, use `--webpack`.
