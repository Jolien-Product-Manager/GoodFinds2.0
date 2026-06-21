# Listing match scoring

How listings are ranked against active hunts in the feed. Implementation: [`src/lib/listings/hunt-match.ts`](../src/lib/listings/hunt-match.ts).

---

## Domain model

| Concept | Meaning |
|---|---|
| **Hunt** | A set of **categories** (model, era, collab, …). Each category holds an accepted option set (`picks ∪ customs`). |
| **Category pass** | The listing has a resolved value for that category **and** it is in the hunt's accepted set (OR within the category). |
| **Required category** | `HuntAttribute.required === true`. If the category does not pass, the hunt contributes **0** for that listing. |
| **Hearts** | Desire rating 1–4 on the hunt (`hunt.hearts`). |
| **Active hunts** | Saved hunts with criteria (`hunt.saved` + gender and/or attributes). |

Gender is evaluated **before** category scoring. A gender mismatch excludes the hunt entirely (same as a 0 contribution).

Categories with no accepted values on the hunt are ignored (not counted in totals).

**Gender-only hunts** (women's/men's with no attribute chips): when the gender gate passes, the hunt contributes as **1/1 categories** × hearts multiplier — so they still appear under Hunt matches in the feed.

---

## Per-hunt scoring

For one listing against one hunt:

1. **Gate — required categories.** If any required category fails to pass, the hunt contributes **0**. Check this before summing points.
2. **Count passes.** `categoriesPassed` = number of hunt categories (with ≥1 accepted value) where the listing passes.
3. **Points.**

```
pointsContributed = categoriesPassed × HEARTS_SCORE_MULTIPLIER[hearts]
```

**Not normalized** by category count — hunts with more specified categories can earn more points when fully matched.

### Hearts multiplier (config)

Single exported map in `hunt-match.ts` — retune without changing callers:

```typescript
export const HEARTS_SCORE_MULTIPLIER = {
  1: 0.25,
  2: 0.5,
  3: 0.75,
  4: 1.0,
};
```

Example retune if desire should dominate category count: `{ 1: 1, 2: 2, 3: 4, 4: 8 }`.

---

## Listing score

```
listingScore = Σ pointsContributed   // sum across all active hunts
```

A listing that satisfies two hunts should outrank one that satisfies a single hunt equally well (additive).

**Feed sort:** `listingScore` descending, then `listedAt` descending ([`alertSort()`](../src/lib/listings/selectors.ts)).

The raw score has **no fixed ceiling** — it is for ranking only.

---

## Return shape

`matchAllHunts()` returns a `Map<listingId, HuntMatchResult>`:

| Field | Purpose |
|---|---|
| `score` | `listingScore` (sort key) |
| `huntContributions` | Breakdown entries for hunts with `pointsContributed > 0` |
| `matchedHuntIds` / `matchedHuntNames` | Derived from contributions |
| `attributeMatches` | Attribute tags from the **top contributing** hunt (for card chips) |
| `whyNote` | Short human-readable reason |

Each `HuntScoreContribution`:

| Field | Meaning |
|---|---|
| `huntId`, `huntName` | Hunt identity |
| `categoriesPassed` | Categories that passed |
| `totalCategories` | Categories with accepted values on the hunt |
| `hearts` | Hunt desire rating |
| `pointsContributed` | This hunt's additive points |

### UI badges

Cards render per-hunt badges from the breakdown, not the raw score:

```
Grail Marlin — 5/5 (4 hearts)
```

Helper: `formatHuntContributionBadge()`.

**Match quality pill** (`matchQualityFromContribution()` on the top hunt contribution):

| Label | Condition |
|---|---|
| **Perfect Match** | `categoriesPassed >= totalCategories` |
| **Close Match** | pass ratio > 50% |
| **Loose Match** | pass ratio ≤ 50% but > 0 |

The raw `listingScore` is for sort order only — not shown as a user-facing tier.

---

## Category matching rules

Shared logic in `categoryPasses()`:

| Category | Pass condition |
|---|---|
| **collab** | `collabPickMatchesListing()` (incl. "Any collab", named partners) |
| **complete** | `completenessPickMatchesTitle()` on listing title |
| **traits** | Any wanted trait substring found in listing search text |
| **Other attrs** | Normalized listing feature value overlaps an accepted option |
| **Unverified** | No resolved listing value → **does not pass** (counts as fail; triggers required gate if flagged) |

Within a category: **OR** (any accepted option matches). Across categories: each evaluated independently for pass/fail and required gating.

---

## Feed scopes

| Scope | Filter |
|---|---|
| **all** | All listings passing gates (default) |
| **watchlist** | `matchedHuntIds.length > 0` (UI label: **Hunt matches**) |
| **hunt:{id}** | Hunt id in `matchedHuntIds` |

Legacy `alertScope: "top"` is migrated to `"all"` on store rehydrate. There is no separate score-threshold scope in shipped UI.

---

## Worked examples

Assume `HEARTS_SCORE_MULTIPLIER[4] = 1.0`, `HEARTS_SCORE_MULTIPLIER[2] = 0.5`.

| Hunt | Categories | Passed | Required fail? | Points |
|---|---|---|---|---|
| 4♥ Marlin · 1970s · blue (3 cats, all pass) | 3 | 3 | no | **3.0** |
| 4♥ same hunt, model required but wrong era | 3 | 2 | yes (model) | **0** |
| 2♥ Electric only (1 cat, pass) | 1 | 1 | no | **0.5** |
| Two hunts each 3/3 @ 4♥ | — | — | — | **6.0** listing score |

---

## Related files

- [`src/lib/listings/hunt-match.ts`](../src/lib/listings/hunt-match.ts) — `scoreListingAgainstHunt()`, `matchAllHunts()`, `HEARTS_SCORE_MULTIPLIER`
- [`src/lib/listings/selectors.ts`](../src/lib/listings/selectors.ts) — `alertSort()`, feed scope selectors
- [`src/components/alert-listing-card.tsx`](../src/components/alert-listing-card.tsx) — hunt badges and match quality pill
- [`src/lib/hunts/types.ts`](../src/lib/hunts/types.ts) — `HuntAttribute.required`

Legacy **C × S × H** scoring (completeness × specificity × hearts) is replaced by this model. Specificity (`huntTightness`) remains in the hunt builder UI only.
