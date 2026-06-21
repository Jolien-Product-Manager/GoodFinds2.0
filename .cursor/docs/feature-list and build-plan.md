# GoodFinds — Feature List & Build Plan

**Status:** Phases 0–6 **complete** (scaffold through production deploy). App name: **GoodFinds**. Recent work: feed sidebar UI, hunt builder tile editing, extended gender options, Supabase auth + cloud state sync, eBay snapshot caching.

**Design reference:** Before building or changing any UI, read [`design.md`](design.md) — tokens (`paper`, `card`, `ink`, `brass`, `steal`, …), typography (Fraunces / JetBrains Mono / Inter), spacing. Behaviour specs live in the feature docs below.

---

## Build Plan & Prioritization (completed)

1. **Connect to marketplaces** (Chrono24 & eBay) — `marketplace-queries.md` → **F1–F4**
2. **Generate Feed screen** — `vintage-timex-watches-feed.md` + `design.md` → **F5, F6, F8, F9** (+ partial **F7**)
3. **Hunt & preferences page** — `hunt-builder-spec.md` → **F10–F16, F22, F23**
4. **Feed filtering / matching** — `hunt-feed-filtering-criteria.md` → **F17–F21**, completes **F7**
5. **Back-end saving** — `/api/state` + localStorage + Supabase → **F8**, hunts, global filters, purchases
6. **Deploy to production** — Vercel, env vars, README

**Git:** Phase commits on `main`. Use `./commit` for detailed commits with change summaries.

---

## Features

### Marketplace ingestion

- **F1. Chrono24 scraper** — Offline Python scraper (~10 vintage query terms), per-article HTML parsing, dedupes by listing ID, URL canonicalization, writes JSON snapshot. Images proxied via `/api/listing-image` (CDN blocks hotlinking).
- **F2. eBay Browse API** — Live fetch via `npm run sync:ebay` (`timex vintage watch`, newlyListed), up to **10,000** listings by default (paginated at 200/request; override via `EBAY_SEARCH_LIMIT`). **Page loads serve disk snapshot only** (`data/ebay/vintage_timex.json`) to avoid rate limits; set `EBAY_FORCE_REFRESH=1` to force live fetch.
- **F2b. Etsy Open API** — Live fetch via `npm run sync:etsy` (`vintage timex watch`), up to **500** listings (paginated at 100/request). Same snapshot pattern as eBay.
- **F3. Normalize & merge** — Combines sources, drops missing price/ID, namespaces eBay IDs, infers listing gender from titles.
- **F4. Vintage filter** — Keeps listings where title says "vintage" or parsed year ≤ 2000.

### Feed (inbox)

- **F5. New section** — Single pool of unseen, gated listings ranked by best hunt score (no 24h/Older split).
- **F6. View toggle (New | Starred | Dismissed)** — Three views in sidebar; Starred = `listingStatus.interested` (UI label: **Interesting**).
- **F7. Scope under New** — Sidebar filters: **All listings** | **New listings** | **Hunt matches** (`alertScope: watchlist` or `hunt:{id}`) with per-hunt sub-chips. **Marketplace** filter: All / eBay / Chrono24 / Etsy.
- **F8. Dismiss / Restore** — Dismissed is a top-level view; undo toast on dismiss.
- **F9. Bulk + refresh actions** — "Check for new listings" (`router.refresh`).

### Hunt Builder

- **F10. Saved hunts list** — Inline cards with summary + Edit; drafts appear as editor panel, not chips.
- **F11. Hunt form (9 attributes + gender)** — Inline editor per hunt; multi-select chips + free-text per attribute. **Edit tiles** mode removes preset/custom suggestion chips (persisted in `attributeHidden`). Custom values persist per section in `attributeLibrary`.
- **F12. Summary sentence + tightness badge** — Plain-language hunt description; Wide open → Very specific. Hearts shown in summary (`· N♥`).
- **F13. Draft vs. saved + working copy** — New hunts transient until Save; `normalizeHunt()` on load/rehydrate.
- **F14. Custom-value normalization** — Presets and customs normalized identically before match.
- **F23. Hunt gender filter** — Men's / Women's / Men's & Women's / Unisex / Children's / Boys / Girls / Unisex children's per hunt; title + case-size inference on listings; gender-only hunts active for Hunt matches.

### Global filters (gates)

- **F15. Price ceiling** — Hard cap on landed cost; lives on `/hunts`.
- **F16. Ships-to-me** — Toggle + postal code; excludes unshippable listings.

### Hunt → Feed matching

- **F17. Feature extraction + confidence** — Model, era, condition from titles; partial extraction with unverified states.
- **F18. Gates exclude, taste ranks** — Global gates hide listings; taste affects score.
- **F19. Multi-hunt scoring** — Best hunt score wins; Hunt matches = ≥1 hunt match.
- **F20. Dealbreaker promotion** — Not shipped.
- **F21. Match reasons on cards** — Why note + attribute hit/miss/unverified.

### Collection

- **F22. Purchased watches** — Paste URL → simulated parse into feature pills on `/hunts`; optional image upload per row.

### Persistence & auth

- Zustand (`caseback-state-v8`) + [`/api/state`](../src/app/api/state/route.ts):
  - **Signed in:** Supabase `user_state` table (magic-link email auth)
  - **Local fallback:** `data/store/state.json` when Supabase is not configured
- Persisted fields include hunts, dismissals, stars, feed scope, `marketplaceFilter`, `attributeLibrary`, `attributeHidden`.
- On Vercel without Supabase, server file is ephemeral — see [README](../README.md).

---

## User flows

### Create a hunt
New hunt → inline editor opens → set gender → toggle attribute chips / type customs → **Edit tiles** to hide unwanted suggestions → set hearts → watch summary + tightness → name → Save → card in Defined hunts list.

### Daily triage
Land on Feed (**New**, sorted by hunt score) → use sidebar **Hunt matches** or per-hunt sub-filters → scan match reasons → Dismiss noise / mark **Interesting** → **Starred** view to revisit saved listings.

### Narrow what you see
Under **New**, tap **Hunt matches** → expand per-hunt sub-chips → or filter by **eBay** / **Chrono24** / **Etsy** in Marketplace section.

### Tune buy-ability
On **Hunts** → Global filters → price ceiling and ships-to-me + postal code → gates exclude before feed.

### Log a purchase
Paste listing URL in Purchased watches → "Reading listing…" → review parsed pills.

### Sign in (optional)
Magic-link email via masthead auth button → state syncs to Supabase across devices.

---

## Related docs

- [vintage-timex-watches-feed.md](vintage-timex-watches-feed.md) — shipped feed UI
- [hunt-builder-spec.md](hunt-builder-spec.md) — hunts page
- [hunt-feed-filtering-criteria.md](hunt-feed-filtering-criteria.md) — matching pipeline
- [marketplace-queries.md](marketplace-queries.md) — Chrono24 + eBay + Etsy fetch
