# Interface bar

What Phase 6 is measured against. Written in Phase 0 so the target exists before
the map does.

## Reference set

| Source | What it does well | What we take |
|---|---|---|
| Crusader Kings III / Victoria 3 | Nested tooltips: hover any number, get its breakdown; hover a term inside that breakdown, keep drilling | The interaction model for the provenance inspector |
| Victoria 3 (as a warning) | Community consensus that menus are oversized and low-density for the information shown | Density discipline. Panels are instruments, not landing pages |
| Factorio production statistics | Rates and history for every item on one screen, readable at a glance | Layout for run-level summaries |
| Dwarf Fortress (both UIs) | Old UI: unreadable, fast once learned. New UI: readable, slower | Do not trade readability for speed or the reverse — keyboard paths alongside a readable default |
| deck.gl / kepler.gl | Millions of features at 60fps; `TimelineWidget` is a solved time-scrubber | The rendering and scrubbing stack for the map |
| Uncertainty-visualization literature | Quantile dotplots and hypothetical outcome plots beat intervals for lay statistical inference; adding a mean line biases readers toward discounting spread | How Rigor output is drawn |

## What transfers

**Nested tooltips are the provenance inspector.** Paradox already solved the
interaction: every number is hoverable, the hover shows what produced it, and the
terms inside the hover are themselves hoverable. Our version has the advantage
that the breakdown is not authored — it is the `Factor[]` ledger, so it cannot
drift from the computation. The ≤3-click gate is the same idea with a floor on
effort.

**Density is a feature.** The Victoria 3 complaint is not "too much information,"
it is "too much chrome per unit of information." Hairlines over panels, monospace
for anything the system asserts about itself, no card where a row will do.

**Time is a first-class axis, not a control.** deck.gl treats the timeline as a
data structure rather than a fire-once animation. Snapshots make scrubbing a seek,
not a replay.

## What Rigor output may look like

The uncertainty literature is directly binding here, because Rigor mode emits
intervals and nothing else (locked invariant #6):

- Prefer quantile dotplots and hypothetical outcome plots to bare intervals. A
  lone interval reads as a category — "inside or outside" — which is the wrong
  mental model for a posterior.
- Do not add a mean line by default. It measurably biases readers toward
  discounting the spread, which is the opposite of the point.
- Never a probability statement over a historical counterfactual, in any visual
  form. A shaded band with a percentage label is such a statement.

## Colour

The provenance triple was chosen by running the palette validator, not by eye.

The intuitive mapping — green CALIBRATED, amber ESTIMATED, red INVENTED — **fails**:
green↔red measures ΔE 4.1 under deuteranopia (target ≥ 8). Shipping it would mean
the single most important signal in the product is invisible to roughly 1 in 12
men.

Adopted instead, validated all-pairs against the `#1a1a19` surface:

| Tag | Hex | Glyph |
|---|---|---|
| CALIBRATED | `#3987e5` | ◆ |
| ESTIMATED | `#c98500` | ◐ |
| INVENTED | `#d55181` | ▲ |

Worst all-pairs CVD ΔE 13.2 (deutan), normal-vision ΔE 19.3, all ≥ 3:1 contrast.
Colour is never the only channel regardless — every tag carries its glyph and the
word. These three hues are reserved and may not be reused as chart series.

## The bar

Testable, in the same spirit as the phase gates:

1. Any state value at any tick traces to its contributing factors in ≤ 3 clicks.
2. Every number on screen that came from a parameter can show its provenance
   without leaving the view.
3. No screen exists where Sandbox output could be mistaken for Rigor output. The
   hatch watermark survives a screenshot and greyscale.
4. Rigor output never renders as a point estimate.
5. The map holds 60fps while scrubbing a 5000-year run.
6. The provenance signal is legible under deuteranopia, protanopia, greyscale and
   forced-colors.

## Sources

- [Victoria 3 nested tooltip system](https://www.pcgamesn.com/victoria-3/nested-tooltip-system)
- [Victoria 3 Dev Diary #74 — UX improvements](https://www.paradoxinteractive.com/games/victoria-3/news/dev-diary-74-ux-improvements)
- [Victoria 3 UI criticism thread](https://forum.paradoxplaza.com/forum/threads/user-inter-fiasco-victoria-iiis-abysmal-ui.1561896/)
- [Factorio FFF #337 — Statistics GUI](https://factorio.com/blog/post/fff-337)
- [Factorio production statistics](https://wiki.factorio.com/Production_statistics)
- [Dwarf Fortress / RimWorld UI comparison thread](https://forums.factorio.com/viewtopic.php?t=50467)
- [deck.gl TimelineWidget](https://deck.gl/docs/api-reference/widgets/timeline-widget)
- [deck.gl animations and transitions](https://deck.gl/docs/developer-guide/animations-and-transitions)
- [kepler.gl](https://kepler.gl/)
- [Padilla, Kay & Hullman — Uncertainty Visualization](http://space.ucmerced.edu/Downloads/publications/Uncertainty_Visualization_Padilla_Kay_Hullman_2022.pdf)
- [Visual Reasoning Strategies for Effect Size Judgments and Decisions](https://arxiv.org/pdf/2007.14516)
