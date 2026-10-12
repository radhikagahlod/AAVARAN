import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from database import Base, SessionLocal, engine
import services

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    services.seed_database_if_empty(db)
    db.close()
    yield


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert "version" in data


def test_overview_endpoint():
    response = client.get("/api/overview")
    assert response.status_code == 200
    data = response.json()
    assert "current_water_consumption" in data
    assert "current_electricity_consumption" in data
    assert "average_garbage_fill_level" in data
    assert "total_active_alerts" in data
    assert "device_summary" in data
    assert isinstance(data["high_priority_alerts"], list)
    assert isinstance(data["recent_water_readings"], list)
    assert isinstance(data["recent_electricity_readings"], list)
    assert data["is_synthetic_data"] is True


def test_water_endpoint():
    response = client.get("/api/water")
    assert response.status_code == 200
    readings = response.json()
    assert len(readings) > 0
    first = readings[0]
    assert "consumption" in first
    assert "unit" in first
    assert first["unit"] == "litres"
    assert "status" in first


def test_electricity_endpoint():
    response = client.get("/api/electricity")
    assert response.status_code == 200
    readings = response.json()
    assert len(readings) > 0
    first = readings[0]
    assert "consumption" in first
    assert "unit" in first
    assert first["unit"] == "kWh"
    assert "status" in first


def test_garbage_endpoint():
    response = client.get("/api/garbage")
    assert response.status_code == 200
    bins = response.json()
    assert len(bins) > 0
    for b in bins:
        assert 0.0 <= b["fill_level"] <= 100.0
        assert b["status"] in ["Normal", "Attention", "Collection Recommended"]


def test_alerts_endpoints():
    response = client.get("/api/alerts")
    assert response.status_code == 200
    alerts = response.json()
    assert len(alerts) > 0

    active_alert = next((a for a in alerts if a["status"] == "Active"), None)
    assert active_alert is not None
    alert_id = active_alert["id"]

    # Test resolve
    res_response = client.post(f"/api/alerts/{alert_id}/resolve")
    assert res_response.status_code == 200
    resolved_alert = res_response.json()
    assert resolved_alert["status"] == "Resolved"
    assert resolved_alert["resolved_at"] is not None

    # Test reopen
    reopen_response = client.post(f"/api/alerts/{alert_id}/reopen")
    assert reopen_response.status_code == 200
    reopened_alert = reopen_response.json()
    assert reopened_alert["status"] == "Active"
    assert reopened_alert["resolved_at"] is None

    # Test non-existent alert 404
    not_found = client.post("/api/alerts/99999/resolve")
    assert not_found.status_code == 404


def test_device_summary_endpoint():
    response = client.get("/api/devices/summary")
    assert response.status_code == 200
    summary = response.json()
    assert "total_issues" in summary
    assert "open_issues" in summary
    assert "in_progress_issues" in summary
    assert "resolved_issues" in summary
    assert "high_priority_issues" in summary


def test_device_issue_workflow_and_alert_linkage():
    # 1. Create a new high-severity device issue
    payload = {
        "device_name": "Chemistry Lab Main Water Valve",
        "device_type": "Valve",
        "resource_type": "Water",
        "building": "Science Complex",
        "location": "Lab 204 Emergency Shutoff",
        "description": "Pressure valve valve pin sticking, causing periodic overflow backflow",
        "severity": "High",
        "estimated_waste": 80.0,
        "waste_unit": "litres/day",
        "reporter_name": "Lab Assistant Maya",
    }
    create_res = client.post("/api/devices/issues", json=payload)
    assert create_res.status_code == 201
    issue_data = create_res.json()
    issue_id = issue_data["id"]
    assert issue_data["status"] == "Reported"
    assert issue_data["device_name"] == payload["device_name"]

    # 2. Check that a linked alert was generated for High severity
    alerts_res = client.get(f"/api/alerts?resource_type=Water")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    linked_alert = next((a for a in alerts if a.get("linked_device_issue_id") == issue_id), None)
    assert linked_alert is not None
    assert linked_alert["status"] == "Active"

    # 3. Update status to In Progress with repair notes
    patch_progress = client.patch(
        f"/api/devices/issues/{issue_id}",
        json={"status": "In Progress", "repair_notes": "Plumber dispatched with replacement gasket."},
    )
    assert patch_progress.status_code == 200
    assert patch_progress.json()["status"] == "In Progress"
    assert "gasket" in patch_progress.json()["repair_notes"]

    # 4. Resolve the issue and verify linked alert also becomes Resolved
    patch_resolve = client.patch(
        f"/api/devices/issues/{issue_id}",
        json={"status": "Resolved", "repair_notes": "Gasket replaced and pressure tested."},
    )
    assert patch_resolve.status_code == 200
    resolved_issue = patch_resolve.json()
    assert resolved_issue["status"] == "Resolved"
    assert resolved_issue["resolved_at"] is not None

    # Verify linked alert status
    alerts_after = client.get(f"/api/alerts")
    alert_check = next((a for a in alerts_after.json() if a.get("linked_device_issue_id") == issue_id), None)
    assert alert_check is not None
    assert alert_check["status"] == "Resolved"

    # 5. Reopen the issue and verify linked alert also reopens to Active
    patch_reopen = client.patch(
        f"/api/devices/issues/{issue_id}",
        json={"status": "Reported"},
    )
    assert patch_reopen.status_code == 200
    assert patch_reopen.json()["status"] == "Reported"

    alerts_reopened = client.get(f"/api/alerts")
    alert_check2 = next((a for a in alerts_reopened.json() if a.get("linked_device_issue_id") == issue_id), None)
    assert alert_check2 is not None
    assert alert_check2["status"] == "Active"


def test_device_issue_validation():
    # Missing required field
    res = client.post("/api/devices/issues", json={"device_name": "Test"})
    assert res.status_code == 422

    # Invalid severity
    bad_payload = {
        "device_name": "Test Device",
        "device_type": "Tap",
        "resource_type": "Water",
        "building": "Library",
        "location": "Room 101",
        "description": "Leaking fixture",
        "severity": "SuperCritical",  # Invalid
    }
    res_bad = client.post("/api/devices/issues", json=bad_payload)
    assert res_bad.status_code == 422

    # Non-existent device issue 404
    not_found = client.get("/api/devices/issues/99999")
    assert not_found.status_code == 404
