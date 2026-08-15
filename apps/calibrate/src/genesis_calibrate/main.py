"""Genesis calibration service.

Phase 3 adds Sobol global sensitivity analysis and profile-likelihood over the
free parameters. Phase 4 adds ABC-SMC / PyMC inference. Phase 0 exposes only a
health endpoint so the service is deployable and CI has something to assert on.

This service never writes a parameter without a provenance tag. A fitted
posterior is CALIBRATED and ships with its dataset reference; anything this
service cannot constrain is pinned to a literature value and tagged ESTIMATED,
or deleted.
"""

import os

from fastapi import FastAPI
from pydantic import BaseModel

from .budget import DEFAULT_MAX_EVALUATIONS, ENV_MAX_EVALUATIONS, max_evaluations

app = FastAPI(title="genesis-calibrate", version="0.0.0")


class Health(BaseModel):
    status: str
    phase: int


class Budget(BaseModel):
    """The cap in force, so it can be read rather than assumed."""

    max_evaluations: int
    explicit: bool
    env_var: str
    default: int


@app.get("/health")
def health() -> Health:
    return Health(status="ok", phase=0)


@app.get("/budget")
def budget() -> Budget:
    raw = os.environ.get(ENV_MAX_EVALUATIONS)
    return Budget(
        max_evaluations=max_evaluations(),
        # False means the cap was inherited. Unattended runs refuse to start on
        # an inherited cap; see budget.py.
        explicit=raw is not None,
        env_var=ENV_MAX_EVALUATIONS,
        default=DEFAULT_MAX_EVALUATIONS,
    )
