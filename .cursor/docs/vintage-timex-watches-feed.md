# GoodFinds — Vintage Timex Watches Feed

Shipped behavior for route `/`. Global gates (price, shipping, condition) live on `/hunts`.

---

## Purpose

**Job:** *"What's new, what did I save, what did I dismiss — ranked by how well it matches my hunts?"*

Default landing page. Masthead: **Feed** | **Hunts** | sign-in (when Supabase configured).

---

## Layout

- **Left:** listing grid + `HuntQuickFilter` bar (hunt + match-quality chips with counts)
- **Right (md+):** sticky sidebar — Views, Marketplace, attribute filters
- **Detail panel:** opens on card select; prev/next navigation; sidebar collapses on small screens

Components: [`feed-view.tsx`](../src/components/feed-view.tsx), [`feed-sidebar.tsx`](../src/components/feed-sidebar.tsx), [`hunt-quick-filter.tsx`](../src/components/hunt-quick-filter.tsx).

---

## View modes (sidebar)

Four views; stored as `feedView` in [`caseback.ts`](../src/store/caseback.ts).

| View | Shows |
|------|--------|
| **All** | All non-dismissed listings passing gates |
| **New** (default) | Unseen only; perfect matches first, then score, then `listedAt` |
| **Starred** | `listingStatus.interested === true` |
| **Dismissed** | In `seen[]`, not starred; Restore action |

---

## Hunt & quality filters

Stored as `selectedHuntIds[]` and `selectedMatchQualities[]` (multi-select, OR within each group, AND between groups).

| Filter | UI | Effect |
|--------|-----|--------|
| Hunt chips | `HuntQuickFilter` + sidebar | Show listings matching any selected hunt |
| Quality chips | Perfect / Good / Loose | Filter by match-quality level |
| Marketplace | All / eBay / Chrono24 / Etsy | `marketplaceFilter` |

**Clear all filters** resets hunt, quality, marketplace, and attribute filters. Legacy `alertScope` migrates on rehydrate via [`hunt-finds-filter.ts`](../src/lib/listings/hunt-finds-filter.ts).

---

## Listing cards

[`alert-listing-card.tsx`](../src/components/alert-listing-card.tsx):

- Image carousel; marketplace icon beside price
- Match badge (Perfect / Close / Loose) + score + why note + attribute chips
- Heart / Dismiss in side gutters (not over photo)
- Swipe-to-dismiss on touch devices

| Action | Effect |
|--------|--------|
| **Interesting** | Toggle starred |
| **Dismiss** | Add to `seen[]`; undo toast |
| **View** | Open marketplace URL |

---

## Feed header

Count line with context suffix, e.g. `12 listings · 3 new · matching Marlin · perfect finds`.

Bulk actions: **Dismiss all** (visible listings), **Clear all filters**.

Data loads via `POST /api/feed/bootstrap` (first page + tab counts in one call), then `POST /api/feed` for pagination.

---

## Persistence

`caseback-state-v8` (localStorage) + debounced `POST /api/state` → Supabase or `data/store/state.json`.

Persisted: `seen[]`, `listingStatus`, `feedView`, `selectedHuntIds`, `selectedMatchQualities`, `marketplaceFilter`, hunts, global filters, attribute libraries.

---

## Not shipped

- Push/email alerts
- Explore tab / model triage
- Dealbreaker taste weights

---

## Related files

- [`selectors.ts`](../src/lib/listings/selectors.ts) — `alertListings`, `alertSort`
- [`hunt-match.ts`](../src/lib/listings/hunt-match.ts) — scoring + match quality
- [`feed-query.ts`](../src/lib/listings/feed-query.ts) — server-side feed pipeline
