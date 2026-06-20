# GoodFinds — Hunt Builder & Collection: Build Spec

Shipped spec for the vintage Timex hunt builder at `/hunts`. Adapt class names and tokens to the
existing GoodFinds Next.js / Tailwind design system ([`design.md`](design.md)).

---

## 1. What this is

A single screen with four stacked regions:

1. **Saved hunts bar** — chips for each saved hunt + a "New hunt" button.
2. **Hunt builder** — collapsible form for defining/editing one hunt. Collapsed
   by default; expands when a hunt is selected or a new one is started.
3. **Global filters** — settings that apply to every hunt (price ceiling,
   ships-to-my-address). Always visible.
4. **Purchased watches** — a list of listing links the user has bought; each link
   is auto-parsed into the same attribute schema the hunts use.

A "hunt" is a saved search. Users run several at once; each is its own attribute
set and (conceptually) its own alert stream. The product matches incoming
listings against hunts and notifies the user.

---

## 2. Core domain concepts

### 2.1 Gates vs. taste

Two fundamentally different kinds of criteria. Keep them distinct in both the
data model and the UI.

- **Taste (soft preferences):** the per-hunt attributes (model, dial, era,
  condition grade, etc.). Multiple values allowed per attribute; within an
  attribute they mean OR. These rank listings via hunt score, not hard-exclude
  (except where noted).
- **Gates (hard constraints):** global filters (price ceiling, ships-to-me) and
  per-hunt **gender** (Men's / Women's / Both). Binary; a listing that fails
  fails the gate for that hunt.

### 2.2 Per-hunt vs. global

- **Per-hunt:** **gender**, model, collaboration, dial pattern, dial color, era, case size,
  movement, condition grade. Each hunt has its own values.
- **Global:** price ceiling, ships-to-my-address (+ postal code). Set once,
  applied to all hunts.

> **Open decision:** condition grade is currently per-hunt (each hunt can hold a
> different standard). If product wants a single house standard, move it global —
> but per-hunt is the recommended default because collectors hold condition
> loosely and per-target.

### 2.3 Draft vs. saved

- A **new hunt is a transient draft** held outside the saved list. It is **not**
  created/persisted until the user hits **Save**.
- Editing an existing saved hunt marks it **dirty** (unsaved changes) until
  re-saved.
- This separation is the key fix that prevents phantom hunts from appearing in
  the list before the user commits.

---

## 3. Data model (TypeScript)

```ts
// Attribute keys for per-hunt taste fields
type AttrKey =
  | 'model' | 'collab' | 'dial' | 'color'
  | 'era' | 'case' | 'mvmt' | 'cond';

interface HuntAttribute {
  // Preset chips the user selected (from the option list for this key)
  picks: string[];
  // Free-text values the user typed (comma-separated input, split + trimmed)
  customs: string[];
}

type HuntGender = 'mens' | 'womens' | 'both';

interface Hunt {
  id: string;                      // uuid; assigned on first save
  name: string;
  saved: boolean;                  // false = dirty / never-saved draft
  gender: HuntGender;              // default 'both'; acts as per-hunt gate when not 'both'
  attributes: Record<AttrKey, HuntAttribute>;
  createdAt: string;
  updatedAt: string;
}

// normalizeHunt() fills missing gender/attributes on persisted hunts (migration).

interface GlobalFilters {
  priceCeiling: number | null;     // null = no limit
  shipsToMe: boolean;
  postalCode: string | null;       // required when shipsToMe is true
}

interface ExtractedFeatures {
  model?: string;
  year?: string;                   // or era bucket
  dial?: string;
  color?: string;
  cond?: string;
  // production: add reference/dial code, caseSize, movement, price,
  // and a per-field confidence (see §8)
}

interface PurchasedWatch {
  id: string;
  url: string;
  parsing: boolean;                // true while extraction is in flight
  features: ExtractedFeatures | null;
  // production: pricePaid, purchasedAt
}
```

### Editing buffer

The builder edits a **working copy**, not the stored object:

- New hunt → a fresh `Hunt` with `saved: false`, kept in a `draft` slot.
- Existing hunt → edit a clone via `normalizeHunt()`; commit back on Save.

Shipped: working copy for **both** new and existing hunts ([`hunt-builder-screen.tsx`](../src/components/hunt-builder-screen.tsx)).

---

## 4. Field taxonomy

### Gender (per-hunt gate)

Rendered above the eight attribute rows. Options ([`HUNT_GENDER_OPTIONS`](../src/lib/hunts/types.ts)):

| Value | Label |
|-------|--------|
| `both` | Men's & Women's |
| `mens` | Men's |
| `womens` | Women's |

Listing gender is inferred from marketplace titles at normalize time and re-checked at match time ([`src/lib/listings/gender.ts`](../src/lib/listings/gender.ts)). A gender-only hunt (no attribute chips) still drives **Watch-list** matches.

### Taste attributes

Per-hunt attributes and their preset options. Each is **multi-select** and also
accepts free-text ("or type your own"). Order matters for the summary sentence
(see §6.4).

| Key      | Label            | Icon (Tabler)   | Options |
|----------|------------------|-----------------|---------|
| `model`  | Model / line     | `tag`           | Marlin, Viscount, Mercury, 17/21 jewel, Camper, Electric, Diver |
| `collab` | Collaboration    | `users`         | Any collab, Peanuts, Disney, Keith Haring, Coca-Cola, Todd Snyder, House brand only |
| `dial`   | Dial pattern     | `grid-dots`     | Crosshair, Dot-dash, Plain 2/3-hand, Numerals, Day/date |
| `color`  | Dial color       | `palette`       | Silver, Champagne, Black, Blue, White, Patina |
| `era`    | Era              | `calendar`      | 1950s, Early 60s, Late 60s, 1970s, 1980s |
| `case`   | Case size        | `circle`        | Under 32mm, 32–35mm, 35–38mm, Over 38mm |
| `mvmt`   | Movement         | `settings`      | Manual wind, Self-wind / auto, Electric |
| `cond`   | Condition grade  | `sparkles`      | Deadstock, NOS / unworn, Excellent, Good / worn, Honest patina, Needs battery, For parts / project |

**Condition ladder note:** "Deadstock" is the top rung (never sold, often
tagged) — a premium subset of NOS, not a separate axis. "Needs battery" only
makes sense for quartz/electric movements; consider gating it on the `mvmt`
selection in production.

**Collaboration meta-options:** "Any collab" = any co-branded edition;
"House brand only" = exclude collabs. In production these two should be mutually
exclusive with the named partners (selecting one clears the others) to avoid
contradictions like "no collabs or Peanuts edition".

> Placeholder lists. Replace with the real GoodFinds model/reference taxonomy. Drive
> chip options from data, not hardcoded arrays.

---

## 5. Component tree

```
<HuntBuilderScreen>
  <SavedHuntsBar
      hunts, editingId, onSelect, onNew, draftActive />
  <HuntForm                       // collapsible
      hunt (working copy), expanded,
      onChangeAttr, onRename, onSave, onDelete, onCollapse />
    <HuntNameRow />               // name input + collapse chevron
    <GenderRow />                 // Men's & Women's | Men's | Women's
    <AttributeRow x8 />           // chips (multi-select) + free-text input
    <HuntSummaryCard />           // plain-language summary + tightness badge
    <HuntActions />               // [unsaved hint] [Delete] [Save hunt]
  <GlobalFilters
      filters, onChange />
    <PriceCeilingField />
    <ShipsToMeField />            // toggle + postal code input
  <PurchasedWatches
      items, onAdd, onRemove, onEdit />
    <PurchaseRow />               // link + auto-extracted feature pills
```

---

## 6. Behaviors

### 6.1 Collapse / expand (HuntForm)

- **Collapsed by default** on load. Show only the saved bar, "New hunt", and a
  muted prompt: "Select a saved hunt to edit, or start a 'New hunt'."
- Expands when: user clicks a saved-hunt chip, **or** clicks "New hunt".
- Collapse via: the chevron button in the name row, or clicking the currently-
  open saved chip again (toggle).
- `expanded === (editingId != null || draft != null)`.

### 6.2 Saved bar

- Renders a chip per **saved** hunt only (drafts never appear here).
- Active (currently-edited) chip is highlighted.
- A saved hunt with unsaved edits shows a small warning dot.
- When a new draft is open, show an inline italic tag after "New hunt":
  "new hunt (unsaved)" — so the user knows a draft is in progress without a chip
  being created.

### 6.3 Attribute rows (multi-select + custom)

- Tap a chip to toggle it in/out of `picks`. Selected chips show a check.
- The "or type your own" field parses on input: split on commas, trim, drop
  empties → `customs`.
- Chips and customs coexist (no override); the row's effective value is
  `picks ∪ customs`.
- The row label shows the joined values or "Any".
- **Normalize custom entries** in production: run them through the same
  normalization / dial-code resolution as presets so "crosshair", "cross hair",
  and "cross-hair" collapse to one value. Otherwise free-text recreates the
  keyword-search problem the tool exists to solve.

### 6.4 Summary sentence + tightness

- Build a plain-language sentence from selected attributes in this order:
  gender (if not `both`), then `era, color, dial, model, collab, case, mvmt, cond`.
- Within an attribute join with "or"; across attributes join with " · ".
- `collab` rewrites: "Any collab" → "collab edition"; "House brand only" →
  "no collabs"; named → "{name} edition".
- `cond` renders as a trailing clause: "in {x or y} condition".
- If no `model` is selected, append "Timex" / "vintage Timex".
- **Tightness badge:** count of attributes with ≥1 value. 0 = "Wide open",
  1 = "Loose", 2–3 = "Focused", 4+ = "Very specific" (escalate color toward a
  warning tone at 4+). This warns users before they build a hunt so narrow it
  never fires. Note: adding more values *within* one attribute loosens it but
  doesn't change the count — surface this somewhere in production.

### 6.5 Save semantics

- Save requires a name. If empty, focus the name field and show an inline error
  hint; do not save.
- New draft on save: stamp `saved: true`, push into `hunts`, switch `editingId`
  to the new hunt, clear the draft slot. Form stays open showing the now-saved
  hunt.
- Existing hunt on save: write name + `saved: true` back to the stored hunt.
- Show transient "Saved" confirmation on the button (~1.6s), then reset.
- Any edit (chip, custom, rename) sets the working copy `saved: false` and shows
  "Unsaved changes".

### 6.6 Delete

- New draft: "Discard this new hunt?" → drop draft, collapse.
- Existing hunt: confirm "Delete '{name}'? This can't be undone." → remove from
  `hunts`, collapse.
- Delete is the destructive action: style it secondary (danger text), separated
  from Save, and keep it at the **bottom** of the form (not the top) so it isn't
  hit by reflex.

> Production: prefer an **undo toast** over a blocking confirm, and warn when a
> hunt with accumulated match/alert history is deleted (you're discarding history,
> not just criteria).

### 6.7 Global filters

- **Price ceiling:** numeric; null = no limit.
- **Ships to my address:** toggle. When on, enable + focus the postal code field
  and require it. Update the helper line to reflect on/off state.
- Keep ships-to-me distinct from any provenance/seller-location concept: it
  answers "can I actually buy this" (will they ship to me), which is different
  from "where is it sourced." Seller location was intentionally removed; if
  provenance filtering returns, make it **per-hunt**, not global.
- Postal code unlocks **landed-cost** estimation in production (shipping + duties
  folded into the price-ceiling gate), which is a better gate than price alone.

### 6.8 Purchased watches

- Input + Add (also Enter to submit). Prepend `https://` if missing scheme.
- On add: push `{ url, parsing: true, features: null }`, then call the listing
  parser. Show a "Reading listing…" state until it resolves into feature pills.
- Feature pills use the **same vocabulary** as the hunt attributes (incl. the
  condition ladder) so the collection and hunts speak the same language.
- Pills are editable (parsers are imperfect) — provide an edit affordance.
- Each row has open-link and remove actions.

> **Prototype caveat:** the sandbox can't fetch external URLs, so extraction is
> simulated. In production this calls a real listing parser/scraper.

---

## 7. Visual / styling notes

- Map everything to existing GoodFinds tokens (`paper`, `card`, `ink`, `brass`, `steal`, …).
  shadcn/ui components use semantic CSS variables mapped to the same palette in
  [`globals.css`](../src/app/globals.css).
- Chips: pill radius, 0.5px borders, info-tinted background when selected.
- Cards/sections: white surface, 0.5px border, lg radius.
- Selected chip = check icon + tinted bg; unselected = transparent + muted text.
- Icons: Tabler outline set (names listed in §4). Decorative icons get
  `aria-hidden`; icon-only buttons get `aria-label`.
- Sentence case throughout. Two font weights only (regular + medium).
- No browser-only persistence — hunts sync via zustand + [`/api/state`](../src/app/api/state/route.ts) ([`state-sync.tsx`](../src/components/state-sync.tsx)).

---

## 8. Extraction & confidence (production)

When parsing a listing into `ExtractedFeatures`, tag each field with a confidence
source so the UI can show which fields to trust vs. eyeball:

- **From structured listing specs** (high): reference number, dial pattern, case
  size, movement, water resistance.
- **Inferred from free-text description** (medium): condition, originality.
- **Needs human eyes** (low): redial detection, true condition vs. seller
  optimism, dial code hidden under the bezel.

The dial code is ground truth for model identity (sellers mislabel everything a
"Marlin"). Resolve model from the dial/reference code, not the listing title —
this applies to both hunt matching and purchase extraction.

---

## 9. Open decisions to resolve before/while building

1. ~~**Working copy for existing hunts.**~~ Shipped.
2. **Discard semantics.** New draft discards on collapse (good). Decide what an
   existing hunt with unsaved edits does on collapse: revert, prompt, or keep.
3. **Condition: per-hunt vs. global default-with-override.** Recommended:
   per-hunt, optionally seeded by a global default a hunt can override.
4. **Taste as ranking, not just filtering.** The prototype filters; the better
   model scores/ranks survivors of the gates, with a per-attribute importance
   (nice / want / dealbreaker) where "dealbreaker" promotes a soft preference to
   a hard gate.
5. **Collab meta-option exclusivity** (§4).
6. **`mvmt` ↔ `cond` linkage** ("Needs battery" only for quartz/electric).
7. **Custom-value normalization** (§6.3).
8. **Collection → hunt loop.** Once purchases are parsed, compare realized taste
   (what they bought) against declared hunts and suggest "hunts based on what you
   own". Highest-value follow-on.

---

## 10. Out of scope (future screens)

- Multi-hunt **dashboard** (all hunts with unread-match counts).
- Listing **match-detail card** (a single listing scored against a hunt with a
  per-attribute breakdown).
- Alert delivery settings / notification cadence.
- Value-tracking ledger on purchases (price paid, current estimated value).
