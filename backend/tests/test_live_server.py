import httpx

BASE_URL = "http://127.0.0.1:8000"

def test_live_server():
    with httpx.Client(base_url=BASE_URL, timeout=5.0) as client:
        # 1. Health
        res = client.get("/api/health")
        assert res.status_code == 200
        health = res.json()
        assert health["status"] == "healthy"
        print("[OK] Live Health API Check Passed:", health)

        # 2. Overview
        res = client.get("/api/overview")
        assert res.status_code == 200
        overview = res.json()
        assert overview["water_status"] in ["Normal", "Attention Required"]
        print("[OK] Live Overview API Check Passed: Total Active Alerts =", overview["total_active_alerts"])

        # 3. Create Device Issue
        issue_payload = {
            "device_name": "Library 3rd Floor Restroom Faucet",
            "device_type": "Tap",
            "resource_type": "Water",
            "building": "Library Building",
            "location": "3rd Floor West Restroom",
            "description": "Continuous leak through faulty tap cartridge.",
            "severity": "High",
            "estimated_waste": 45.0,
            "waste_unit": "litres/day",
            "reporter_name": "Campus Maintenance Lead"
        }
        res = client.post("/api/devices/issues", json=issue_payload)
        assert res.status_code == 201
        created_issue = res.json()
        issue_id = created_issue["id"]
        print(f"[OK] Live Device Issue Creation Passed: ID #{issue_id}")

        # 4. Check Linked Alert
        res = client.get("/api/alerts?resource_type=Water")
        assert res.status_code == 200
        alerts = res.json()
        linked_alert = next((a for a in alerts if a.get("linked_device_issue_id") == issue_id), None)
        assert linked_alert is not None, "Linked alert should be automatically generated for High severity issue"
        alert_id = linked_alert["id"]
        print(f"[OK] Linked Alert Auto-Creation Passed: Alert ID #{alert_id} for Issue #{issue_id}")

        # 5. Patch Device Issue to In Progress
        res = client.patch(f"/api/devices/issues/{issue_id}", json={
            "status": "In Progress",
            "repair_notes": "Technician dispatched with replacement ceramic disc cartridge."
        })
        assert res.status_code == 200
        assert res.json()["status"] == "In Progress"
        print("[OK] Live Device Issue In-Progress Update Passed")

        # 6. Patch Device Issue to Resolved and verify Linked Alert is Resolved
        res = client.patch(f"/api/devices/issues/{issue_id}", json={
            "status": "Resolved",
            "repair_notes": "Cartridge replaced and valve seal tested."
        })
        assert res.status_code == 200
        assert res.json()["status"] == "Resolved"
        assert res.json()["resolved_at"] is not None

        # Check linked alert status is synced
        res = client.get(f"/api/alerts")
        alert_updated = next(a for a in res.json() if a["id"] == alert_id)
        assert alert_updated["status"] == "Resolved"
        print("[OK] Linked Alert Synchronized to Resolved Successfully")

        # 7. Test Garbage & Readings
        res = client.get("/api/garbage")
        assert res.status_code == 200
        assert len(res.json()) >= 6
        print(f"[OK] Live Garbage Bins Telemetry: {len(res.json())} bins checked")

        res = client.get("/api/water")
        assert res.status_code == 200
        print(f"[OK] Live Water Telemetry: {len(res.json())} meters checked")

        res = client.get("/api/electricity")
        assert res.status_code == 200
        print(f"[OK] Live Electricity Telemetry: {len(res.json())} panels checked")

    print("\nALL LIVE SERVER E2E INTEGRATION TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_live_server()
