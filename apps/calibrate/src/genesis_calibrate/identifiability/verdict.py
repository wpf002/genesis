"""Turning the two analyses into a per-parameter verdict.

The roadmap requires that every parameter get one of these before Phase 3 can
close, and that anything non-identified is deleted or pinned to a literature
value and retagged ESTIMATED. This module produces the verdict; it does not
decide what to do about it.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from .profile import ProfileResult
from .sobol import SobolResult

Verdict = Literal["IDENTIFIABLE", "WEAKLY_IDENTIFIED", "NON_IDENTIFIED", "INSENSITIVE"]

#: Total-order Sobol index below which an output simply does not respond.
INSENSITIVITY_THRESHOLD = 0.01


@dataclass(frozen=True)
class ParameterVerdict:
    name: str
    verdict: Verdict
    total_order: float
    max_delta: float
    bounded_below: bool
    bounded_above: bool
    reason: str


def classify(
    name: str,
    sobol: SobolResult,
    profile: ProfileResult,
    insensitivity_threshold: float = INSENSITIVITY_THRESHOLD,
) -> ParameterVerdict:
    total_order = float(sobol.total_order[sobol.names.index(name)])
    below = profile.exceeds_below
    above = profile.exceeds_above

    if total_order < insensitivity_threshold:
        verdict: Verdict = "INSENSITIVE"
        reason = (
            f"total-order Sobol index {total_order:.4f} is below "
            f"{insensitivity_threshold}: the output does not respond to this parameter"
        )
    elif below and above:
        verdict = "IDENTIFIABLE"
        reason = "profile likelihood is bounded on both sides"
    elif below or above:
        verdict = "WEAKLY_IDENTIFIED"
        side = "below" if below else "above"
        reason = f"profile likelihood is bounded {side} only; the other side is open"
    else:
        verdict = "NON_IDENTIFIED"
        reason = (
            f"profile likelihood never exceeds the threshold "
            f"(max delta {profile.max_delta:.3f} < {profile.threshold:.3f}): "
            "the data cannot constrain this parameter"
        )

    return ParameterVerdict(
        name=name,
        verdict=verdict,
        total_order=total_order,
        max_delta=profile.max_delta,
        bounded_below=below,
        bounded_above=above,
        reason=reason,
    )
