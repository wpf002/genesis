"""Phase 4: calibrate `growth_rate` worldwide and run the validation battery.

    uv run python -m genesis_calibrate.run_phase4 --generated 2026-08-14

Tolerances are read from docs/model-cards/phase4-preregistration.md, which was
committed before this was run. They are duplicated here as constants; if the two
ever disagree, the committed markdown is the record.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, field
from pathlib import Path

import arviz as az
import numpy as np
import pymc as pm
from scipy.optimize import minimize_scalar

from .datasets.worldwide import WorldPanel, build_panel
from .inference.logistic import MILLION, FitInputs, build_model, simulate_numpy

# Pre-registered. Do not edit to match a result.
TOL_RHAT = 1.01
TOL_ESS = 400
TOL_BACKCAST = 0.50
TOL_HOLDOUT = 0.75
TOL_PRIOR_PLAUSIBLE = 0.80
TOL_ABLATION_WORSE = 0.10
TOL_HDI_WIDTH = 0.50

# NOT pre-registered. Added after the first run passed all seven tests, which the
# roadmap says to treat as a bug. These two are harder, not looser, and the model
# fails both. Recorded as post-hoc so nobody reads them as predictions.
TOL_SKILL_VS_PERSISTENCE = 1.0   # model error must be below a frozen-population baseline
TOL_SUBGROUP_OVERLAP = 1.0       # ALL continental pairs must overlap for one shared r

SEED = 20260806


@dataclass
class Check:
    test: str
    metric: str
    value: float
    tolerance: float
    passed: bool
    note: str = ""


@dataclass
class Phase4Result:
    generated: str
    countries: int
    observations: int
    growth_rate_mean: float
    growth_rate_lower: float
    growth_rate_upper: float
    checks: list[Check] = field(default_factory=list)

    def to_json(self) -> str:
        return (
            json.dumps(
                {
                    "generated": self.generated,
                    "countries": self.countries,
                    "observations": self.observations,
                    "growth_rate": {
                        "mean": self.growth_rate_mean,
                        "hdi_94_lower": self.growth_rate_lower,
                        "hdi_94_upper": self.growth_rate_upper,
                    },
                    "checks": [c.__dict__ for c in self.checks],
                },
                indent=2,
                sort_keys=True,
            )
            + "\n"
        )


def _fit(population: np.ndarray, sigma: np.ndarray, exponential: bool = False):
    with build_model(FitInputs(population, sigma, exponential)):
        return pm.sample(
            draws=2000,
            tune=2000,
            chains=4,
            cores=4,
            target_accept=0.95,
            random_seed=SEED,
            progressbar=False,
        )


def _median_abs_rel_error(observed: np.ndarray, predicted: np.ndarray) -> float:
    denominator = np.maximum(np.abs(observed), 1e-9)
    return float(np.median(np.abs(predicted - observed) / denominator))


def _fit_k_from_head(
    r: float, observed: np.ndarray, sigma: np.ndarray, head: int
) -> np.ndarray:
    """Per-country K from its first `head` points, with r held fixed."""
    capacities = np.empty(observed.shape[0], dtype=float)
    for i in range(observed.shape[0]):
        target = observed[i, :head]
        weight = np.maximum(sigma[i, :head], 1e-9)

        def loss(log_k: float, target: np.ndarray = target, weight: np.ndarray = weight,
                 i: int = i) -> float:
            predicted = simulate_numpy(
                r, np.array([np.exp(log_k)]), observed[i : i + 1, 0], head
            )[0]
            return float(np.sum(((predicted - target) / weight) ** 2))

        best = minimize_scalar(loss, bounds=(np.log(1e-4), np.log(1e5)), method="bounded")
        capacities[i] = float(np.exp(best.x))
    return capacities


def run(panel: WorldPanel, generated: str) -> Phase4Result:
    observed = panel.population / MILLION
    sigma = panel.sigma / MILLION
    n_years = panel.years.size

    idata = _fit(panel.population, panel.sigma)
    summary = az.summary(idata, var_names=["growth_rate"])
    r_hat = float(summary["r_hat"].iloc[0])
    ess = float(summary["ess_bulk"].iloc[0])
    posterior = idata.posterior["growth_rate"].to_numpy().ravel()
    r_mean = float(np.mean(posterior))
    lower, upper = (float(x) for x in np.percentile(posterior, [3.0, 97.0]))

    checks: list[Check] = [
        Check("V-01", "r_hat(growth_rate)", r_hat, TOL_RHAT, r_hat <= TOL_RHAT),
        Check("V-02", "ess_bulk(growth_rate)", ess, TOL_ESS, ess >= TOL_ESS),
    ]

    # V-03 backcast: fit on 0-1000 CE, predict 1100-1700.
    split = int(np.searchsorted(panel.years, 1000)) + 1
    idata_head = _fit(panel.population[:, :split], panel.sigma[:, :split])
    r_head = float(idata_head.posterior["growth_rate"].to_numpy().mean())
    k_head = np.exp(idata_head.posterior["k"].to_numpy().reshape(-1, panel.n_countries).mean(axis=0))
    predicted = simulate_numpy(r_head, k_head, observed[:, 0], n_years)
    backcast = _median_abs_rel_error(observed[:, split:], predicted[:, split:])
    checks.append(
        Check("V-03", "median abs rel error, 1100-1700", backcast, TOL_BACKCAST,
              backcast <= TOL_BACKCAST)
    )

    # V-04 continental holdout: fit r on Europe+Asia, transfer it to the rest.
    train_mask = np.array([c in ("europe", "asia") for c in panel.continent])
    test_mask = np.array([c in ("africa", "americas") for c in panel.continent])
    idata_train = _fit(panel.population[train_mask], panel.sigma[train_mask])
    r_train = float(idata_train.posterior["growth_rate"].to_numpy().mean())
    head = 3
    k_test = _fit_k_from_head(r_train, observed[test_mask], sigma[test_mask], head)
    predicted_test = simulate_numpy(r_train, k_test, observed[test_mask][:, 0], n_years)
    holdout = _median_abs_rel_error(observed[test_mask][:, head:], predicted_test[:, head:])
    checks.append(
        Check("V-04", "median abs rel error, Africa+Americas", holdout, TOL_HOLDOUT,
              holdout <= TOL_HOLDOUT,
              f"r fitted on {int(train_mask.sum())} countries, tested on {int(test_mask.sum())}")
    )

    # V-05 prior predictive: does the model generate plausible worlds unfitted?
    with build_model(FitInputs(panel.population, panel.sigma)):
        prior = pm.sample_prior_predictive(draws=500, random_seed=SEED)
    terminal = prior.prior_predictive["obs"].to_numpy()[..., -1].ravel() * MILLION
    plausible = float(np.mean((terminal > 1e3) & (terminal < 1e10)))
    checks.append(
        Check("V-05", "share of prior-predictive terminals in 1e3-1e10", plausible,
              TOL_PRIOR_PLAUSIBLE, plausible >= TOL_PRIOR_PLAUSIBLE)
    )

    # V-06 ablation: drop the logistic ceiling. Held-out error must get worse.
    idata_exp = _fit(panel.population[:, :split], panel.sigma[:, :split], exponential=True)
    r_exp = float(idata_exp.posterior["growth_rate"].to_numpy().mean())
    predicted_exp = simulate_numpy(
        r_exp, np.ones(panel.n_countries), observed[:, 0], n_years, exponential=True
    )
    backcast_exp = _median_abs_rel_error(observed[:, split:], predicted_exp[:, split:])
    worse_by = (backcast_exp - backcast) / max(backcast, 1e-9)
    checks.append(
        Check("V-06", "ablated error worse by", worse_by, TOL_ABLATION_WORSE,
              worse_by >= TOL_ABLATION_WORSE,
              f"logistic {backcast:.3f} vs exponential {backcast_exp:.3f}")
    )

    # V-08 (post-hoc): is the model better than assuming nothing changes?
    persistence = np.repeat(observed[:, split - 1 : split], n_years - split, axis=1)
    persistence_error = _median_abs_rel_error(observed[:, split:], persistence)
    skill = backcast / max(persistence_error, 1e-9)
    checks.append(
        Check("V-08", "backcast error / persistence error", skill,
              TOL_SKILL_VS_PERSISTENCE, skill < TOL_SKILL_VS_PERSISTENCE,
              f"model {backcast:.3f} vs frozen-population {persistence_error:.3f}")
    )

    # V-09 (post-hoc): is one shared growth rate supported across continents?
    intervals: dict[str, tuple[float, float]] = {}
    for continent in ("europe", "asia", "africa", "americas"):
        mask = np.array([c == continent for c in panel.continent])
        if int(mask.sum()) < 8:
            continue
        draws = _fit(panel.population[mask], panel.sigma[mask]).posterior[
            "growth_rate"
        ].to_numpy().ravel()
        bounds = np.percentile(draws, [3.0, 97.0])
        intervals[continent] = (float(bounds[0]), float(bounds[1]))
    names = list(intervals)
    overlapping = sum(
        1
        for i in range(len(names))
        for j in range(i + 1, len(names))
        if intervals[names[i]][0] <= intervals[names[j]][1]
        and intervals[names[j]][0] <= intervals[names[i]][1]
    )
    total_pairs = len(names) * (len(names) - 1) // 2
    share = overlapping / max(total_pairs, 1)
    checks.append(
        Check("V-09", "share of continental pairs whose 94% intervals overlap", share,
              TOL_SUBGROUP_OVERLAP, share >= TOL_SUBGROUP_OVERLAP,
              f"{overlapping}/{total_pairs} overlap; "
              + "; ".join(f"{n} [{lo:.4f}, {hi:.4f}]" for n, (lo, hi) in intervals.items()))
    )

    # V-07 posterior width.
    width = (upper - lower) / max(r_mean, 1e-9)
    checks.append(
        Check("V-07", "94% HDI width / mean", width, TOL_HDI_WIDTH, width <= TOL_HDI_WIDTH)
    )

    return Phase4Result(
        generated=generated,
        countries=panel.n_countries,
        observations=panel.n_observations,
        growth_rate_mean=r_mean,
        growth_rate_lower=lower,
        growth_rate_upper=upper,
        checks=checks,
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="genesis-phase4")
    parser.add_argument("--generated", required=True)
    parser.add_argument("--root", type=Path, default=Path("data/raw"))
    parser.add_argument("--out", type=Path, default=Path("docs/model-cards/phase4-calibration.json"))
    args = parser.parse_args(argv)

    panel = build_panel(args.root)
    result = run(panel, args.generated)

    print(f"countries {result.countries}   observations {result.observations}")
    print(
        f"growth_rate {result.growth_rate_mean:.4f} "
        f"[{result.growth_rate_lower:.4f}, {result.growth_rate_upper:.4f}] per century"
    )
    for check in result.checks:
        mark = "PASS" if check.passed else "FAIL"
        print(f"  {check.test} {mark}  {check.metric} = {check.value:.4f} "
              f"(tolerance {check.tolerance})  {check.note}")

    failures = [c for c in result.checks if not c.passed]
    if not failures:
        print(
            "\nEvery test passed. The roadmap says to treat that as a bug: the "
            "tolerances are too loose or the model is overfit. Tighten until "
            "something breaks."
        )
    else:
        print(f"\n{len(failures)} of {len(result.checks)} tests failed, as recorded.")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(result.to_json())
    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
