---
description: Design system for the vintage-Timex tool. Apply to all UI work.
globs: ["**/*.tsx", "**/*.jsx", "**/*.css", "**/components/**"]
alwaysApply: true
---

# Design System — GoodFinds (Vintage Timex Tool)

Product name: **GoodFinds**. Visual reference: `/design/timex-tool-mockup.html` (static, non-production).
All UI must match that reference. When in doubt, open it and eyeball against it.

## Direction

**Modern editorial with analog warmth.** A collector's *working* reference tool —
fast, scannable, a little scrappy in spirit — not a luxury boutique and not a
generic SaaS dashboard. The user is a knowledgeable, nostalgia-driven hunter whose
reward is *the steal* (an underpriced find). The look is a credibility signal: it
must read as made by someone who understands the hobby.

Calibration guardrails:
- NOT the default "AI cream + high-contrast serif + terracotta" look.
- NOT luxury/precious (this user is a bargain hunter, not a Rolex buyer).
- NOT dense dashboard. Editorial, photo-forward, generous whitespace.

## Color tokens

Map these to the Tailwind theme. **Never use raw Tailwind palette defaults**
(no `slate`, `indigo`, `blue`, etc.). Every color comes from this set.

| Token        | Hex       | Use                                            |
|--------------|-----------|------------------------------------------------|
| `paper`      | `#E8E1D3` | page ground (warm oat)                          |
| `card`       | `#F4EFE4` | raised card surface                             |
| `ink`        | `#2A2118` | primary text, borders, dark fills (warm black)  |
| `ink-soft`   | `#6F6052` | secondary text, meta, captions (taupe)          |
| `brass`      | `#97681E` | structural accent: labels, left-rules, dots     |
| `steal`      | `#7E2B23` | THE STEAL signal + starred state (oxblood)      |
| `ok`         | `#4F6043` | "likely working" condition flag (olive)         |
| `line`       | `rgba(42,33,24,.14)` | hairline dividers                     |
| `line-strong`| `rgba(42,33,24,.28)` | card borders, chips                   |

- `brass` and `steal` are distinct roles: `brass` = general structure/warmth,
  `steal` = the underpriced-find moment + positive user signal (star). Do not merge.
- Backgrounds carry a faint paper grain (subtle radial-dot texture, ~2% opacity).

### shadcn/ui semantic tokens

shadcn components (`Button`, `Input`, `Switch`, etc.) use semantic CSS variables defined in [`src/app/globals.css`](../src/app/globals.css) and mapped to the GoodFinds palette:

| Semantic | Maps to |
|----------|---------|
| `background` | `paper` |
| `foreground` / `primary` | `ink` |
| `primary-foreground` | `card` |
| `muted-foreground` | `ink-soft` |
| `accent` | brass tint |
| `destructive` | `steal` |
| `border` / `input` | `line` / `line-strong` |
| `ring` | `steal` (focus) |

Custom tokens (`paper`, `card`, `ink`, `brass`, `steal`, …) remain the source of truth for bespoke layout; semantic tokens keep shadcn primitives styled consistently.

## Typography

Three faces, three jobs. Load via Google Fonts.

- **Fraunces** — display only: model/product names, section headings, the wordmark.
  Used sparingly and with weight (500–600). Optical sizing + slight SOFT axis.
  This is where the character lives; do not spread it across UI chrome.
- **Inter** — all UI: labels, body, buttons, nav, notes.
- **JetBrains Mono** — ALL numeric/ledger data: prices, shipping math, match scores,
  item IDs, scan numbers, eyebrow labels. The price-tag/ledger feel is intentional
  and load-bearing — it's what separates this from generic editorial warmth.

Rule of thumb: if it's a number or a code, it's mono. If it's a name or a heading,
it's Fraunces. Everything else is Inter.

## Card anatomy (non-negotiable order)

Every candidate card presents information in this sequence:

1. **Watch image** — hero of the card; it's a visual hobby, the photo sells it.
2. **Match score** — mono, in `steal` color, with a small "match" label.
3. **Model name** — Fraunces, large.
4. **Spec line** — era · movement · case, in `ink-soft`.
5. **"Why this surfaced"** — the taste-reasoning note. Brass left-rule, italic
   (Fraunces italic), written in a knowledgeable-friend voice. This is the
   tool showing its work; it is required on every card, never omitted.
6. **Landed-cost ledger** — total to destination, with the **item + shipping split
   shown** (never just a single price). Flag when shipping is unconfirmed.
7. **Condition flag** — likely-working (`ok`) / uncertain (`brass`), with the
   evidence behind it. A confidence read, never a guarantee.
8. **Actions** — Star · Dismiss · View on source.

## Principles

- **Calm and scannable over dense.** Whitespace is a feature; the user's attention
  is the scarce resource.
- **Show the reasoning.** Every surfaced listing explains why it's there.
- **The steal gets a quiet moment**, not a loud banner. Use the letterpress-style
  oxblood stamp (slightly rotated, `multiply` blend). Never e-commerce urgency
  ("DEAL!", countdowns, red CTAs).
- **Surface-with-a-flag, don't silently drop.** Cost-unconfirmed and
  condition-uncertain items appear with a warning. Items gated out (over budget,
  undeliverable) may be shown greyed/struck-through for transparency, so the user
  sees the tool caught something interesting and is honestly holding it back.
- **Honest uncertainty shown plainly** — confidence flags are visible, not hidden
  or over-styled.

## Component conventions

- Border-radius small: 2–4px. No pill-shaped cards, no large rounded corners.
- Borders + faint grain do the work; avoid heavy drop shadows. One soft elevation
  shadow max, only on the hero card.
- Buttons: outline default (ink border), one solid dark primary ("View on source").
  Starred state switches to `steal`.
- Visible keyboard focus everywhere: `2px solid steal`, offset 2px.
- Responsive to mobile (single column ≤680px). Respect `prefers-reduced-motion`.
- Motion is restrained: hover lift (~2px) + subtle entrance fade-up. Nothing more.

## Copy voice

- Plain verbs, sentence case, no filler. Name things by what the user controls.
- The "why it surfaced" note sounds like a knowledgeable friend's margin remark,
  not marketing. Specific over clever ("Cushion case and applied markers — straight
  off your Marlin buys" > "A stunning timeless classic!").
- Empty/failure states give direction, not mood. An empty list invites action.

## What this file is / isn't

The HTML reference is a **target to build toward**, not a component to import or
extend. Build the real thing in React/Tailwind/shadcn deriving every color and type
decision from the tokens above. Keep the reference in `/design/`, never `/src/`.
