import pytest

from genesis_calibrate.budget import (
    DEFAULT_MAX_EVALUATIONS,
    ENV_MAX_EVALUATIONS,
    BudgetExceeded,
    BudgetUnset,
    Estimate,
    assert_within_budget,
    estimate_identifiability,
    max_evaluations,
    nuts_evaluations,
    profile_evaluations,
    sobol_evaluations,
)


def test_sobol_counts_saltelli_points_not_n() -> None:
    # The trap: asking for n=512 over 4 parameters costs 5120 evaluations.
    assert sobol_evaluations(512, 4) == 512 * 10


def test_profile_counts_the_inner_optimiser() -> None:
    assert profile_evaluations(4, 21, 200) == 4 * 21 * 200


def test_nuts_counts_tuning_and_leapfrog_steps() -> None:
    assert nuts_evaluations(4, 1000, 1000, 32) == 4 * 2000 * 32


@pytest.mark.parametrize(
    "bad",
    [(0, 4), (512, 0), (-1, 4)],
)
def test_sobol_rejects_nonsense(bad: tuple[int, int]) -> None:
    with pytest.raises(ValueError):
        sobol_evaluations(*bad)


def test_cap_defaults_when_unset() -> None:
    assert max_evaluations({}) == DEFAULT_MAX_EVALUATIONS


def test_cap_reads_the_environment() -> None:
    assert max_evaluations({ENV_MAX_EVALUATIONS: "1234"}) == 1234


def test_a_typo_in_the_cap_does_not_raise_the_cap() -> None:
    # Falling back to the default here would let "50_000_000_000" typed as
    # "50,000,000,000" quietly become "no cap I chose".
    with pytest.raises(BudgetExceeded):
        max_evaluations({ENV_MAX_EVALUATIONS: "1e9"})
    with pytest.raises(BudgetExceeded):
        max_evaluations({ENV_MAX_EVALUATIONS: "0"})
    with pytest.raises(BudgetExceeded):
        max_evaluations({ENV_MAX_EVALUATIONS: "-1"})


def test_a_job_inside_the_cap_starts() -> None:
    assert_within_budget(Estimate(sobol=10, profile=10), env={})


def test_a_job_over_the_cap_is_refused_not_trimmed() -> None:
    with pytest.raises(BudgetExceeded) as caught:
        assert_within_budget(
            Estimate(inference=2_000), env={ENV_MAX_EVALUATIONS: "1000"}
        )
    message = str(caught.value)
    assert "2,000" in message and "1,000" in message
    assert "will not be trimmed" in message


def test_an_unattended_job_needs_somebody_to_have_chosen_a_cap() -> None:
    small = Estimate(sobol=1)
    # Attended: inheriting the default is fine, someone is watching.
    assert_within_budget(small, unattended=False, env={})
    # Unattended: it is not.
    with pytest.raises(BudgetUnset):
        assert_within_budget(small, unattended=True, env={})
    assert_within_budget(small, unattended=True, env={ENV_MAX_EVALUATIONS: "1000"})


def test_the_phase_3_pipeline_estimate_is_dominated_by_the_profiles() -> None:
    estimate = estimate_identifiability(dimensions=4, sobol_n=512, grid_points=21)
    assert estimate.sobol == 5_120
    assert estimate.profile == 16_800
    assert estimate.total == 21_920
    assert "21,920 evaluations" in estimate.describe()


def test_the_default_cap_admits_identifiability_and_refuses_inference() -> None:
    """The shape the default has to have, whatever the number is.

    Phase 3's whole pipeline must run without anyone configuring anything, and a
    real NUTS run must not. A default that waves both through is a decoration.
    """
    phase3 = estimate_identifiability(dimensions=4, sobol_n=512, grid_points=21)
    assert phase3.total < DEFAULT_MAX_EVALUATIONS
    assert_within_budget(phase3, env={})

    nuts = Estimate(inference=nuts_evaluations(4, 2000, 2000, 64))
    assert nuts.total > DEFAULT_MAX_EVALUATIONS
    with pytest.raises(BudgetExceeded):
        assert_within_budget(nuts, env={})

    # ...and it runs once somebody names a number.
    assert_within_budget(nuts, env={ENV_MAX_EVALUATIONS: str(nuts.total)})
