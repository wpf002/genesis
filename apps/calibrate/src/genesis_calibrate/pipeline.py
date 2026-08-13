"""The Phase 3 pipeline, end to end.

Sobol first, then a profile for every parameter, then a verdict for each. The
dry run wires it to the synthetic model in models/toy.py. When real HYDE and
paleoclimate series arrive, `run_identifiability` takes them instead and the
mode becomes REAL.
"""

from __future__ import annotations

from collections.abc import Callable

import numpy as np

from .identifiability.profile import profile_likelihood
from .identifiability.report import IdentifiabilityReport, RunMode
from .identifiability.sobol import ParameterSpace, run_sobol
from .identifiability.verdict import ParameterVerdict, classify
from .models import toy


def run_identifiability(
    space: ParameterSpace,
    summary: Callable[[np.ndarray], np.ndarray],
    negloglik: Callable[[np.ndarray], float],
    start: np.ndarray,
    *,
    mode: RunMode,
    model: str,
    dataset: str,
    generated: str,
    sobol_n: int = 512,
    grid_points: int = 21,
    profile_grid: list[tuple[float, float]] | None = None,
) -> IdentifiabilityReport:
    """`profile_grid` narrows where each profile is evaluated.

    Keep it inside the region where the other parameters can still compensate,
    or the profile reports the box constraint rather than the data.
    """
    sobol = run_sobol(space, summary, n=sobol_n)

    verdicts: list[ParameterVerdict] = []
    for index, name in enumerate(space.names):
        profile = profile_likelihood(
            negloglik,
            start=start,
            bounds=list(space.bounds),
            index=index,
            name=name,
            grid_points=grid_points,
            grid_bounds=None if profile_grid is None else profile_grid[index],
        )
        verdicts.append(classify(name, sobol, profile))

    return IdentifiabilityReport(
        mode=mode,
        model=model,
        dataset=dataset,
        generated=generated,
        verdicts=verdicts,
    )


def dry_run(generated: str, sobol_n: int = 256, grid_points: int = 15) -> IdentifiabilityReport:
    """Exercises the whole pipeline on synthetic data. Produces no findings."""
    theta_true = np.array([1.5, 0.4, 5000.0, 0.08])
    series = toy.make_series(theta_true)

    space = ParameterSpace(
        names=list(toy.PARAM_NAMES),
        bounds=[(0.2, 4.0), (0.05, 3.0), (2000.0, 9000.0), (0.01, 0.30)],
    )
    # yield_gain * climate_scale is 0.6 at truth. Each grid stays where the
    # partner can still compensate inside its own box.
    profile_grid = [(0.5, 3.0), (0.2, 1.2), (4000.0, 6000.0), (0.05, 0.15)]

    def summary(samples: np.ndarray) -> np.ndarray:
        return np.array([toy.summary_output(row, series) for row in samples])

    def nll(theta: np.ndarray) -> float:
        return toy.negloglik(theta, series)

    return run_identifiability(
        space,
        summary,
        nll,
        start=np.array([1.0, 0.5, 4000.0, 0.10]),
        mode="DRY_RUN",
        model="models/toy.py synthetic population-yield-climate",
        dataset="synthetic (no real data involved)",
        generated=generated,
        sobol_n=sobol_n,
        grid_points=grid_points,
        profile_grid=profile_grid,
    )
