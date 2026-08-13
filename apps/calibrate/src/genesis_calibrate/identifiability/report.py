"""Identifiability report objects.

A report carries the mode it was produced in. A DRY_RUN report is machinery
output and may not be written into docs/model-cards/, because that directory is
where Phase 3's exit gate looks and nothing synthetic belongs there.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal

from .verdict import ParameterVerdict

RunMode = Literal["DRY_RUN", "REAL"]

MODEL_CARD_DIR = "model-cards"


class DryRunLeak(RuntimeError):
    """Raised when a synthetic report is about to be written where real ones live."""


@dataclass(frozen=True)
class IdentifiabilityReport:
    mode: RunMode
    model: str
    dataset: str
    #: Passed in by the caller. Nothing here reads the clock.
    generated: str
    verdicts: list[ParameterVerdict]

    @property
    def non_identified(self) -> list[ParameterVerdict]:
        return [v for v in self.verdicts if v.verdict in ("NON_IDENTIFIED", "INSENSITIVE")]

    def to_json(self) -> str:
        payload = {
            "mode": self.mode,
            "model": self.model,
            "dataset": self.dataset,
            "generated": self.generated,
            "verdicts": [asdict(v) for v in self.verdicts],
        }
        return json.dumps(payload, indent=2, sort_keys=True) + "\n"


def write_report(report: IdentifiabilityReport, path: Path) -> None:
    if report.mode == "DRY_RUN" and MODEL_CARD_DIR in path.parts:
        raise DryRunLeak(
            f"refusing to write a DRY_RUN report to {path}. "
            "docs/model-cards/ holds findings about real data; a synthetic run is "
            "not a finding."
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(report.to_json())
