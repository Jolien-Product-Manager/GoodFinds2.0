# GoodFinds

Vintage Timex hunting assistant — aggregate listings from Chrono24 and eBay, triage in a feed, and define hunts for what you're looking for.

**Remote:** https://github.com/Jolien-Product-Manager/GoodFinds2.0

## Quick start

```bash
npm install
cp .env.local.example .env.local   # eBay + Supabase keys (optional)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the feed. Hunts live at `/hunts`.

**Feed views (sidebar):** New · Starred · Dismissed. Under **New**: **All listings** · **Top matches** · **Hunt matches** (with per-hunt sub-filters) · **Marketplace** (eBay / Chrono24).

## Chrono24 data

The app reads a static JSON snapshot (no live Chrono24 calls):

```bash
cd scripts/chrono24
pip install -r requirements.txt
python3 chrono24_timex.py --vintage --vintage-only --max 120 --out vintage_timex.json
cd ../..
npm run sync:listings
```

Sample data ships in `data/chrono24/vintage_timex.json` for local dev. `sync:listings` **does not overwrite** existing data if the scraper returns 0 listings (e.g. without FlareSolverr).

Chrono24 images are proxied via `/api/listing-image` (CDN blocks browser hotlinking).

## eBay (optional)

Set in `.env.local`:

```
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
EBAY_MARKETPLACE_ID=EBAY_CA
EBAY_ENV=production
```

**Page loads use the disk snapshot** (`data/ebay/vintage_timex.json`) — not live API — to avoid rate limits. Refresh with:

```bash
npm run sync:ebay
```

Without credentials or snapshot the app runs Chrono24-only. Sync fetches up to **2000** listings (override via `EBAY_SEARCH_LIMIT`).

## Supabase auth (optional)

Sign in with magic-link email to sync hunts, dismissals, and stars across devices.

1. Create a Supabase project and run `supabase/schema.sql`
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
3. Configure auth redirect: `http://localhost:3000/auth/callback`

Without Supabase, state persists to `data/store/state.json` locally.

## Commit with change details

```bash
./commit "Your commit title" --all --push
```

## Deploy (Vercel)

1. Push to GitHub and import the repo in [Vercel](https://vercel.com).
2. Set environment variables: eBay keys, Supabase keys (recommended for persistence).
3. Deploy — `vercel.json` is included.

**Note:** Without Supabase, user state on Vercel's ephemeral filesystem resets between cold starts. Use Supabase for production persistence.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run sync:listings` | Copy Chrono24 scraper output into `data/chrono24/` |
| `npm run sync:ebay` | Fetch eBay listings and write `data/ebay/vintage_timex.json` |
| `npm run enrich:chrono24` | Enrich Chrono24 snapshot with real image URLs (needs FlareSolverr) |

## Docs

Product and build specs: [`.cursor/docs/`](.cursor/docs/) — start with [feature-list and build-plan.md](.cursor/docs/feature-list%20and%20build-plan.md).
