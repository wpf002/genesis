"""Phase 3, for real. Runs identifiability on HYDE 3.5 + PAGES2k.

    uv run python -m genesis_calibrate.run_rigor --generated 2026-08-13

Writes a REAL report, which is allowed into docs/model-cards/.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np

from .datasets.manifest import load_manifest, verify
from .datasets.series import build_all
from .identifiability.report import write_report
from .identifiability.sobol import ParameterSpace
from .models import rigor
from .pipeline import run_identifiability


def verify_inputs(root: Path, manifests: Path) -> int:
    checked = 0
    for path in sorted(manifests.glob("*.json")):
        verify(load_manifest(path), root)
        checked += 1
    if checked == 0:
        raise RuntimeError(f"no manifests in {manifests}; run datasets.sources refresh")
    return checked


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="genesis-run-rigor")
    parser.add_argument("--generated", required=True)
    parser.add_argument("--root", type=Path, default=Path("data/raw"))
    parser.add_argument("--manifests", type=Path, default=Path("data/manifests"))
    parser.add_argument("--out", type=Path, default=Path("docs/model-cards/identifiability-800-1500.json"))
    parser.add_argument("--sobol-n", type=int, default=512)
    parser.add_argument("--grid-points", type=int, default=21)
    args = parser.parse_args(argv)

    checked = verify_inputs(args.root, args.manifests)
    print(f"verified {checked} dataset manifests against disk")

    regions = build_all(args.root)
    observations = sum(len(r) for r in regions)
    print(f"regions: {', '.join(r.name for r in regions)}")
    print(f"observations: {observations} across {len(rigor.PARAM_NAMES)} free parameters")

    space = ParameterSpace(names=list(rigor.PARAM_NAMES), bounds=list(rigor.BOUNDS))

    def summary(samples: np.ndarray) -> np.ndarray:
        return np.array([rigor.terminal_total(row, regions) for row in samples])

    def nll(theta: np.ndarray) -> float:
        return rigor.negloglik(theta, regions)

    report = run_identifiability(
        space,
        summary,
        nll,
        start=rigor.START,
        mode="REAL",
        model="population-yield-climate, century steps, 800-1500 CE",
        dataset="HYDE 3.5 (popc base/lower/upper) + PAGES2k asia2k & EuroMed2k",
        generated=args.generated,
        sobol_n=args.sobol_n,
        grid_points=args.grid_points,
    )

    for verdict in report.verdicts:
        print(f"  {verdict.name:<22} {verdict.verdict:<18} {verdict.reason}")

    write_report(report, args.out)
    print(f"wrote {args.out}")

    if not report.non_identified:
        print(
            "every parameter came back identifiable on the first pass. "
            "The roadmap says to treat that as a bug in the analysis, not a result."
        )
    return 0


def sigma_sensitivity(
    root: Path, factors: tuple[float, ...] = (1.0, 0.5, 1.0 / 3.0)
) -> dict[str, dict[str, float]]:
    """Re-run the profiles under alternative readings of HYDE's envelope.

    HYDE states no coverage for its base/lower/upper spread, so treating the
    half-width as one sigma is our assumption. Any verdict that flips across
    these factors is a fact about the assumption, not about history, and the
    model card must say so.
    """
    from .datasets.series import RegionSeries
    from .identifiability.profile import profile_likelihood

    base = build_all(root)
    out: dict[str, dict[str, float]] = {}
    for factor in factors:
        regions = [
            RegionSeries(
                r.name, r.years, r.population, r.population_sigma * factor, r.climate
            )
            for r in base
        ]

        def nll(theta: np.ndarray, regions: list[RegionSeries] = regions) -> float:
            return rigor.negloglik(theta, regions)

        label = f"envelope_over_{factor:.3f}_sigma"
        out[label] = {}
        for index, name in enumerate(rigor.PARAM_NAMES):
            result = profile_likelihood(
                nll, rigor.START, list(rigor.BOUNDS), index=index, name=name, grid_points=21
            )
            out[label][name] = round(result.max_delta, 3)
    return out

if __name__ == "__main__":
    raise SystemExit(main())
