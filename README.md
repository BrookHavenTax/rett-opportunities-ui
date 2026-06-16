# RETT Opportunities Database

Internal web app for Brookhaven staff to browse, filter, search, and import
**Real Estate Transfer Tax (RETT)** opportunity listings. Updated monthly via an
Excel import pipeline.

Built with **Next.js 14 (App Router)**, **TypeScript (strict)**, **Tailwind CSS**,
**shadcn/ui**, **TanStack Table v8**, and **MongoDB / Mongoose**.

---

## Quick start

```bash
npm install
npm run dev
```

Then open **http://localhost:3000** (or whichever port you pass with `-p`).

> **Zero-setup local database.** If `MONGODB_URI` is unset (or set to the sentinel
> `memory`), the app automatically boots an **in-memory MongoDB replica set** and
> **seeds 50 sample listings + 4 import runs** on first request — so the UI is fully
> testable immediately with no external database. A replica set (not a standalone)
> is used so the import pipeline's transactions work locally exactly as on Atlas.

### Connecting a real database

Copy `.env.example` → `.env.local` and set a real connection string:

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rett
NEXT_PUBLIC_APP_URL=https://portal.brookhaven.us
ADMIN_SECRET=optional-shared-secret-for-/api/import
```

Seed a real database explicitly:

```bash
npm run seed     # wipes + inserts 50 sample listings against MONGODB_URI
```

---

## Scripts

| Script              | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Dev server (in-memory DB auto-seeds if no URI)      |
| `npm run build`     | Production build                                    |
| `npm start`         | Run the production build                            |
| `npm run lint`      | ESLint (next/core-web-vitals)                       |
| `npm run typecheck` | `tsc --noEmit` (strict)                             |
| `npm run seed`      | Wipe + reseed the configured database               |

**Green bar before committing:** `npm run typecheck && npm run lint && npm run build`.

---

## Architecture

```
app/
  layout.tsx              root layout — Inter font, AppShell, Toaster
  page.tsx                → redirect to /listings
  listings/
    page.tsx              Suspense wrapper around the client view
    ListingsView.tsx      client orchestrator — URL state, fetch, drawer, export
    loading.tsx           route skeleton
    [id]/page.tsx         server-rendered listing permalink (Copy Link target)
  admin/
    page.tsx + AdminView.tsx   import tool + run history
  api/
    listings/route.ts            GET (filter/search/sort/paginate via aggregation)
    listings/[id]/route.ts       GET single
    listings/counties/route.ts   GET distinct county/state combos
    stats/route.ts               GET counts (5-min cache)
    export/route.ts              GET CSV (same filters, no pagination)
    import/route.ts              POST .xlsx (native formData, no multer)
    import/runs/route.ts         GET paginated run history
components/  atoms · molecules · organisms · layout · ui (shadcn)
lib/
  mongodb.ts          connection singleton + in-memory replica-set dev fallback
  models/             Mongoose Listing + ImportRun (+ serializers)
  schemas/listing.ts  zod: query parsing + Excel-row validation
  query.ts            FilterState → MongoDB aggregation (computed profit fields)
  filters.ts          URL ⟷ FilterState ⟷ API query + active-chip derivation
  importPipeline.ts   Excel parse + transactional reconcile
  export.ts           CSV generation (papaparse)
  seedData.ts         deterministic 50-listing sample set
  utils.ts            cn + currency/date/profit formatters
types/  listing.ts · filters.ts
```

**Key invariants**

- **All filter/search/sort/pagination state is serialized to the URL** — views are
  shareable and the browser back button works. `lib/filters.ts` is the single
  source of truth for that mapping.
- **Profit / profit %** are *computed* (`listPrice − purchasePrice`) in a MongoDB
  aggregation `$addFields` stage so they can be filtered and sorted server-side.
- **`mlsNumber` uses a unique *sparse* index** — listings without an MLS number
  must leave the field **unset** (never `""`), or the sparse index breaks. The seed
  and import pipeline both respect this.
- **The import is transactional**: archive-sold + insert-new + write-run-record run
  inside one MongoDB transaction (all-or-nothing). Invalid rows are collected and
  skipped; a `failed` run is still recorded for the audit trail.

---

## Deviation from the original spec

The spec listed `multer` for uploads. In the App Router, route handlers read the
multipart body with the native Web `request.formData()` API — `multer` is
Express-coupled and an anti-pattern here, so it is intentionally **not** used.

---

## Deployment

The app is a standard Next.js 14 server app. Point `MONGODB_URI` at MongoDB Atlas
and deploy to Vercel or any Node host:

```bash
npm run build && npm start
```

Set `MONGODB_URI`, `NEXT_PUBLIC_APP_URL`, and (optionally) `ADMIN_SECRET` in the
host's environment. Internal-only — intended to slot behind the staff portal's SSO.
