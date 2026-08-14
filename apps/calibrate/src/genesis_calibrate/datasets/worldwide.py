"""Every HYDE country, 0-1700 CE, century steps.

Climate is not in the Phase 4 model, so the 800 CE floor that asia2k imposed no
longer applies and the window opens up to the full century-resolution part of
HYDE. 1700 is the upper edge because HYDE switches to decadal steps after it and
the industrial transition breaks the single-growth-rate assumption anyway.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .series import _read_hyde_table

WINDOW_START = 0
WINDOW_END = 1700

#: Countries whose reported population never clears this are dropped. HYDE's
#: smallest entries are close to noise at century resolution.
MIN_POPULATION = 50_000.0

#: ISO numeric -> continent, for the V-04 holdout. Only what the test needs.
EUROPE = {
    8, 40, 56, 100, 191, 203, 208, 233, 246, 250, 276, 300, 348, 352, 372, 380,
    428, 440, 442, 470, 498, 499, 528, 578, 616, 620, 642, 643, 688, 703, 705,
    724, 752, 756, 792, 804, 807, 826,
}
ASIA = {
    4, 31, 48, 50, 51, 64, 96, 104, 116, 144, 156, 268, 275, 344, 356, 360, 364,
    368, 376, 392, 398, 400, 408, 410, 414, 417, 418, 422, 446, 458, 462, 496,
    512, 524, 586, 608, 634, 682, 702, 704, 760, 762, 764, 795, 860, 887,
}
AFRICA = {
    12, 24, 72, 108, 120, 132, 140, 148, 174, 178, 180, 204, 226, 231, 232, 262,
    266, 270, 288, 324, 384, 404, 426, 430, 434, 450, 454, 466, 478, 480, 504,
    508, 516, 562, 566, 624, 638, 646, 686, 690, 694, 706, 710, 716, 728, 729,
    748, 768, 788, 800, 818, 834, 854, 894,
}
AMERICAS = {
    28, 32, 44, 52, 68, 76, 84, 124, 152, 170, 188, 192, 212, 214, 218, 222, 308,
    320, 328, 332, 340, 388, 484, 558, 591, 600, 604, 630, 659, 662, 670, 740,
    780, 840, 858, 862,
}


def continent_of(iso: int) -> str:
    if iso in EUROPE:
        return "europe"
    if iso in ASIA:
        return "asia"
    if iso in AFRICA:
        return "africa"
    if iso in AMERICAS:
        return "americas"
    return "other"


@dataclass(frozen=True)
class WorldPanel:
    """Countries x centuries, as arrays. Row order is fixed and reported."""

    iso: np.ndarray
    continent: list[str]
    years: np.ndarray
    population: np.ndarray  # (n_countries, n_years)
    sigma: np.ndarray

    @property
    def n_countries(self) -> int:
        return int(self.population.shape[0])

    @property
    def n_observations(self) -> int:
        return int(self.population.size)


def build_panel(root: Path) -> WorldPanel:
    all_years, base_rows = _read_hyde_table(root / "hyde35/popc_c.txt")
    _, lower_rows = _read_hyde_table(root / "hyde35/popc_c_lower.txt")
    _, upper_rows = _read_hyde_table(root / "hyde35/popc_c_upper.txt")

    keep = [i for i, y in enumerate(all_years) if WINDOW_START <= y <= WINDOW_END]
    years = np.array([all_years[i] for i in keep], dtype=float)

    iso_list: list[int] = []
    populations: list[np.ndarray] = []
    sigmas: list[np.ndarray] = []

    for iso in sorted(base_rows):
        base = np.nan_to_num(base_rows[iso][keep])
        if float(np.min(base)) < MIN_POPULATION:
            continue
        lower = np.nan_to_num(lower_rows.get(iso, base_rows[iso])[keep])
        upper = np.nan_to_num(upper_rows.get(iso, base_rows[iso])[keep])
        sigma = np.maximum((upper - lower) / 2.0, np.maximum(base * 0.05, 1.0))
        iso_list.append(iso)
        populations.append(base)
        sigmas.append(sigma)

    return WorldPanel(
        iso=np.array(iso_list, dtype=int),
        continent=[continent_of(i) for i in iso_list],
        years=years,
        population=np.vstack(populations),
        sigma=np.vstack(sigmas),
    )
