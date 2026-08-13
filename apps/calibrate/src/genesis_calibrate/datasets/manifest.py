"""Dataset manifests.

A dataset cannot be loaded without a manifest, and a manifest cannot omit the
checksum or the license. HYDE and the paleoclimate series are reconstructions,
not measurements, so a manifest that marks itself a reconstruction must give an
uncertainty for every variable. That is enforced here rather than left to a
reviewer to notice.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, model_validator

UncertaintyKind = Literal["absolute", "relative", "interval", "ensemble"]


class Uncertainty(BaseModel):
    kind: UncertaintyKind
    #: absolute -> same unit as the variable, relative -> fraction,
    #: interval -> nominal coverage (e.g. 0.95). Omitted for `ensemble`, where a
    #: scenario envelope has no coverage; say so in the note instead of
    #: inventing a number.
    value: float | None = None
    note: str | None = None

    @model_validator(mode="after")
    def value_or_note(self) -> Uncertainty:
        if self.kind == "ensemble":
            if self.note is None:
                raise ValueError("ensemble uncertainty must explain the envelope in a note")
            return self
        if self.value is None:
            raise ValueError(f"{self.kind} uncertainty requires a value")
        return self


class Variable(BaseModel):
    name: str
    unit: str
    description: str
    uncertainty: Uncertainty | None = None


class DatasetManifest(BaseModel):
    name: str
    version: str
    source_url: str
    license: str
    #: ISO date the file was retrieved. Passed in, never read from the clock.
    retrieved: str
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    file: str
    variables: list[Variable]
    is_reconstruction: bool
    notes: str | None = None

    @model_validator(mode="after")
    def reconstructions_must_carry_uncertainty(self) -> DatasetManifest:
        if not self.is_reconstruction:
            return self
        missing = [v.name for v in self.variables if v.uncertainty is None]
        if missing:
            raise ValueError(
                "reconstruction manifests must give an uncertainty for every "
                f"variable; missing: {', '.join(missing)}"
            )
        return self


class ChecksumMismatch(RuntimeError):
    def __init__(self, path: Path, expected: str, actual: str) -> None:
        super().__init__(
            f"{path}: sha256 {actual} does not match manifest {expected}. "
            "The file changed, or the manifest is stale. Refusing to load."
        )
        self.path = path
        self.expected = expected
        self.actual = actual


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_manifest(path: Path) -> DatasetManifest:
    return DatasetManifest.model_validate_json(path.read_text())


def verify(manifest: DatasetManifest, root: Path) -> Path:
    """Returns the data file path, or raises. There is no non-verifying load."""
    target = root / manifest.file
    if not target.exists():
        raise FileNotFoundError(f"{target} is missing (manifest {manifest.name})")
    actual = sha256_of(target)
    if actual != manifest.sha256:
        raise ChecksumMismatch(target, manifest.sha256, actual)
    return target


def write_manifest(manifest: DatasetManifest, path: Path) -> None:
    path.write_text(json.dumps(manifest.model_dump(), indent=2, sort_keys=True) + "\n")
