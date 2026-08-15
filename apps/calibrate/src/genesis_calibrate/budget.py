"""Spend caps for the calibration service.

The roadmap names this as the cost risk: Bayesian inference on a coupled
dynamical model, not request traffic. A NUTS run that looks like a typo in the
`draws` argument is the failure mode, and it fails by burning a machine for a
day rather than by raising anything.

So the cost is estimated *before* the job starts and the job is refused if the
estimate is over the cap. Refused, not degraded — silently dropping to 200 draws
would produce a posterior that reads like the one that was asked for.

The unit is model evaluations. It is the honest currency here: wall clock
depends on the machine, and money depends on where the machine is, but a
coupled-ODE solve costs the same number of solves wherever it runs.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass

ENV_MAX_EVALUATIONS = "GENESIS_CALIBRATE_MAX_EVALS"

#: Set so the Phase 3 identifiability pipeline fits comfortably (~22k evaluations
#: at sobol_n=512, grid_points=21) and a serious NUTS run does not: four chains
#: of 2000 draws costs about a million. That asymmetry is the point. A default
#: high enough to wave a real inference job through is not a cap, it is a
#: decoration, and the first draft of this file had one — 5,000,000, which a full
#: NUTS run passed under. A test now pins the shape rather than the number.
DEFAULT_MAX_EVALUATIONS = 250_000


class BudgetExceeded(RuntimeError):
    """Raised before a job starts, never during one."""


class BudgetUnset(RuntimeError):
    """An unattended job was asked for without anybody choosing a cap."""


@dataclass(frozen=True)
class Estimate:
    """What a job will cost, broken down so an over-budget message is useful."""

    sobol: int = 0
    profile: int = 0
    inference: int = 0

    @property
    def total(self) -> int:
        return self.sobol + self.profile + self.inference

    def describe(self) -> str:
        parts = [
            f"sobol {self.sobol:,}",
            f"profile {self.profile:,}",
            f"inference {self.inference:,}",
        ]
        return f"{self.total:,} evaluations ({', '.join(parts)})"


def sobol_evaluations(n: int, dimensions: int) -> int:
    """Saltelli's sampler draws n(2D+2) points, not n."""
    if n <= 0 or dimensions <= 0:
        raise ValueError("sobol_evaluations: n and dimensions must be positive")
    return n * (2 * dimensions + 2)


def profile_evaluations(
    parameters: int, grid_points: int, optimiser_evaluations: int = 200
) -> int:
    """Every grid point re-optimises the other parameters. That inner solve is
    the part people forget, and it is most of the cost."""
    if min(parameters, grid_points, optimiser_evaluations) <= 0:
        raise ValueError("profile_evaluations: all arguments must be positive")
    return parameters * grid_points * optimiser_evaluations


def nuts_evaluations(
    chains: int, tune: int, draws: int, leapfrog_steps: int = 32
) -> int:
    """NUTS costs one gradient per leapfrog step, and tuning is not free."""
    if min(chains, tune, draws, leapfrog_steps) <= 0:
        raise ValueError("nuts_evaluations: all arguments must be positive")
    return chains * (tune + draws) * leapfrog_steps


def max_evaluations(env: Mapping[str, str] | None = None) -> int:
    """The cap in force. An unparseable or non-positive value is an error, not a
    silent fallback to the default — a typo in a cap must not raise the cap."""
    source = os.environ if env is None else env
    raw = source.get(ENV_MAX_EVALUATIONS)
    if raw is None:
        return DEFAULT_MAX_EVALUATIONS
    try:
        value = int(raw)
    except ValueError as error:
        raise BudgetExceeded(
            f"{ENV_MAX_EVALUATIONS}={raw!r} is not an integer; refusing to guess a cap"
        ) from error
    if value <= 0:
        raise BudgetExceeded(
            f"{ENV_MAX_EVALUATIONS}={raw!r} is not a positive number of evaluations"
        )
    return value


def assert_within_budget(
    estimate: Estimate,
    *,
    unattended: bool = False,
    env: Mapping[str, str] | None = None,
) -> None:
    """Call before starting work. Raises rather than trimming the job.

    An unattended job requires the cap to have been set explicitly. Inheriting a
    default is fine when somebody is watching the output and can stop it; it is
    not fine for a job with nobody at the keyboard, which is the exact case the
    roadmap says to cap before it ever runs.
    """
    source = os.environ if env is None else env

    if unattended and source.get(ENV_MAX_EVALUATIONS) is None:
        raise BudgetUnset(
            "refusing to start an unattended calibration run with no explicit cap. "
            f"Set {ENV_MAX_EVALUATIONS} to the number of model evaluations this job "
            f"is allowed. This job wants {estimate.describe()}."
        )

    cap = max_evaluations(source)
    if estimate.total > cap:
        raise BudgetExceeded(
            f"this job wants {estimate.describe()}, and the cap is {cap:,}. "
            f"Raise {ENV_MAX_EVALUATIONS} on purpose or make the job smaller. "
            "It will not be trimmed to fit."
        )


def estimate_identifiability(
    *,
    dimensions: int,
    sobol_n: int,
    grid_points: int,
    optimiser_evaluations: int = 200,
) -> Estimate:
    """The Phase 3 pipeline: one Sobol sweep, then a profile per parameter."""
    return Estimate(
        sobol=sobol_evaluations(sobol_n, dimensions),
        profile=profile_evaluations(dimensions, grid_points, optimiser_evaluations),
    )
