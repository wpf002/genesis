"""The dry run, and the rule that keeps it out of the findings directory."""

from __future__ import annotations

from pathlib import Path

import pytest

from genesis_calibrate.identifiability.report import (
    DryRunLeak,
    IdentifiabilityReport,
    write_report,
)
from genesis_calibrate.pipeline import dry_run


def test_dry_run_finds_the_planted_defect() -> None:
    report = dry_run(generated="2026-08-13", sobol_n=128, grid_points=11)
    verdicts = {v.name: v.verdict for v in report.verdicts}

    # yield_gain and climate_scale only ever appear as a product.
    assert verdicts["yield_gain"] == "NON_IDENTIFIED"
    assert verdicts["climate_scale"] == "NON_IDENTIFIED"
    # If everything came back non-identifiable the harness would be useless too.
    assert verdicts["carrying_capacity"] == "IDENTIFIABLE"
    assert verdicts["growth_rate"] == "IDENTIFIABLE"


def test_dry_run_is_labeled_and_claims_nothing_about_real_data() -> None:
    report = dry_run(generated="2026-08-13", sobol_n=128, grid_points=11)
    assert report.mode == "DRY_RUN"
    assert "synthetic" in report.dataset


def test_dry_run_report_cannot_be_written_to_model_cards(tmp_path: Path) -> None:
    report = dry_run(generated="2026-08-13", sobol_n=128, grid_points=11)
    target = tmp_path / "docs" / "model-cards" / "identifiability.json"
    with pytest.raises(DryRunLeak):
        write_report(report, target)
    assert not target.exists()


def test_real_reports_may_be_written_there(tmp_path: Path) -> None:
    report = dry_run(generated="2026-08-13", sobol_n=128, grid_points=11)
    real = IdentifiabilityReport(
        mode="REAL",
        model=report.model,
        dataset="hyde-3.3 + pages2k",
        generated=report.generated,
        verdicts=report.verdicts,
    )
    target = tmp_path / "docs" / "model-cards" / "identifiability.json"
    write_report(real, target)
    assert target.exists()


def test_dry_run_is_reproducible() -> None:
    first = dry_run(generated="2026-08-13", sobol_n=128, grid_points=11)
    second = dry_run(generated="2026-08-13", sobol_n=128, grid_points=11)
    assert first.to_json() == second.to_json()
