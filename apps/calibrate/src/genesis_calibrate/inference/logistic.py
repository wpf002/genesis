"""Hierarchical logistic growth, fitted across every country at once.

    P[t+1] = P[t] + r * P[t] * (1 - P[t] / K_i)

`r` is shared by every country and is the only thing being reported. `K_i` are
nuisance parameters drawn from a shared log-normal, which is what lets a
held-out country be predicted at all.

Populations are carried in millions so the sampler sees numbers near 1.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pymc as pm
import pytensor.tensor as pt

MILLION = 1.0e6


@dataclass(frozen=True)
class FitInputs:
    population: np.ndarray  # (n_countries, n_years), people
    sigma: np.ndarray
    exponential: bool = False


def _roll(p0: pt.TensorVariable, r, k, n_steps: int, exponential: bool):
    """Unrolled recursion. n_steps is small (<= 18), so a loop beats scan."""
    states = [p0]
    current = p0
    for _ in range(n_steps - 1):
        if exponential:
            nxt = current * (1.0 + r)
        else:
            nxt = current + r * current * (1.0 - current / k)
        current = pt.clip(nxt, 1e-6, 1e6)
        states.append(current)
    return pt.stack(states, axis=1)


def build_model(inputs: FitInputs) -> pm.Model:
    observed = inputs.population / MILLION
    sigma = np.maximum(inputs.sigma / MILLION, 1e-6)
    n_countries, n_years = observed.shape
    peak = observed.max(axis=1)

    with pm.Model() as model:
        # Per century. A pre-industrial growth rate is small and positive.
        r = pm.LogNormal("growth_rate", mu=np.log(0.15), sigma=1.0)

        if inputs.exponential:
            k = pt.ones(n_countries)
        else:
            mu_k = pm.Normal("mu_k", mu=float(np.log(np.median(peak))), sigma=2.0)
            sigma_k = pm.HalfNormal("sigma_k", sigma=2.0)
            k = pm.LogNormal("k", mu=mu_k, sigma=sigma_k, shape=n_countries)

        p0 = pt.as_tensor_variable(observed[:, 0])
        predicted = _roll(p0, r, k, n_years, inputs.exponential)

        pm.Normal("obs", mu=predicted, sigma=sigma, observed=observed)
    return model


def simulate_numpy(
    r: float, k: np.ndarray, p0: np.ndarray, n_years: int, exponential: bool = False
) -> np.ndarray:
    """Same recursion outside the sampler, for prediction on held-out data."""
    out = np.empty((p0.size, n_years), dtype=float)
    out[:, 0] = p0
    current = p0.copy()
    for t in range(1, n_years):
        if exponential:
            nxt = current * (1.0 + r)
        else:
            nxt = current + r * current * (1.0 - current / k)
        current = np.clip(nxt, 1e-6, 1e6)
        out[:, t] = current
    return out
