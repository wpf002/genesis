"""Sobol global sensitivity analysis.

Answers "does this output respond to this parameter at all?" A parameter with a
total-order index near zero cannot be constrained by that output no matter how
much data there is, which is a structural finding, not a numerical one.

Verified in tests against the Ishigami function, whose Sobol indices are known
analytically.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

import numpy as np
from SALib.analyze import sobol as sobol_analyze
from SALib.sample import sobol as sobol_sample


@dataclass(frozen=True)
class ParameterSpace:
    names: list[str]
    bounds: list[tuple[float, float]]

    def as_problem(self) -> dict[str, object]:
        return {
            "num_vars": len(self.names),
            "names": list(self.names),
            "bounds": [list(b) for b in self.bounds],
        }


@dataclass(frozen=True)
class SobolResult:
    names: list[str]
    first_order: np.ndarray
    total_order: np.ndarray
    first_order_conf: np.ndarray
    total_order_conf: np.ndarray

    def insensitive(self, threshold: float = 0.01) -> list[str]:
        """Parameters the output barely responds to. Candidates for deletion."""
        return [
            name
            for name, st in zip(self.names, self.total_order, strict=True)
            if st < threshold
        ]


def run_sobol(
    space: ParameterSpace,
    model: Callable[[np.ndarray], np.ndarray],
    n: int = 1024,
    seed: int = 20260806,
) -> SobolResult:
    """`model` maps an (N, d) sample matrix to an (N,) vector of scalar outputs."""
    problem = space.as_problem()
    samples = sobol_sample.sample(problem, n, calc_second_order=True, seed=seed)
    outputs = np.asarray(model(samples), dtype=float)
    if outputs.shape != (samples.shape[0],):
        raise ValueError(
            f"model returned {outputs.shape}, expected ({samples.shape[0]},)"
        )
    analysis = sobol_analyze.analyze(
        problem, outputs, calc_second_order=True, print_to_console=False, seed=seed
    )
    return SobolResult(
        names=list(space.names),
        first_order=np.asarray(analysis["S1"]),
        total_order=np.asarray(analysis["ST"]),
        first_order_conf=np.asarray(analysis["S1_conf"]),
        total_order_conf=np.asarray(analysis["ST_conf"]),
    )
