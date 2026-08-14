"""Per-country series, rather than two aggregated regions.

Phase 3's first pass used two regions and got 16 observations. HYDE reports every
country, so the same window and the same climate reconstructions give an order of
magnitude more data — and a climate sensitivity shared across countries is
constrained by all of them at once.

The assumption this rests on: every country inside a climate domain is assigned
that domain's anomaly series. That is an approximation. It is defensible for the
Euro-Mediterranean and East Asian domains the two PAGES2k reconstructions were
built for, and it is why the country lists below are deliberately conservative
rather than "everything on the continent".
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from .series import (
    WINDOW_END,
    WINDOW_START,
    RegionSeries,
    _asia_climate,
    _century_means,
    _euromed_climate,
    _hyde_window,
    _read_hyde_table,
)

#: East and Central Asia, where the PAGES2k Asia reconstruction is defensible.
#: Deliberately excludes tropical South-East Asia and the Indian subcontinent,
#: whose climate is monsoon-driven and not represented by this series.
ASIA_DOMAIN: dict[str, int] = {
    "china": 156,
    "japan": 392,
    "korea_north": 408,
    "korea_south": 410,
    "mongolia": 496,
    "afghanistan": 4,
    "nepal": 524,
    "bhutan": 64,
}

#: Luterbacher's European domain, roughly 35-70N and 10W-40E.
EUROMED_DOMAIN: dict[str, int] = {
    "italy": 380,
    "greece": 300,
    "spain": 724,
    "france": 250,
    "portugal": 620,
    "turkey": 792,
    "albania": 8,
    "bulgaria": 100,
    "romania": 642,
    "austria": 40,
    "switzerland": 756,
    "germany": 276,
    "poland": 616,
    "hungary": 348,
    "netherlands": 528,
    "belgium": 56,
    "united_kingdom": 826,
    "ireland": 372,
    "denmark": 208,
    "sweden": 752,
    "norway": 578,
    "czechia": 203,
}

#: Countries whose reported population never clears this in the window are
#: dropped: HYDE's smallest entries are close to noise at century resolution.
MIN_POPULATION = 100_000.0


def _domain_climate(root: Path, domain: str, years: np.ndarray) -> np.ndarray:
    if domain == "asia":
        annual = _asia_climate(root / "pages2k/asia2k-jja-temp-anom.txt")
    else:
        annual = _euromed_climate(root / "pages2k/eujja_2krecon_nested_cps.txt")
    return _century_means(annual, years)


def build_global(root: Path) -> list[RegionSeries]:
    years, _ = _hyde_window(root / "hyde35/popc_c.txt", [156])
    all_years, base_rows = _read_hyde_table(root / "hyde35/popc_c.txt")
    _, lower_rows = _read_hyde_table(root / "hyde35/popc_c_lower.txt")
    _, upper_rows = _read_hyde_table(root / "hyde35/popc_c_upper.txt")
    keep = [i for i, y in enumerate(all_years) if WINDOW_START <= y <= WINDOW_END]

    out: list[RegionSeries] = []
    for domain, members in (("asia", ASIA_DOMAIN), ("euromed", EUROMED_DOMAIN)):
        climate = _domain_climate(root, domain, years)
        for name, iso in members.items():
            row = base_rows.get(iso)
            if row is None:
                continue
            base = np.nan_to_num(row[keep])
            if float(np.min(base)) < MIN_POPULATION:
                continue
            lower = np.nan_to_num((lower_rows.get(iso, row))[keep])
            upper = np.nan_to_num((upper_rows.get(iso, row))[keep])
            sigma = np.maximum((upper - lower) / 2.0, np.maximum(base * 0.05, 1.0))
            out.append(
                RegionSeries(
                    name=f"{domain}:{name}",
                    years=years,
                    population=base,
                    population_sigma=sigma,
                    climate=climate,
                )
            )
    return out
