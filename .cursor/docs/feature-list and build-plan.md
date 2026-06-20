# GoodFinds — Feature List & Build Plan

**Status:** Phases 0–6 **complete** (scaffold through production deploy). App name: **GoodFinds**.

**Design reference:** Before building or changing any UI, read [`design.md`](design.md) — tokens (`paper`, `card`, `ink`, `brass`, `steal`, …), typography (Fraunces / JetBrains Mono / Inter), spacing. Behaviour specs live in the feature docs below.

---

## Build Plan & Prioritization (completed)

1. **Connect to marketplaces** (Chrono24 & eBay) — `marketplace-queries.md` → **F1–F4**
2. **Generate Feed screen** — `vintage-timex-watches-feed.md` + `design.md` → **F5, F6, F8, F9** (+ partial **F7**)
3. **Hunt & preferences page** — `hunt-builder-spec.md` → **F10–F16, F22, F23**
4. **Feed filtering / matching** — `hunt-feed-filtering-criteria.md` → **F17–F21**, completes **F7**
5. **Back-end saving** — `/api/state` + localStorage → **F8**, hunts, global filters, purchases
6. **Deploy to production** — Vercel, env vars, README

**Git:** Phase commits on `main`. Use `./commit` for detailed commits with change summaries.

---

## Features

### Marketplace ingestion

- **F1. Chrono24 scraper** — Offline Python scraper (~10 vintage query terms), per-article HTML parsing, dedupes by listing ID, URL canonicalization, writes JSON snapshot.
- **F2. eBay Browse API** — Live fetch (`timex vintage watch`, newlyListed), **400 listings** (2×200 paginated), cached OAuth, Chrono24-only fallback if creds fail.
- **F3. Normalize & merge** — Combines sources, drops missing price/ID, namespaces eBay IDs, infers listing gender from titles.
- **F4. Vintage filter** — Keeps listings where title says "vintage" or parsed year ≤ 2000.

### Feed (inbox)

- **F5. New section** — Single pool of unseen, gated listings ranked by best hunt score (no 24h/Older split).
- **F6. View toggle (New | Starred | Dismissed)** — Three top-level tabs; Starred = `listingStatus.interested` (UI: Star).
- **F7. Scope under New** — **All** | **Watch-list** (saved hunt matches). Top picks / per-hunt chips: code only, not in UI.
- **F8. Dismiss / Restore** — Dismissed is a top-level tab; undo toast on dismiss.
- **F9. Bulk + refresh actions** — "Mark all dismissed" (scoped) and "Check for new listings" (`router.refresh`).

### Hunt Builder

- **F10. Saved hunts bar** — Chips for saved hunts + "New hunt"; drafts never appear as chips.
- **F11. Hunt form (8 attributes + gender)** — Collapsible form; multi-select chips + free-text per attribute.
- **F12. Summary sentence + tightness badge** — Plain-language hunt description; Wide open → Very specific.
- **F13. Draft vs. saved + working copy** — New hunts transient until Save; `normalizeHunt()` on load/rehydrate.
- **F14. Custom-value normalization** — Presets and customs normalized identically before match.
- **F23. Hunt gender filter** — Men's / Women's / Both per hunt; title + case-size inference on listings; gender-only hunts active for Watch-list.

### Global filters (gates)

- **F15. Price ceiling** — Hard cap on landed cost; lives on `/hunts`.
- **F16. Ships-to-me** — Toggle + postal code; excludes unshippable listings.

### Hunt → Feed matching

- **F17. Feature extraction + confidence** — Model, era, condition from titles; partial extraction with unverified states.
- **F18. Gates exclude, taste ranks** — Global gates hide listings; taste affects score.
- **F19. Multi-hunt scoring** — Best hunt score wins; Watch-list = ≥1 hunt match.
- **F20. Dealbreaker promotion** — Not shipped.
- **F21. Match reasons on cards** — Why note + attribute hit/miss/unverified.

### Collection

- **F22. Purchased watches** — Paste URL → simulated parse into feature pills on `/hunts`.

### Persistence

- Zustand (`caseback-state-v3`) + [`/api/state`](../src/app/api/state/route.ts) → `data/store/state.json`. On Vercel, server file is ephemeral — see [README](../README.md).

---

## User flows

### Create a hunt
New hunt → expand form → set gender → toggle attribute chips / type customs → watch summary + tightness → name → Save → chip in saved bar.

### Daily triage
Land on Feed (**New**, sorted by hunt score) → scan match reasons → Dismiss noise / **Star** keepers → **Watch-list** scope for hunt-only view → **Starred** tab to revisit saved listings.

### Narrow what you see
Under **New**, tap **Watch-list** → feed shows only listings matching ≥1 saved hunt (gender + taste).

### Tune buy-ability
On **Hunts** → Global filters → price ceiling and ships-to-me + postal code → gates exclude before feed.

### Log a purchase
Paste listing URL in Purchased watches → "Reading listing…" → review parsed pills.

---

## Related docs

- [vintage-timex-watches-feed.md](vintage-timex-watches-feed.md) — shipped feed UI
- [hunt-builder-spec.md](hunt-builder-spec.md) — hunts page
- [hunt-feed-filtering-criteria.md](hunt-feed-filtering-criteria.md) — matching pipeline
- [marketplace-queries.md](marketplace-queries.md) — Chrono24 + eBay fetch
