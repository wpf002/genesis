"""Genesis calibration service.

Phase 3 adds Sobol global sensitivity analysis and profile-likelihood over the
free parameters. Phase 4 adds ABC-SMC / PyMC inference. Phase 0 exposes only a
health endpoint so the service is deployable and CI has something to assert on.

This service never writes a parameter without a provenance tag. A fitted
posterior is CALIBRATED and ships with its dataset reference; anything this
service cannot constrain is pinned to a literature value and tagged ESTIMATED,
or deleted.
"""

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="genesis-calibrate", version="0.0.0")


class Health(BaseModel):
    status: str
    phase: int


@app.get("/health")
def health() -> Health:
    return Health(status="ok", phase=0)
