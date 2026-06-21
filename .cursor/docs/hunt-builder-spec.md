# GoodFinds — Hunt Builder & Collection: Build Spec

Shipped spec for the vintage Timex hunt builder at `/hunts`. Adapt class names and tokens to the
existing GoodFinds Next.js / Tailwind design system ([`design.md`](design.md)).

---

## 1. What this is

A single screen with four stacked regions:

1. **Defined hunts** — list of saved hunt cards (summary + Edit) + inline editor for new/editing hunts.
2. **Hunt editor** — inline panel (not a separate collapsible block) for defining/editing one hunt.
3. **Global filters** — settings that apply to every hunt (price ceiling, ships-to-my-address). Always visible.
4. **Purchased watches** — listing links the user has bought; each link is auto-parsed into attribute pills.

A "hunt" is a saved search. Users run several at once; each is its own attribute
set and (conceptually) its own alert stream. The product matches incoming
listings against hunts and notifies the user.

---

## 2. Core domain concepts

### 2.1 Gates vs. taste

Two fundamentally different kinds of criteria. Keep them distinct in both the
data model and the UI.

- **Taste (soft preferences):** the per-hunt attributes (model, dial, era,
  condition grade, traits, etc.). Multiple values allowed per attribute; within an
  attribute they mean OR. These rank listings via hunt score, not hard-exclude
  (except where noted).
- **Gates (hard constraints):** global filters (price ceiling, ships-to-me) and
  per-hunt **gender**. Binary; a listing that fails fails the gate for that hunt.

### 2.2 Per-hunt vs. global

- **Per-hunt:** **gender**, model, collaboration, dial pattern, dial color, era, case size,
  movement, condition grade, your characteristics (traits). Each hunt has its own values.
- **Global:** price ceiling, ships-to-my-address (+ postal code). Set once,
  applied to all hunts.

### 2.3 Draft vs. saved

- A **new hunt is a transient draft** held outside the saved list. It is **not**
  created/persisted until the user hits **Save**.
- Editing an existing saved hunt opens the **inline editor** in place of the card.
- This separation prevents phantom hunts from appearing in the list before the user commits.

### 2.4 Custom filter library & tile editing

- **`attributeLibrary`:** per-section (`AttrKey`) list of custom values the user has typed. Persisted globally — available as chips in future hunts for that section.
- **`attributeHidden`:** preset or custom chip labels the user removed via **Edit tiles**. Hidden from suggestions but restorable.
- **Edit tiles:** single button on the hunt name row (inline, before collapse chevron). In edit mode, × on each chip removes it from suggestions; **Restore all removed tiles** when any are hidden.

---

## 3. Data model (TypeScript)

```ts
type AttrKey =
  | 'model' | 'collab' | 'dial' | 'color'
  | 'era' | 'case' | 'mvmt' | 'cond' | 'traits';

interface HuntAttribute {
  picks: string[];   // selected chips (presets + customs merged on save)
  customs: string[]; // free-text while editing; consolidated on normalize
}

type HuntGender =
  | 'mens' | 'womens' | 'both'
  | 'unisex' | 'childrens' | 'boys' | 'girls' | 'unisex_children';

type HuntHearts = 1 | 2 | 3 | 4;

interface Hunt {
  id: string;
  name: string;
  saved: boolean;
  gender: HuntGender;
  hearts: HuntHearts;              // default 2
  attributes: Record<AttrKey, HuntAttribute>;
  createdAt: string;
  updatedAt: string;
}

interface GlobalFilters {
  priceCeiling: number | null;
  shipsToMe: boolean;
  postalCode: string | null;
}

type AttributeLibrary = Partial<Record<AttrKey, string[]>>;

interface PersistedState {
  // ... hunts, seen, etc.
  attributeLibrary: AttributeLibrary;
  attributeHidden: AttributeLibrary;
}
```

### Editing buffer

The builder edits a **working copy**, not the stored object:

- New hunt → fresh `Hunt` with `saved: false`, shown as inline editor at bottom of list.
- Existing hunt → Edit opens inline `HuntEditorPanel` replacing the card.

Shipped: [`hunt-builder-screen.tsx`](../src/components/hunt-builder-screen.tsx).

---

## 4. Field taxonomy

### Gender (per-hunt gate)

Rendered as first row in the editor. Options ([`HUNT_GENDER_OPTIONS`](../src/lib/hunts/types.ts)):

| Value | Label |
|-------|--------|
| `both` | Men's & Women's |
| `mens` | Men's |
| `womens` | Women's |
| `unisex` | Unisex |
| `childrens` | Children's |
| `boys` | Boys |
| `girls` | Girls |
| `unisex_children` | Unisex children's |

Listing gender is inferred from marketplace titles at normalize time and re-checked at match time ([`src/lib/listings/gender.ts`](../src/lib/listings/gender.ts)). A gender-only hunt (no attribute chips) still drives **Hunt matches** in the feed.

### Taste attributes

Per-hunt attributes and their preset options. Each is **multi-select** and also
accepts free-text ("or type your own"). Model presets are sorted **A–Z** from [`TIMEX_MODELS`](../src/lib/models/catalog.ts).

| Key      | Label            | Options (highlights) |
|----------|------------------|----------------------|
| `model`  | Model / line     | Marlin, Viscount, Mercury, Electric, … (catalog, A–Z) |
| `collab` | Collaboration    | Any collab, Peanuts, Disney, Keith Haring, … |
| `dial`   | Dial pattern     | Crosshair, Dot-dash, Plain 2/3-hand, … |
| `color`  | Dial color       | Silver, Champagne, Black, … |
| `era`    | Era              | 1950s, Early 60s, Late 60s, 1970s, 1980s |
| `case`   | Case size        | Under 32mm, 32–35mm, … |
| `mvmt`   | Movement         | Manual wind, Self-wind / auto, Electric |
| `cond`   | Condition grade  | NOS / unworn, Excellent, Good / worn, … (Deadstock migrated → `traits`) |
| `traits` | Your characteristics | Free-form only — deadstock, tags, box, etc. |

Chip options = presets (minus hidden) ∪ hunt picks ∪ saved library customs ([`attributeChipOptions()`](../src/lib/hunts/types.ts)).

---

## 5. Component tree

```
<HuntBuilderScreen>
  <DefinedHuntsSection>
    <SavedHuntCard />             // summary + Edit button
    <HuntEditorPanel />           // inline when editing or drafting
      <HuntNameRow />             // name + Edit tiles + collapse
      <GenderRow />               // 8 gender options
      <AttributeFilterSection x9 />
      <HeartsBlock />             // "How badly do you want this hunt?" (above summary)
      <HuntSummaryCard />         // plain-language summary + tightness badge
      <HuntActions />             // Delete + Save
  <GlobalFiltersSection />
  <PurchasedWatchesSection />
```

---

## 6. Behaviors

### 6.1 Inline edit (not global collapse)

- Saved hunts render as cards with name, hearts badge, summary, tightness, **Edit**.
- **Edit** or **New hunt** opens `HuntEditorPanel` inline (highlighted border).
- Collapse via chevron → discards draft or closes editor without saving (existing hunt card returns).

### 6.2 Attribute rows (multi-select + custom)

- Tap a chip to toggle it in/out of `picks`.
- "Or type your own" adds to `customs` and **`attributeLibrary`** for that section.
- **Edit tiles:** × removes chip from suggestions (`attributeHidden`); does not deselect from current hunt if already picked.
- Custom and preset values normalized via `normalizeCustomValue()` before compare.

### 6.3 Summary sentence + tightness

- Build plain-language sentence: gender (if not `both`), then `era, color, dial, model, collab, case, mvmt, cond, traits`.
- Append `· N♥` for hearts count.
- **Tightness badge:** count of attributes with ≥1 value. 0 = Wide open → 4+ = Very specific.

### 6.4 Hearts placement

**"How badly do you want this hunt?"** block sits **above the summary card**, not below attributes. Hearts picker 1–4; default 2.

### 6.5 Save semantics

- Save requires a name. New draft → `saved: true`, pushed to `hunts`. Existing → write back.
- Transient "Saved" flash on button (~1.6s).
- Any edit sets working copy `saved: false`.

### 6.6 Delete

- New draft: discard + collapse.
- Existing hunt: confirm → remove from `hunts`, collapse.

### 6.7 Global filters

Unchanged — price ceiling, ships-to-me + postal code on `/hunts`.

### 6.8 Purchased watches

Paste URL → simulated parse → feature pills. Optional image upload per row.

---

## 7. Visual / styling notes

- Map to GoodFinds tokens per [`design.md`](design.md) and [`globals.css`](../src/app/globals.css).
- Inline editor: `border-brass bg-brass/5` highlight.
- No browser-only persistence — hunts sync via zustand + [`/api/state`](../src/app/api/state/route.ts) ([`state-sync.tsx`](../src/components/state-sync.tsx)).

---

## 8. Persistence

| Field | Purpose |
|-------|---------|
| `hunts` | Saved hunt definitions |
| `attributeLibrary` | Reusable custom chips per attribute section |
| `attributeHidden` | Removed preset/custom tiles per section |
| `globalFilters` | Price + shipping gates |

Store key: **`caseback-state-v8`**. Server: Supabase `user_state` when signed in, else `data/store/state.json`.

---

## 9. Open decisions

1. **Discard on collapse** for existing hunts with unsaved edits — currently closes without prompt.
2. **Collab meta-option exclusivity** — not enforced in UI yet.
3. **`mvmt` ↔ `cond` linkage** ("Needs battery" only for quartz/electric).
4. **Collection → hunt loop** — suggest hunts from purchases.

---

## 10. Out of scope (future)

- Multi-hunt dashboard with unread-match counts.
- Alert delivery / notification cadence.
- Value-tracking ledger on purchases.
