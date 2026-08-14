"""The same mechanism, fitted across many countries at once.

theta = [growth_rate, climate_sensitivity, K_1 ... K_n]

`growth_rate` and `climate_sensitivity` are shared by every country; each country
carries its own carrying capacity. The point of the exercise: a shared parameter
is constrained by every country simultaneously, so the question is whether the
climate coupling that 16 observations could not pin down survives when the same
window supplies an order of magnitude more.

The parameter count rises with the region count, but the two parameters anyone
cares about do not.
"""

from __future__ import annotations

import numpy as np

from ..datasets.series import RegionSeries

SHARED_NAMES = ["growth_rate", "climate_sensitivity"]
#: climate_sensitivity is given a deliberately wide box. At (-2, 2) and even
#: (-8, 8) the optimum sits exactly on the bound, and a profile computed against
#: a clamped optimum reports the box rather than the data.
SHARED_BOUNDS: list[tuple[float, float]] = [(0.02, 1.50), (-40.0, 40.0)]
MILLION = 1.0e6


def param_names(regions: list[RegionSeries]) -> list[str]:
    return SHARED_NAMES + [f"k:{r.name}" for r in regions]


def bounds_for(regions: list[RegionSeries]) -> list[tuple[float, float]]:
    box = list(SHARED_BOUNDS)
    for region in regions:
        peak = float(np.max(region.population)) / MILLION
        box.append((max(peak * 0.15, 0.05), peak * 6.0))
    return box


def start_for(regions: list[RegionSeries]) -> np.ndarray:
    values = [0.4, 0.3]
    for region in regions:
        values.append(float(np.max(region.population)) / MILLION * 1.2)
    return np.array(values, dtype=float)


def simulate(
    theta: np.ndarray,
    region: RegionSeries,
    capacity: float,
    form: str = "exponential",
) -> np.ndarray:
    """`form` selects how climate modulates carrying capacity.

    linear      K * (1 + beta*c)  — goes negative once |beta*c| > 1, which the
                fit will happily exploit. Kept only to reproduce that result.
    exponential K * exp(beta*c)   — cannot go negative. Use this.
    """
    growth = float(theta[0])
    sensitivity = float(theta[1])

    population = np.empty(region.years.size, dtype=float)
    current = float(region.population[0]) / MILLION
    population[0] = current
    for i in range(1, region.years.size):
        anomaly = float(region.climate[i - 1])
        if form == "linear":
            modifier = 1.0 + sensitivity * anomaly
        else:
            modifier = float(np.exp(sensitivity * anomaly))
        effective = max(capacity * modifier, 0.01)
        current = current + growth * current * (1.0 - current / effective)
        current = max(current, 0.001)
        population[i] = current
    return population * MILLION


def detrend(regions: list[RegionSeries]) -> list[RegionSeries]:
    """Remove a linear trend from each domain's climate series.

    Population rises and the anomaly series falls across the window, so a
    sensitivity fitted to raw anomalies can absorb the trend instead of measuring
    a response. If a fitted beta does not survive this, it was fitting the trend.
    """
    out: list[RegionSeries] = []
    for region in regions:
        coefficients = np.polyfit(region.years, region.climate, 1)
        out.append(
            RegionSeries(
                name=region.name,
                years=region.years,
                population=region.population,
                population_sigma=region.population_sigma,
                climate=region.climate - np.polyval(coefficients, region.years),
            )
        )
    return out


def negloglik(
    theta: np.ndarray, regions: list[RegionSeries], form: str = "exponential"
) -> float:
    total = 0.0
    for index, region in enumerate(regions):
        predicted = simulate(theta, region, float(theta[2 + index]), form)
        residual = (region.population - predicted) / region.population_sigma
        total += 0.5 * float(np.sum(residual**2))
    return total


def terminal_total(theta: np.ndarray, regions: list[RegionSeries]) -> float:
    return float(
        sum(simulate(theta, r, float(theta[2 + i]))[-1] for i, r in enumerate(regions))
    )
