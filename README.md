# GoodFinds

Vintage Timex hunting assistant — aggregate listings from Chrono24 and eBay, triage in a feed, and define hunts for what you're looking for.

**Remote:** https://github.com/Jolien-Product-Manager/GoodFinds2.0

## Quick start

```bash
npm install
cp .env.local.example .env.local   # add eBay API keys (optional)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the feed. Hunts live at `/hunts`.

**Feed tabs:** New · Starred · Dismissed. Under **New**, **Watch-list** shows listings that match your saved hunts (gender + taste criteria on `/hunts`).

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

## eBay (optional)

Set in `.env.local`:

```
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
EBAY_MARKETPLACE_ID=EBAY_CA
EBAY_ENV=production
```

Without credentials the app runs Chrono24-only. With credentials, the feed pulls up to **10,000** eBay Timex wristwatch listings (paginated at 200 per Browse API request, sorted by newly listed).

## Commit with change details

```bash
./commit "Your commit title" --all --push
```

## Deploy (Vercel)

1. Push to GitHub and import the repo in [Vercel](https://vercel.com).
2. Set environment variables: `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_MARKETPLACE_ID`, `EBAY_ENV`.
3. Deploy — `vercel.json` is included.

**Note:** User state (dismissed, starred, hunts, purchases) persists to `data/store/state.json` on the server. On Vercel's ephemeral filesystem this resets between cold starts unless you mount persistent storage. For production persistence, use Vercel Postgres/KV or deploy to a platform with a persistent disk.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run sync:listings` | Copy scraper output into `data/chrono24/` (skips if empty) |

## Docs

Product and build specs: [`.cursor/docs/`](.cursor/docs/) — start with [feature-list and build-plan.md](.cursor/docs/feature-list%20and%20build-plan.md).
