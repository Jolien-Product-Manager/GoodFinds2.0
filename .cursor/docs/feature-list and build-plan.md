# Sleeper — Feature List & Build Plan

## Build Plan & Prioritization

**Design reference:** Before building or changing any UI, read [`design.md`](design.md) and match it — tokens (`paper`, `card`, `ink`, `brass`, `steal`, …), typography roles (Fraunces / Space Mono / Inter), spacing, and the mockup at `/design/timex-tool-mockup.html`. Behaviour specs live in the feature docs; visual treatment lives in `design.md`.

1. **Connect to marketplaces** (Chrono24 & eBay) — `marketplace-queries.md`
   → Implements **F1–F4**
2. **Generate "Feed" screen** to display returned results — `vintage-timex-watches-feed.md` + [`design.md`](design.md)
   → Implements **F5, F6, F8, F9** (F7 ships partially — basic scope chips; Watch-list/Top-matches fill in at step 4)
3. **Add Hunt & preferences page** — `hunt-builder-spec.md` + [`design.md`](design.md)
   → Implements **F10–F16, F22** (UI only; their data isn't persisted until step 5)
4. **Implement filtering** on the Feed page — `hunt-feed-filtering-criteria.md`
   → Implements **F17–F21**, completes **F7**
5. **Add back-end saving** — persists data behind **F8** (dismissed), **F10–F14** (hunt specs), **F22** (purchases)
6. **Deploy to production website** — no new features

**Git:** After finishing each phase above, commit before starting the next one. Use a message that names the phase and what shipped, e.g. `Phase 1: connect Chrono24 and eBay marketplace ingestion`. From the repo root: `./commit -a -p` (detailed message + push) or `git add -A && git commit -m "…"`.

> Note: F5 (the Feed) lands at step 2 but doesn't reach its full definition — "gated, matched, ranked" — until F17–F21 arrive at step 4.

---

## Features

### Marketplace ingestion

- **F1. Chrono24 scraper** — Offline Python scraper runs ~10 vintage query terms, dedupes by listing ID, writes a static JSON snapshot the app reads at load.
- **F2. eBay Browse API** — Live single-query fetch (`vintage timex`, newlyListed) on each page load, with cached OAuth and graceful fallback to Chrono24-only if creds fail.
- **F3. Normalize & merge** — Combines both sources, drops listings missing price or ID, namespaces eBay IDs to avoid collisions.
- **F4. Vintage filter** — Keeps listings where title says "vintage" or parsed year ≤ 2000.

### Feed (inbox)

- **F5. New section** — Single pool of all unseen, gated, matched listings ranked by priority (no 24h/Older split in target).
- **F6. View toggle (New | Interested)** — One view at a time; Interested holds saved listings, dismiss state preserved.
- **F7. Scope chips** — All new · Watch-list · Top matches (strong-match threshold).
- **F8. Dismiss / Restore** — Move listings to a collapsible Dismissed section and back, with undo toast.
- **F9. Bulk + refresh actions** — "Mark all dismissed" (scoped, undoable) and "Check for new listings."

### Hunt Builder

- **F10. Saved hunts bar** — Chips for each saved hunt plus "New hunt"; drafts never appear as chips (avoids phantom hunts).
- **F11. Hunt form (8 attributes)** — Collapsible form for model, collab, dial, color, era, case, movement, condition; each multi-select with free-text custom entry.
- **F12. Summary sentence + tightness badge** — Plain-language description of the hunt and a Wide open → Very specific badge warning when a hunt is too narrow to ever fire.
- **F13. Draft vs. saved + working copy** — New hunts are transient until Save; edits mark a hunt dirty and can revert on collapse.
- **F14. Custom-value normalization** — Free-text runs through the same normalization as presets so "crosshair / cross-hair" collapse to one value.

### Global filters (gates)

- **F15. Price ceiling** — Hard cap; null = no limit; targets landed cost (shipping + duties) once postal code is set.
- **F16. Ships-to-me** — Toggle + required postal code; excludes anything that won't ship to the buyer.

### Hunt → Feed matching

- **F17. Feature extraction + confidence** — Reads model/dial/case/era/condition per listing, each tagged high/med/low confidence; model resolved from dial code, not title.
- **F18. Gates exclude, taste ranks** — Gate failures are hidden; taste misses rank lower but still show (fixes the prototype's empty-feed AND-filter problem).
- **F19. Multi-hunt scoring** — A listing matches if it clears gates and ≥1 active hunt; feed rank = best hunt score, tie-broken by recency.
- **F20. Dealbreaker promotion** — A taste value flagged dealbreaker becomes a per-hunt gate (excludes from that hunt only).
- **F21. "Why you're seeing this" card block** — Per-listing matched-hunt chip(s), per-attribute hit/miss/unverified, and confidence flags.

### Collection

- **F22. Purchased watches** — Paste a listing link → auto-parsed into the same attribute vocabulary as hunts, with editable feature pills; foundation for "suggest hunts based on what you own."

---

## User flows

### Create a hunt
New hunt → expand form → toggle attribute chips / type customs → watch summary + tightness badge update → name it → Save → chip appears in saved bar, hunt goes live as an alert stream.

### Daily triage
Land on Feed (New, sorted by best hunt score) → scan cards with match reasons → Dismiss noise / mark Interested on keepers → optionally "Mark all dismissed" to clear scope → switch to Interested view to revisit saved listings.

### Narrow what you see
Tap a scope chip (a specific hunt, or Top matches) → feed filters to that subset → tap a card's matched-hunt chip to scope to just that hunt.

### Tune buy-ability
Open Global filters → set price ceiling and ships-to-me + postal code → gates now exclude unaffordable/unshippable listings before they ever reach the feed.

### Log a purchase
Paste listing URL in Purchased watches → "Reading listing…" → review/edit auto-parsed pills → saved into collection.
