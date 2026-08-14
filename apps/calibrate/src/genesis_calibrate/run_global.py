"""Phase 3, at scale. Every country in a climate domain, not two aggregates.

    uv run python -m genesis_calibrate.run_global

Runs the shared climate sensitivity four ways: linear and exponential capacity,
each against raw and detrended anomalies. A sensitivity that changes sign across
those four is fitting trend, not climate.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np

from .datasets.global_series import build_global
from .identifiability.profile import profile_likelihood
from .models import rigor_global as rg


def probe(regions: list, form: str, detrended: bool) -> dict[str, float | str | bool]:
    series = rg.detrend(regions) if detrended else regions
    bounds = rg.bounds_for(series)
    start = rg.start_for(series)

    def nll(theta: np.ndarray) -> float:
        return rg.negloglik(theta, series, form)

    result = profile_likelihood(
        nll, start, bounds, index=1, name="climate_sensitivity",
        grid_points=25, grid_bounds=(-30.0, 30.0),
    )
    low, high = bounds[1]
    return {
        "form": form,
        "detrended": detrended,
        "best": round(result.best, 4),
        "max_delta": round(result.max_delta, 2),
        "on_bound": abs(result.best - low) < 1e-6 or abs(result.best - high) < 1e-6,
        "verdict": (
            "IDENTIFIABLE"
            if result.exceeds_below and result.exceeds_above
            else "WEAK"
            if result.exceeds_below or result.exceeds_above
            else "NON_IDENTIFIED"
        ),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="genesis-run-global")
    parser.add_argument("--root", type=Path, default=Path("data/raw"))
    args = parser.parse_args(argv)

    regions = build_global(args.root)
    print(f"countries: {len(regions)}   observations: {sum(len(r) for r in regions)}")

    signs = set()
    for form in ("linear", "exponential"):
        for detrended in (False, True):
            row = probe(regions, form, detrended)
            signs.add(np.sign(float(row["best"])))
            print(
                f"  {row['form']:<12} detrended={row['detrended']!s:<5} "
                f"beta={float(row['best']):+9.4f} "
                f"{'ON BOUND' if row['on_bound'] else 'interior'} "
                f"maxdelta={float(row['max_delta']):9.2f}  {row['verdict']}"
            )

    if len(signs) > 1:
        print(
            "\nclimate_sensitivity changes sign across these runs. It is absorbing "
            "low-frequency structure, not measuring a climate response. Do not "
            "calibrate it."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
