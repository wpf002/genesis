"""Sobol harness checked against the Ishigami function.

Ishigami has analytic Sobol indices, so this verifies the harness rather than
asserting that it works. With a=7 and b=0.1 the first-order indices are
S1 = [0.3139, 0.4424, 0.0] and the total-order indices are
ST = [0.5576, 0.4424, 0.2437]. x3 has zero first-order effect but a non-zero
total effect, which is exactly the case a first-order-only analysis would miss.
"""

from __future__ import annotations

import numpy as np
from SALib.test_functions import Ishigami

from genesis_calibrate.identifiability.sobol import ParameterSpace, run_sobol

SPACE = ParameterSpace(
    names=["x1", "x2", "x3"],
    bounds=[(-np.pi, np.pi)] * 3,
)

ANALYTIC_S1 = np.array([0.3139, 0.4424, 0.0])
ANALYTIC_ST = np.array([0.5576, 0.4424, 0.2437])


def test_matches_analytic_indices() -> None:
    result = run_sobol(SPACE, Ishigami.evaluate, n=4096)
    assert np.allclose(result.first_order, ANALYTIC_S1, atol=0.03)
    assert np.allclose(result.total_order, ANALYTIC_ST, atol=0.03)


def test_x3_has_no_first_order_effect_but_is_not_insensitive() -> None:
    result = run_sobol(SPACE, Ishigami.evaluate, n=4096)
    assert abs(result.first_order[2]) < 0.03
    assert result.total_order[2] > 0.2
    # Interaction-only parameters must not be reported as insensitive.
    assert "x3" not in result.insensitive()


def test_rejects_a_model_with_the_wrong_output_shape() -> None:
    def bad(samples: np.ndarray) -> np.ndarray:
        return np.ones((samples.shape[0], 2))

    try:
        run_sobol(SPACE, bad, n=16)
    except ValueError as exc:
        assert "expected" in str(exc)
    else:  # pragma: no cover
        raise AssertionError("expected a ValueError")
