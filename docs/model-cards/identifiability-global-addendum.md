# Addendum — does going global rescue the climate coupling?

**Status:** complete. Extends `identifiability-800-1500.md`.
**Generated:** 2026-08-14
**Reproduce:** `uv run python -m genesis_calibrate.run_global`

## Why this was run

The first pass used two aggregated regions and got 16 observations. That is a
scope choice, not a fact about the data — HYDE reports every country. If a
climate sensitivity shared across countries is constrained by all of them at
once, more countries might constrain the parameter the first pass could not.

Worth testing before accepting that comprehensive coverage and defensible claims
are opposed.

## What scaling up actually did

29 countries across the two climate domains, same window:

| Setup | Observations | `climate_sensitivity` max Δ | Verdict |
|---|---|---|---|
| 2 aggregated regions | 16 | 0.61 | NON_IDENTIFIED |
| 29 countries, 800–1500 | 232 | 3.16 | NON_IDENTIFIED |
| 29 countries, Europe extended to 0 CE | 408 | 29.19 | passes threshold |

So the mechanism works. More regions does constrain a shared parameter, and at
408 observations the profile clears the χ² threshold comfortably.

That result does not survive inspection.

## Why the passing result is not a finding

**The optimum was sitting on the box bound.** At `(-2, 2)` the fit returned
exactly −2.0; at `(-8, 8)` exactly −8.0. A profile computed against a clamped
optimum describes the box, not the data — the failure mode already documented in
`profile.py` and pinned by a test. Widening to `(-40, 40)` moved the optimum
interior at −10.18.

**−10.18 is not physical.** Under the linear form `K·(1 + β·c)`, that drives
carrying capacity negative for any positive anomaly. The fit was exploiting the
functional form. Switching to `K·exp(β·c)`, which cannot go negative, did not
fix it — β went to the bound again.

**The sign is not stable.** Running all four combinations of capacity form and
detrending:

| Form | Detrended | β | max Δ | Verdict |
|---|---|---|---|---|
| linear | no | −0.0614 | 1225.68 | IDENTIFIABLE |
| linear | yes | **+0.0710** | 1202.31 | IDENTIFIABLE |
| exponential | no | −0.0561 | 929.37 | IDENTIFIABLE |
| exponential | yes | −0.0529 | 281.65 | IDENTIFIABLE |

Every one of these formally passes. The fitted value changes sign depending on
whether a linear trend is removed from the climate series, and across the wider
set of defensible choices β ranges from −10.2 to +0.07.

A parameter whose sign is decided by a preprocessing choice is not measuring
anything. Population rises across the window and the anomaly series falls, so β
absorbs the trend. This is spurious regression between two trending series, and
the profile likelihood cannot see the difference — it only asks whether the
likelihood is bounded, not whether the thing being bounded is real.

## Conclusion

**Scale does not rescue the climate coupling.** The constraint is not the number
of observations, it is that century-resolution population and century-averaged
temperature do not contain the coupling signal. Adding countries adds data of the
same kind, and more of a signal that is not there is still not there.

`growth_rate` remains robustly identifiable — max Δ over 1600 with an interior
optimum, across 29 countries and up to 1500 years. That is a real result and it
is global.

## Consequence for the roadmap

The original recommendation stands and is now better evidenced: constraining the
climate coupling needs a **different observable**, not more of the same one.
Annual-resolution series — harvest records, grain prices, flood records — would
change the arithmetic. Another 200 countries would not.

## Guard added

`run_global` checks the sign of β across all four configurations and refuses to
report a value when it flips. A future run that quietly returns one number
without that check would look like a finding.
