# GoodFinds — Feature List & Build Plan

**Status:** Phases 0–6 **complete**. App name: **GoodFinds**.

---

## Build plan (completed)

1. **Marketplace connectors** — Chrono24 scraper, eBay Browse API, Etsy Open API → **F1–F4**
2. **Feed screen** — views, dismiss/restore, cards → **F5–F9**
3. **Hunt builder** — attributes, gender, hearts → **F10–F16, F22, F23**
4. **Feed filtering / matching** — scoring, match reasons, multi-select filters → **F17–F21**
5. **Persistence** — `/api/state`, localStorage, Supabase auth
6. **Production deploy** — Vercel, snapshot-first ingestion, bundled Etsy fallback

---

## Features

### Marketplace ingestion

- **F1. Chrono24 scraper** — Offline Python; JSON snapshot; images proxied via `/api/listing-image`.
- **F2. eBay Browse API** — `npm run sync:ebay`; page loads read `data/ebay/vintage_timex.json` only.
- **F2b. Etsy Open API** — `npm run sync:etsy`; bundled + disk snapshot; works without API keys in production.
- **F3. Normalize & merge** — Three sources → `AppListing`; dedupe by URL; gender inference.
- **F4. Vintage filter** — Title contains "vintage" or parsed year ≤ 2000.

### Feed

- **F5. New tab** — Unseen listings; perfect matches first, then score, then recency.
- **F5b. All tab** — All non-dismissed listings (seen + unseen).
- **F6. Starred / Dismissed** — Interesting (`listingStatus.interested`) and dismissed (`seen[]`) views.
- **F7. Hunt + quality filters** — Multi-select `selectedHuntIds[]` and `selectedMatchQualities[]` (Perfect / Good / Loose) via `HuntQuickFilter` bar + sidebar. Marketplace: All / eBay / Chrono24 / Etsy.
- **F8. Dismiss / Restore** — Undo toast; swipe-to-dismiss on cards.
- **F9. Bulk actions** — Dismiss all visible; Clear all filters; `POST /api/feed/bootstrap` for first page + counts.

### Hunt builder

- **F10–F14.** Saved hunts, inline editor, 9 attribute categories, Edit tiles, custom values, summary + tightness badge.
- **F23. Gender** — 8 options; title + case-size inference; gender-only hunts are valid.

### Global filters (gates)

- **F15. Price ceiling** — Landed cost cap on `/hunts`.
- **F16. Ships-to-me** — Toggle + postal code.
- **F16b. Condition** — Allowed conditions filter (sidebar).

### Matching

- **F17. Feature extraction** — Model, era, condition, collab, traits from titles; unverified when uncertain.
- **F18. Gates exclude, taste ranks** — Global gates hide; hunt attributes score.
- **F19. Additive multi-hunt scoring** — Sum of `categoriesPassed × hearts` across matching hunts.
- **F20. Dealbreaker promotion** — Not shipped.
- **F21. Match reasons** — Why note + hit/miss/unverified chips; Perfect / Close / Loose badges.

### Collection & persistence

- **F22. Purchased watches** — Paste URL → parsed feature pills (does not affect matching yet).
- **Auth** — Supabase magic-link; Zustand `caseback-state-v8` + debounced `/api/state`.

---

## User flows

**Daily triage:** Land on Feed (New) → filter by hunt and/or match quality → scan match reasons → Dismiss noise / mark Interesting → Starred to revisit.

**Define taste:** `/hunts` → new hunt → gender + attribute chips + hearts → Save → appears in hunt filter bar.

**Tune buy-ability:** `/hunts` → Global filters → price ceiling, ships-to-me, condition.

---

## Related docs

- [vintage-timex-watches-feed.md](vintage-timex-watches-feed.md) — feed UI
- [hunt-feed-filtering-criteria.md](hunt-feed-filtering-criteria.md) — matching pipeline
- [hunt-builder-spec.md](hunt-builder-spec.md) — hunts page
- [marketplace-queries.md](marketplace-queries.md) — fetch queries
- [problem-framing.md](problem-framing.md) — user + metrics
