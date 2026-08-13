"""Manifests for the datasets actually in data/raw/.

Checksums are filled in by `python -m genesis_calibrate.datasets.sources refresh`,
which hashes what is on disk. Retrieval dates are passed in, never read from the
clock.

Both sources are reconstructions. HYDE's uncertainty is a scenario envelope
(base/lower/upper), not a credible interval, and is recorded as such.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .manifest import DatasetManifest, Uncertainty, Variable, sha256_of, write_manifest

HYDE_URL = (
    "https://geo.public.data.uu.nl/vault-hyde/hyde35_c9_apr2025%5B1749214444%5D/"
)
PAGES2K_URL = "https://www.ncei.noaa.gov/pub/data/paleo/pages2k/"

#: The vault License.txt says CC BY-NC 4.0 and readme_HYDE_3.5.txt says CC BY 3.0.
#: They disagree about commercial use. Recorded verbatim rather than resolved.
HYDE_LICENSE = "CC BY-NC 4.0 (License.txt) / CC BY 3.0 (readme_HYDE_3.5.txt) — sources disagree"

POPULATION_ENVELOPE = Uncertainty(
    kind="ensemble",
    note=(
        "HYDE ships base, lower and upper scenarios. The spread is a scenario "
        "envelope, not a credible interval, and has no stated coverage."
    ),
)


def _hyde(file: str, variable: str, unit: str, description: str) -> DatasetManifest:
    return DatasetManifest(
        name=f"hyde-3.5-{Path(file).stem}",
        version="3.5 (gbc2025_7apr)",
        source_url=HYDE_URL,
        license=HYDE_LICENSE,
        retrieved="2026-08-13",
        sha256="0" * 64,
        file=f"hyde35/{file}",
        is_reconstruction=True,
        variables=[
            Variable(
                name=variable,
                unit=unit,
                description=description,
                uncertainty=POPULATION_ENVELOPE,
            )
        ],
    )


def _pages2k(file: str, variable: str, unit: str, description: str, note: str) -> DatasetManifest:
    return DatasetManifest(
        name=f"pages2k-{Path(file).stem}",
        version="v2.0.0 (2017)",
        source_url=PAGES2K_URL,
        license="NOAA/WDS Paleoclimatology — public domain, cite the study",
        retrieved="2026-08-13",
        sha256="0" * 64,
        file=f"pages2k/{file}",
        is_reconstruction=True,
        variables=[
            Variable(
                name=variable,
                unit=unit,
                description=description,
                uncertainty=Uncertainty(kind="ensemble", note=note),
            )
        ],
    )


def all_manifests() -> list[DatasetManifest]:
    return [
        _hyde("popc_c.txt", "population", "people", "Population count per country, base scenario"),
        _hyde("popc_c_lower.txt", "population", "people", "Population count per country, lower scenario"),
        _hyde("popc_c_upper.txt", "population", "people", "Population count per country, upper scenario"),
        _hyde("cropland_c.txt", "cropland", "km2", "Cropland area per country"),
        _hyde("ir_rice_c.txt", "irrigated_rice", "km2", "Irrigated rice area per country"),
        _hyde("ir_norice_c.txt", "irrigated_other", "km2", "Irrigated non-rice area per country"),
        _hyde("rf_rice_c.txt", "rainfed_rice", "km2", "Rain-fed rice area per country"),
        _hyde("rf_norice_c.txt", "rainfed_other", "km2", "Rain-fed non-rice area per country"),
        _hyde("grazing_c.txt", "grazing", "km2", "Grazing land per country"),
        _pages2k(
            "asia2k-jja-temp-anom.txt",
            "jja_temperature_anomaly",
            "degC",
            "PAGES2k Asia summer temperature anomaly reconstruction, 800-2009 CE",
            (
                "773-member ensemble with -99.999 for missing. Members start in "
                "different years: 378 of 773 present at 800 CE, 682 by 1500."
            ),
        ),
        _pages2k(
            "eujja_2krecon_nested_cps.txt",
            "jja_temperature_anomaly",
            "degC",
            "PAGES2k Euro-Med summer temperature reconstruction (Luterbacher 2016), 138 BCE-2003 CE",
            "Ships its own 2-sigma bounds as Lower2sigma / Upper2sigma columns.",
        ),
    ]


def refresh(root: Path, out: Path) -> int:
    out.mkdir(parents=True, exist_ok=True)
    missing: list[str] = []
    for manifest in all_manifests():
        target = root / manifest.file
        if not target.exists():
            missing.append(manifest.file)
            continue
        stamped = manifest.model_copy(update={"sha256": sha256_of(target)})
        write_manifest(stamped, out / f"{stamped.name}.json")
        print(f"{stamped.sha256[:12]}  {stamped.file}")
    for path in missing:
        print(f"missing: {path}", file=sys.stderr)
    return 1 if missing else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="genesis-calibrate-sources")
    parser.add_argument("command", choices=["refresh"])
    parser.add_argument("--root", type=Path, default=Path("data/raw"))
    parser.add_argument("--out", type=Path, default=Path("data/manifests"))
    args = parser.parse_args(argv)
    return refresh(args.root, args.out)


if __name__ == "__main__":
    raise SystemExit(main())
