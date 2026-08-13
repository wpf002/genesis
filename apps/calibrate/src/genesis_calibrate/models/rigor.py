"""The Rigor model: population-yield-climate coupling, century steps.

Four free parameters against sixteen observations. Deliberately the smallest
model that still contains the mechanism the project claims to be about.

    P[t+1] = P[t] + r * P[t] * (1 - P[t] / (K_i * (1 + beta * c[t])))

`r` and `beta` are shared across regions; `K` is per region. Anything larger
than this was not defensible given eight population points per region.
"""

from __future__ import annotations

import numpy as np

from ..datasets.series import RegionSeries

PARAM_NAMES = ["growth_rate", "climate_sensitivity", "k_yellow_river", "k_euromed"]

#: Sampling and optimizer box. Populations are in millions inside the model to
#: keep the optimizer well scaled.
BOUNDS: list[tuple[float, float]] = [
    (0.02, 1.50),  # growth_rate, per century
    (-2.00, 2.00),  # climate_sensitivity
    (40.0, 400.0),  # k_yellow_river, millions
    (30.0, 300.0),  # k_euromed, millions
]

START = np.array([0.4, 0.3, 150.0, 90.0])

MILLION = 1.0e6


def simulate(theta: np.ndarray, series: RegionSeries, capacity: float) -> np.ndarray:
    growth = float(theta[0])
    sensitivity = float(theta[1])

    population = np.empty(series.years.size, dtype=float)
    current = float(series.population[0]) / MILLION
    population[0] = current

    for i in range(1, series.years.size):
        modifier = 1.0 + sensitivity * float(series.climate[i - 1])
        effective = max(capacity * modifier, 1.0)
        current = current + growth * current * (1.0 - current / effective)
        current = max(current, 0.1)
        population[i] = current
    return population * MILLION


def _capacity_for(theta: np.ndarray, name: str) -> float:
    return float(theta[2]) if name == "yellow_river" else float(theta[3])


def negloglik(theta: np.ndarray, regions: list[RegionSeries]) -> float:
    total = 0.0
    for series in regions:
        predicted = simulate(theta, series, _capacity_for(theta, series.name))
        residual = (series.population - predicted) / series.population_sigma
        total += 0.5 * float(np.sum(residual**2))
    return total


def terminal_total(theta: np.ndarray, regions: list[RegionSeries]) -> float:
    return float(
        sum(simulate(theta, s, _capacity_for(theta, s.name))[-1] for s in regions)
    )
