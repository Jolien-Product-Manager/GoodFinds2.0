# GoodFinds — Problem Framing

**Core job:** *"I want a better way to stay on top of interesting vintage Timex listings across the market."*

---

## The Problem

### 1. Surfacing — find every vintage Timex worth my attention

- **1.1 Multi-marketplace coverage** — Users don't want to visit each platform (eBay, Chrono24, Etsy, and beyond) and run the same queries by hand.
  *"Finding good pieces means manually checking multiple sites."*
- **1.2 Match & taste capture** — Users want help storing and refining their sense of "interesting." They know it when they see it but can't write it as a filter or remember everything they like.
  *"Remembering what I like."*
- **1.3 Coverage confidence** — Users want to trust they're seeing everything worth their attention (FOMO).
  *"Hoping I don't miss something."*
- **1.4 Ranking & highlighting** — Users want to see all viable listings, with the strongest candidates explicitly flagged so they know where to look first.
  *"Highlights and identifies potential purchase candidates worth paying attention to."*

### 2. Constraints — can I actually get it to my door within budget?

- **2.1 Total cost** — Users want to know upfront the total delivered cost to secure a watch under $X: list + shipping + duties/tax, not list price alone.
- **2.2 Deliverability** — Users only want to see what can actually reach them. If it can't ship to M6K1V8, it shouldn't be surfaced.
  *"Less than $50 in total cost (including shipping to M6K1V8)."*
- **2.3 Continuity** — Hunts, dismissals, and saved listings should follow the user across devices (optional Supabase sign-in).

### 3. Trust — can I believe what the listing tells me?

- **3.1 Product identification** — Listings mislabel or omit brand, model, and era, so a piece can't be found or matched on words alone. Mostly omission, not deception.
- **3.2 Condition misrepresentation** — Sellers describe condition vaguely or optimistically with thin photos, because they're motivated to sell. Users want confidence the watch is functional and at most needs a battery.
- **3.3 Duplication** — The same watch can appear across eBay, Etsy, and Chrono24 at once. Seeing pieces I've already judged wastes attention on a decision I've already made.

---

## The User

A knowledgeable, nostalgia- and design-driven hobbyist hunting cheap, characterful pieces — frustrated by how much effort it takes to find good watches.

**Why vintage Timex:** Timex is the watch normal people actually wore — their grandfather's, their dad's, their first watch. Collectors hunt it not for status or investment, but for a feeling tied to a person and a time they loved.

**Key characteristics:**

- **Collects era and story, not horology.** Driven by nostalgia, design, colorways, collabs, and cultural resonance.
- **Knows what they want.** Taste is specific, not open-ended browsing — a grail Marlin dial, a 1970s Electric, a Peanuts collab. They can spot a match from a thumbnail; the hard part is remembering every variant they're hunting and not missing one when it lists.
- **Hunter, not investor.** Collects for love of the watch and the thrill of the find. Pieces trade cheap and don't appreciate, so the sub-$50 ceiling is intrinsic to the hobby, not a budget imposed on it.
- **Knowledge-rich, time-poor.** Knows more than most sellers but can't be everywhere; time is the scarce resource.
- **High-frequency, low-stakes decisions.** Scans a lot, buys often, each buy is cheap — tolerates volume and the odd miss, but not wasted time.
- **Community-embedded.** Clusters in forums, subreddits, and groups that double as taste signal and parallel marketplaces.

**How they typically search today:**

- **Repeat the same queries** across eBay, Chrono24, and Etsy — e.g. `vintage timex`, `timex marlin`, `timex electric`, model names, decade terms — often sorted by newly listed.
- **Hunt by model or vibe**, not SKU: scroll search results and saved searches, skim thumbnails and titles, open anything that *might* be the right era, dial, or collab.
- **Filter in their head** after clicking — price + shipping to their postal code, "does it actually run?", women's vs men's, parts vs wearable.
- **Keep mental lists** of what they're looking for (and what they've already passed on) because marketplaces don't remember taste across sessions or sites.

**Dimensions they typically care about:**

| Dimension | What they're judging |
|-----------|----------------------|
| **Model / line** | Marlin, Q, Expedition, Sprite, Viscount, Mercury, etc. |
| **Era** | 1960s–1990s buckets; "looks right for the decade" |
| **Dial** | Crosshair, sunburst, linen, day-date layout, character dials |
| **Color** | Blue, gold, silver, black, two-tone |
| **Collab / theme** | Peanuts, Disney, Keith Haring, NFL, house-brand only |
| **Case** | Size, shape, gold-tone vs steel, cushion vs round |
| **Movement** | Manual, automatic, electric, quartz — often "runs" matters more than caliber snobbery |
| **Condition** | Running vs for-parts; NOS/deadstock vs daily wear |
| **Gender / wear** | Men's, women's, children's — from title and case size |
| **Traits** | Tags on, box, papers, unpolished, original bracelet |
| **Buy-ability** | Landed cost under ~$50, ships to their address |

**Special features they're hunting for:**

Beyond model and era, collectors chase *character* — the details that turn a generic Timex into a grail:

- **Licensed / character dials** — Peanuts (Snoopy), Disney (Mickey, Donald), Keith Haring, Pac-Man, Coca-Cola, NASA, Todd Snyder; often searched by collab name, not model number.
- **Distinctive dial layouts** — crosshair, day-date windows, character art, unusual numerals, patina, two-tone or gold-tone dials.
- **Era-specific tech** — Electric movements (late 60s–70s), early quartz transitions, Indiglo night-light, chronograph / dive bezels, alarm complications.
- **Mint-inventory finds** — NOS, deadstock, tags still on, original box (MIB), unworn store stock — the "time capsule" pieces.
- **Authenticity signals** — original dial (not redial), readable date codes (M69–M80), intact case plating, original crystal, matching bracelet.
- **Running & complete** — "runs" or "working" is table stakes; for-parts and untested are pass unless the dial alone is worth it.
- **Personal grails** — free-form traits they type in: a specific colorway, a forum-mentioned variant, "brass showing," unpolished case, full set, etc.

These are often buried in listing titles and photos, not structured fields — which is why keyword search alone misses them and hunt matching matters.

These map to hunt attributes in the app; buy-ability maps to global gates on `/hunts`.

---

## How We Measure Success

**North Star:** *Listing click-throughs per session* — how many times a user opens an active marketplace listing (signals purchase intent).

**Efficiency guardrail:** *Time to first click-through* — how long from opening the tool to clicking through to the first listing they'd buy.

### Influencing metrics (inputs that move the North Star)

- **Saves per session** — how many watches marked **Interesting**; a leading indicator before click-through.
- **Taste-match precision** — % of surfaced listings the user saves or clicks through to.
- **Coverage** — share of the relevant market the tool actually pulls from.
- **Time-to-surface** — how fast a new listing reaches the user (matters in alert mode).
- **Estimate accuracy** — how close predicted landed cost lands to checkout.
- **Ranking quality** — are click-throughs and saves concentrated near the top of the list?

### Guardrails (failure modes the North Star could mask)

- **Leakage → 0** — % surfaced that turn out over $50 to the door or undeliverable.
- **Bad listings → 0** — % of surfaced listings that aren't watches.
- **Dud rate → 0** — % of "looked sound" watches that arrive broken.
- **Sampled miss-rate** — gems that existed but were never shown (spot-checked; the counterweight that stops the tool getting timid).
