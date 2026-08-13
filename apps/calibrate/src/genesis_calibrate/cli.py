"""Command line entry point.

    uv run python -m genesis_calibrate.cli dry-run

The timestamp is supplied by the caller rather than read from the clock, so a
dry run is reproducible.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .identifiability.report import write_report
from .pipeline import dry_run


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="genesis-calibrate")
    sub = parser.add_subparsers(dest="command", required=True)

    dry = sub.add_parser("dry-run", help="run the identifiability pipeline on synthetic data")
    dry.add_argument("--generated", default="unset", help="ISO timestamp to stamp on the report")
    dry.add_argument("--out", type=Path, default=None, help="where to write the JSON report")
    dry.add_argument("--sobol-n", type=int, default=256)
    dry.add_argument("--grid-points", type=int, default=15)

    args = parser.parse_args(argv)

    if args.command == "dry-run":
        report = dry_run(
            generated=args.generated,
            sobol_n=args.sobol_n,
            grid_points=args.grid_points,
        )
        print(f"mode={report.mode} model={report.model}")
        for verdict in report.verdicts:
            print(f"  {verdict.name:<20} {verdict.verdict:<18} {verdict.reason}")
        if args.out is not None:
            write_report(report, args.out)
            print(f"wrote {args.out}")
        if not report.non_identified:
            print(
                "dry-run: expected the synthetic model's known defect to surface; "
                "it did not",
                file=sys.stderr,
            )
            return 1
        return 0

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
