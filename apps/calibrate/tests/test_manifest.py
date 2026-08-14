from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from genesis_calibrate.datasets.manifest import (
    ChecksumMismatch,
    DatasetManifest,
    load_manifest,
    sha256_of,
    verify,
    write_manifest,
)

RECONSTRUCTION = {
    "name": "test-series",
    "version": "1.0",
    "source_url": "https://example.invalid/series",
    "license": "CC-BY-4.0",
    "retrieved": "2026-08-13",
    "sha256": "0" * 64,
    "file": "series.csv",
    "is_reconstruction": True,
    "variables": [
        {
            "name": "population",
            "unit": "people",
            "description": "reconstructed population",
            "uncertainty": {"kind": "relative", "value": 0.25},
        }
    ],
}


def test_reconstruction_without_uncertainty_is_rejected() -> None:
    payload = json.loads(json.dumps(RECONSTRUCTION))
    payload["variables"][0].pop("uncertainty")
    with pytest.raises(ValidationError) as excinfo:
        DatasetManifest.model_validate(payload)
    assert "uncertainty" in str(excinfo.value)


def test_measurement_may_omit_uncertainty() -> None:
    payload = json.loads(json.dumps(RECONSTRUCTION))
    payload["is_reconstruction"] = False
    payload["variables"][0].pop("uncertainty")
    assert DatasetManifest.model_validate(payload).is_reconstruction is False


def test_malformed_checksum_is_rejected() -> None:
    payload = json.loads(json.dumps(RECONSTRUCTION))
    payload["sha256"] = "not-a-digest"
    with pytest.raises(ValidationError):
        DatasetManifest.model_validate(payload)


def test_verify_refuses_a_changed_file(tmp_path: Path) -> None:
    data = tmp_path / "series.csv"
    data.write_text("year,population\n0,1000\n")

    payload = json.loads(json.dumps(RECONSTRUCTION))
    payload["sha256"] = sha256_of(data)
    manifest = DatasetManifest.model_validate(payload)
    assert verify(manifest, tmp_path) == data

    data.write_text("year,population\n0,9999\n")
    with pytest.raises(ChecksumMismatch):
        verify(manifest, tmp_path)


def test_missing_file_is_reported(tmp_path: Path) -> None:
    manifest = DatasetManifest.model_validate(RECONSTRUCTION)
    with pytest.raises(FileNotFoundError):
        verify(manifest, tmp_path)


def test_manifest_round_trips(tmp_path: Path) -> None:
    manifest = DatasetManifest.model_validate(RECONSTRUCTION)
    path = tmp_path / "manifest.json"
    write_manifest(manifest, path)
    assert load_manifest(path) == manifest


def test_ensemble_uncertainty_requires_a_note_not_a_fake_coverage() -> None:
    from genesis_calibrate.datasets.manifest import Uncertainty

    with pytest.raises(ValidationError):
        Uncertainty(kind="ensemble")
    assert Uncertainty(kind="ensemble", note="base/lower/upper scenarios").value is None

    with pytest.raises(ValidationError):
        Uncertainty(kind="relative")


def test_unstated_uncertainty_is_a_real_category_not_a_hedge() -> None:
    from genesis_calibrate.datasets.manifest import Uncertainty

    # A reconstruction whose authors publish no error estimate must be sayable
    # without inventing a number.
    u = Uncertainty(kind="unstated", note="Maddison publishes no error estimate")
    assert u.value is None
    with pytest.raises(ValidationError):
        Uncertainty(kind="unstated")


def test_manifests_declare_a_layer_and_rigor_inputs_are_separable() -> None:
    from genesis_calibrate.datasets.sources import all_manifests

    layers = {m.name: m.layer for m in all_manifests()}
    rigor = [n for n, layer in layers.items() if layer == "RIGOR"]
    assert all(n.startswith(("hyde-", "pages2k-")) for n in rigor)
    # Sandbox data must never be a Rigor input.
    assert "maddison-2020" in layers
    assert layers["maddison-2020"] == "SANDBOX"
    assert layers["un-wpp-2024-total-population"] == "PROJECTION"
