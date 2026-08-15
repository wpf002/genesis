from fastapi.testclient import TestClient

from genesis_calibrate.main import app

client = TestClient(app)


def test_health() -> None:
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "phase": 0}


def test_budget_is_readable_not_assumed() -> None:
    res = client.get("/budget")
    assert res.status_code == 200
    body = res.json()
    assert body["env_var"] == "GENESIS_CALIBRATE_MAX_EVALS"
    assert body["max_evaluations"] > 0
    # Nobody set it in the test environment, so it is inherited.
    assert body["explicit"] is False
