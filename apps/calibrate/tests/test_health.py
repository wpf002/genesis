from fastapi.testclient import TestClient

from genesis_calibrate.main import app

client = TestClient(app)


def test_health() -> None:
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "phase": 0}
