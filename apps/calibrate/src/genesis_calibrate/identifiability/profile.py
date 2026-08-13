"""Profile likelihood.

Sobol says whether an output responds to a parameter. The profile says whether
the data can pin it down. Fix one parameter across a grid, re-optimize the rest
at every point, and watch the likelihood ratio: if it never rises above the
chi-square threshold on a side, that side of the parameter is unbounded by the
data.

This is the Raue et al. construction. A flat profile is structural
non-identifiability; a profile that rises on one side only is practical
non-identifiability with a one-sided bound.

One trap worth naming: a profile can rise because the compensating parameter ran
into its own box constraint, not because the data said anything. That is a fact
about the bounds, not a finding. Keep `grid_bounds` inside the region where the
other parameters can still move, and widen the optimizer box when in doubt.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

import numpy as np
from scipy.optimize import minimize
from scipy.stats import chi2

NegLogLik = Callable[[np.ndarray], float]


@dataclass(frozen=True)
class ProfilePoint:
    value: float
    negloglik: float
    delta: float


@dataclass(frozen=True)
class ProfileResult:
    name: str
    index: int
    best: float
    best_negloglik: float
    points: list[ProfilePoint]
    threshold: float

    @property
    def exceeds_below(self) -> bool:
        """The profile clears the threshold somewhere below the optimum."""
        return any(p.delta > self.threshold for p in self.points if p.value < self.best)

    @property
    def exceeds_above(self) -> bool:
        return any(p.delta > self.threshold for p in self.points if p.value > self.best)

    @property
    def max_delta(self) -> float:
        return max((p.delta for p in self.points), default=0.0)


def _optimize(
    negloglik: NegLogLik,
    start: np.ndarray,
    bounds: list[tuple[float, float]],
) -> tuple[np.ndarray, float]:
    result = minimize(negloglik, start, method="L-BFGS-B", bounds=bounds)
    return np.asarray(result.x, dtype=float), float(result.fun)


def profile_likelihood(
    negloglik: NegLogLik,
    start: np.ndarray,
    bounds: list[tuple[float, float]],
    index: int,
    name: str,
    grid_points: int = 25,
    confidence: float = 0.95,
    grid_bounds: tuple[float, float] | None = None,
) -> ProfileResult:
    best_theta, best_nll = _optimize(negloglik, np.asarray(start, dtype=float), bounds)
    threshold = float(chi2.ppf(confidence, df=1))

    low, high = grid_bounds if grid_bounds is not None else bounds[index]
    grid = np.linspace(low, high, grid_points)

    def clamp_at(value: float) -> NegLogLik:
        """Bound as a default rather than captured, so the closure is not a trap."""

        def clamped(theta: np.ndarray) -> float:
            candidate = np.asarray(theta, dtype=float).copy()
            candidate[index] = value
            return negloglik(candidate)

        return clamped

    points: list[ProfilePoint] = []
    for fixed in grid:
        free_bounds = list(bounds)
        free_bounds[index] = (float(fixed), float(fixed))
        theta0 = best_theta.copy()
        theta0[index] = float(fixed)

        _, nll = _optimize(clamp_at(float(fixed)), theta0, free_bounds)
        points.append(
            ProfilePoint(
                value=float(fixed),
                negloglik=nll,
                delta=2.0 * (nll - best_nll),
            )
        )

    return ProfileResult(
        name=name,
        index=index,
        best=float(best_theta[index]),
        best_negloglik=best_nll,
        points=points,
        threshold=threshold,
    )
