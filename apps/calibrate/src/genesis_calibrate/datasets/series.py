"""Build the fitting series from the verified raw files.

Two regions, century steps, 800-1500 CE. The window's lower edge is set by
asia2k, which starts at 800 CE; the step size is set by HYDE, which reports
population at century resolution until 1700.

Observation uncertainty for population is HYDE's base/lower/upper envelope
treated as +/- 1 sigma. That is an assumption, not HYDE's claim: the envelope is
a scenario range with no stated coverage. It is recorded here so the model card
can say so.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

WINDOW_START = 800
WINDOW_END = 1500

#: ISO numeric codes. China stands in for the Yellow River basin, which HYDE's
#: country tables cannot isolate; the sub-national tables could, and that is the
#: obvious refinement if this scope survives.
YELLOW_RIVER_ISO = [156]

#: Luterbacher's European domain is roughly 35-70N, 10W-40E. This is the subset
#: of it HYDE reports and the analysis aggregates.
EUROMED_ISO = [380, 300, 724, 250, 620, 792, 8, 100, 642, 40, 756, 276]


@dataclass(frozen=True)
class RegionSeries:
    name: str
    years: np.ndarray
    population: np.ndarray
    population_sigma: np.ndarray
    climate: np.ndarray

    def __len__(self) -> int:
        return int(self.years.size)


def _read_hyde_table(path: Path) -> tuple[list[int], dict[int, np.ndarray]]:
    lines = path.read_text().splitlines()
    years = [int(y) for y in lines[0].split()[1:]]
    rows: dict[int, np.ndarray] = {}
    for line in lines[1:]:
        parts = line.split()
        if not parts:
            continue
        try:
            iso = int(float(parts[0]))
        except ValueError:
            # The tables carry a trailing "Total" row. Not a region.
            continue
        values = np.array(
            [float(v) if v not in ("", "NA", "-9999") else np.nan for v in parts[1:]],
            dtype=float,
        )
        rows[iso] = values
    return years, rows


def _hyde_window(path: Path, iso_codes: list[int]) -> tuple[np.ndarray, np.ndarray]:
    years, rows = _read_hyde_table(path)
    keep = [i for i, y in enumerate(years) if WINDOW_START <= y <= WINDOW_END]
    window_years = np.array([years[i] for i in keep], dtype=float)

    total = np.zeros(len(keep), dtype=float)
    for iso in iso_codes:
        row = rows.get(iso)
        if row is None:
            raise KeyError(f"{path.name}: ISO {iso} not present")
        total += np.nan_to_num(row[keep])
    return window_years, total


#: asia2k's documented missing value. Members start in different years, so the
#: ensemble is ragged and early years are backed by far fewer members.
ASIA_MISSING = -99.999


def asia_member_counts(path: Path) -> dict[int, int]:
    counts: dict[int, int] = {}
    with path.open() as handle:
        for line in handle:
            if line.startswith("#") or line.lower().startswith("year"):
                continue
            parts = line.split()
            if len(parts) < 2:
                continue
            values = np.array(parts[1:], dtype=float)
            counts[int(parts[0])] = int(np.sum(~np.isclose(values, ASIA_MISSING)))
    return counts


def _asia_climate(path: Path) -> dict[int, float]:
    """asia2k is year plus 773 ensemble members. Median over present members."""
    out: dict[int, float] = {}
    with path.open() as handle:
        for line in handle:
            if line.startswith("#") or line.lower().startswith("year"):
                continue
            parts = line.split()
            if len(parts) < 2:
                continue
            values = np.array(parts[1:], dtype=float)
            present = values[~np.isclose(values, ASIA_MISSING)]
            if present.size == 0:
                continue
            out[int(parts[0])] = float(np.median(present))
    return out


def _euromed_climate(path: Path) -> dict[int, float]:
    """Year, Mean, Lower2sigma, Upper2sigma."""
    out: dict[int, float] = {}
    with path.open() as handle:
        for line in handle:
            if line.startswith("#") or line.lower().startswith("year"):
                continue
            parts = line.split()
            if len(parts) < 2:
                continue
            out[int(parts[0])] = float(parts[1])
    return out


def _century_means(annual: dict[int, float], years: np.ndarray) -> np.ndarray:
    """Mean over the century ending at each reported year."""
    means: list[float] = []
    for year in years:
        block = [v for y, v in annual.items() if year - 100 < y <= year]
        means.append(float(np.mean(block)) if block else np.nan)
    return np.array(means, dtype=float)


def build_region(
    root: Path,
    name: str,
    iso_codes: list[int],
    climate_file: str,
    climate_reader: str,
) -> RegionSeries:
    years, base = _hyde_window(root / "hyde35/popc_c.txt", iso_codes)
    _, lower = _hyde_window(root / "hyde35/popc_c_lower.txt", iso_codes)
    _, upper = _hyde_window(root / "hyde35/popc_c_upper.txt", iso_codes)

    # Envelope half-width as a stand-in for one sigma. See the module docstring.
    sigma = np.maximum((upper - lower) / 2.0, np.maximum(base * 0.05, 1.0))

    path = root / "pages2k" / climate_file
    annual = _asia_climate(path) if climate_reader == "asia" else _euromed_climate(path)
    climate = _century_means(annual, years)

    return RegionSeries(
        name=name,
        years=years,
        population=base,
        population_sigma=sigma,
        climate=climate,
    )


def build_all(root: Path) -> list[RegionSeries]:
    return [
        build_region(
            root, "yellow_river", YELLOW_RIVER_ISO, "asia2k-jja-temp-anom.txt", "asia"
        ),
        build_region(
            root, "euromed", EUROMED_ISO, "eujja_2krecon_nested_cps.txt", "euromed"
        ),
    ]
