"""Profile likelihood checked on models whose identifiability is known by construction.

y = (a * b) * x can only ever constrain the product, so a and b are each
structurally non-identifiable, while c in y = (a*b)*x + c*x^2 is identifiable.
If the harness cannot tell these apart it is useless on real data.

The optimizer box is deliberately much wider than the profiled grid. With a tight
box the profile rises at the extremes purely because the compensating parameter
hits its own bound, which says nothing about the data — see the note in
profile.py.
"""

from __future__ import annotations

import numpy as np

from genesis_calibrate.identifiability.profile import profile_likelihood

RNG = np.random.default_rng(20260806)
X = np.linspace(0.5, 5.0, 60)
SIGMA = 0.2
TRUE = np.array([2.0, 1.5, 0.8])  # a, b, c
Y = (TRUE[0] * TRUE[1]) * X + TRUE[2] * X**2 + SIGMA * RNG.standard_normal(X.size)

BOUNDS = [(0.05, 60.0), (0.05, 60.0), (0.05, 3.0)]
START = np.array([1.0, 1.0, 1.0])


def negloglik(theta: np.ndarray) -> float:
    a, b, c = (float(t) for t in theta)
    predicted = (a * b) * X + c * X**2
    return float(0.5 * np.sum(((Y - predicted) / SIGMA) ** 2))


def test_product_parameters_are_non_identifiable() -> None:
    # a*b is 3.0, so over a in [1, 4] the partner only needs b in [0.75, 3.0],
    # comfortably inside the box. Any rise here would be the data talking.
    for index, name in ((0, "a"), (1, "b")):
        result = profile_likelihood(
            negloglik,
            START,
            BOUNDS,
            index=index,
            name=name,
            grid_points=25,
            grid_bounds=(1.0, 4.0),
        )
        assert result.max_delta < result.threshold, (
            f"{name} looked identifiable (max delta {result.max_delta:.3f})"
        )
        assert not result.exceeds_below
        assert not result.exceeds_above


def test_identifiable_parameter_is_bounded_on_both_sides() -> None:
    result = profile_likelihood(
        negloglik,
        START,
        BOUNDS,
        index=2,
        name="c",
        grid_points=25,
        grid_bounds=(0.4, 1.3),
    )
    assert result.exceeds_below
    assert result.exceeds_above
    assert abs(result.best - TRUE[2]) < 0.1


def test_a_tight_box_can_manufacture_identifiability() -> None:
    # Same non-identifiable parameter, but the partner is boxed so tightly it
    # cannot compensate. The profile rises. This is the failure mode the
    # docstring warns about, pinned so it stays visible.
    tight = [(0.05, 60.0), (1.0, 2.0), (0.05, 3.0)]
    result = profile_likelihood(
        negloglik, START, tight, index=0, name="a", grid_points=25, grid_bounds=(0.5, 8.0)
    )
    assert result.max_delta > result.threshold
