# Identifiability — population-yield-climate, 800–1500 CE

**Status:** complete. This is the Phase 3 exit report.
**Generated:** 2026-08-13
**Mode:** REAL
**Reproduce:** `uv run python -m genesis_calibrate.run_rigor --generated 2026-08-13`

## Headline

The climate coupling cannot be constrained by the available data. `growth_rate`
is identifiable; `climate_sensitivity` is not, under every reading of the
observation uncertainty that we tested. The two carrying capacities flip verdict
depending on an assumption we had to make, so their verdicts are facts about the
assumption, not about history.

The mechanism Genesis's Rigor track exists to model is the one the data cannot
support.

## Scope

| | |
|---|---|
| Window | 800–1500 CE, century steps |
| Regions | Yellow River (China, ISO 156), Euro-Mediterranean (12 ISO codes) |
| Observations | **16** — 8 population points per region |
| Free parameters | 4 |
| Model | `P[t+1] = P[t] + r·P[t]·(1 − P[t] / (K_i·(1 + β·c[t])))` |

`r` (growth_rate) and `β` (climate_sensitivity) are shared; `K` is per region.

### Why the scope is this small

- **Window start 800 CE**: asia2k, the Asia temperature reconstruction, begins at
  800 CE. The roadmap asked for 500 BCE–1500 CE; 1,300 of those 2,000 years have
  no regional climate series.
- **Century steps**: HYDE reports population at 100-year resolution until 1700.
  This, not the climate data, is what caps the observation count at 16.
- **Nile dropped**: PAGES2k has 5 African records — Cold Air Cave (24°S), Malawi
  (10°S), Tanganyika (6°S), and a Gulf of Aden marine core (12°N/44°E, twice).
  The Nile Valley is 24–31°N/30–33°E. The nearest proxy is ~1,500 km away in a
  different climate regime. The region cannot be run at all, as primary or as
  holdout, without a climate input it does not have.

## Verdicts

Profile likelihood, χ²(1) at 95% → threshold 3.841.

| Parameter | Max Δ | Verdict | Robust to the σ assumption? |
|---|---|---|---|
| `growth_rate` | 16.37 | **IDENTIFIABLE** | Yes |
| `climate_sensitivity` | 0.61 | **NON_IDENTIFIED** | Yes |
| `k_yellow_river` | 3.56 | **NON_IDENTIFIED** | **No** |
| `k_euromed` | 1.49 | **NON_IDENTIFIED** | **No** |

## The assumption that is doing the work

HYDE ships base/lower/upper scenarios. It states no coverage for that spread, so
we treated the envelope half-width as ±1σ. That is our assumption, not HYDE's
claim. Re-running under looser readings:

| Parameter | envelope = 1σ | envelope = 2σ | envelope = 3σ |
|---|---|---|---|
| `growth_rate` | IDENTIFIABLE (16.4) | IDENTIFIABLE (65.5) | IDENTIFIABLE (147.4) |
| `climate_sensitivity` | NON_IDENTIFIED (0.6) | NON_IDENTIFIED (2.5) | WEAK (5.5) |
| `k_yellow_river` | NON_IDENTIFIED (3.6) | WEAK (14.2) | WEAK (32.0) |
| `k_euromed` | NON_IDENTIFIED (1.5) | IDENTIFIABLE (6.0) | IDENTIFIABLE (13.4) |

Two conclusions survive every reading: `growth_rate` is identifiable and
`climate_sensitivity` is not. The carrying capacities are assumption-dependent
and must not be reported as findings.

## A defect in the observation uncertainty itself

HYDE's lower/upper envelope is **a single global multiplier that depends only on
the year**. Verified across China, Italy, France, Egypt and India — the
upper/base ratio is identical for all of them: 1.5147 at 800 CE ramping to 1.3088
at 1500 CE.

It therefore carries no region-specific information. It cannot say that Chinese
population estimates are better or worse constrained than Egyptian ones, and
weighting a likelihood by it imposes the same relative uncertainty everywhere.
The roadmap's requirement to "encode observation uncertainty explicitly" cannot
be met from HYDE alone, because the per-region uncertainty does not exist in the
product.

## Data quality notes

- **asia2k is ragged.** 773 ensemble members with `-99.999` for missing, and
  members start in different years: 378 of 773 present at 800 CE, rising to 682
  by 1500. Early centuries rest on roughly half the ensemble.
- **EuroMed2k is better.** 138 BCE–2003 CE with published `Lower2sigma` /
  `Upper2sigma` columns — real stated uncertainty, unlike HYDE.
- **HYDE cropland is not independent evidence.** HYDE allocates land use using
  population, so fitting both population and cropland does not double the
  evidence. Not relied on here; flagged before anyone tries it.
- **China ≠ the Yellow River basin.** HYDE country tables cannot isolate the
  basin. The sub-national tables (`subpop_*.csv`) could, and that is the obvious
  refinement if this scope survives.

## What must happen to the non-identified parameters

Per the roadmap: delete, or pin to a literature value and retag `ESTIMATED`.

- `climate_sensitivity` — cannot be fitted. Either pin it from the literature and
  tag it ESTIMATED, or remove the coupling. Note that pinning it means the Rigor
  track no longer *estimates* the thing it was built to estimate.
- `k_yellow_river`, `k_euromed` — verdicts are assumption-dependent. Do not
  report either as a finding. Resolve the σ question first; that means getting a
  defensible coverage statement for HYDE's envelope, which HYDE does not provide.
- `growth_rate` — identifiable, proceed to calibration.

## What this model may not be used for

- Any claim about the effect of climate on historical population. That is the
  parameter the data cannot constrain.
- Any regional comparison of uncertainty, for the reason in the section above.
- Anything outside 800–1500 CE, or outside the two regions listed.
- The Nile Valley, in any capacity.

## Honest assessment

The Rigor track as specified does not survive this analysis. What survives is a
logistic growth model with one identifiable parameter and no climate coupling —
which is not the project the roadmap describes.

The roadmap anticipated this: "narrow to six, not proceed anyway", and "a small
defensible model beats a large indefensible one." The finding arrived before any
fitting was paid for, which is the cheap version. The options are recorded in the
next section for a human to choose between; the analysis does not choose.

## Options

1. **Accept the narrow result.** Ship logistic growth with `growth_rate`
   calibrated and no climate coupling. Honest, small, and does not deliver the
   project's central claim.
2. **Change the observable.** Century-resolution population is the binding
   constraint. An annually-resolved observable — harvest records, grain prices,
   the Roda Nilometer for a Nile revival — would change the arithmetic more than
   any modelling change.
3. **Resolve the σ question.** If HYDE's envelope can be given a defensible
   coverage, two carrying capacities may become identifiable. This does not
   rescue `climate_sensitivity`.
4. **Abandon the Rigor track** and put everything in Sandbox, correctly labelled.
   Per ADR 0004 this is a legitimate outcome, not a failure.
