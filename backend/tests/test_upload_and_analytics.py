import io
import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from database import Base, SessionLocal, engine
import services

client = TestClient(app)
SAMPLE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "sample_data"))


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    services.seed_database_if_empty(db)
    services.seed_documents_if_empty(db)
    db.close()
    yield


def test_upload_file_validation():
    # Attempt uploading an unsupported file format (.exe)
    fake_exe = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00")
    res = client.post(
        "/api/upload/extract",
        files={"file": ("malicious.exe", fake_exe, "application/x-msdownload")},
        data={"category": "electricity_bill", "building": "Admin", "billing_period": "2026-09"},
    )
    assert res.status_code == 400
    assert "Unsupported file type" in res.json()["detail"]


def test_extract_and_confirm_electricity_bill_pdf():
    pdf_path = os.path.join(SAMPLE_DIR, "sample_electricity_bill.pdf")
    with open(pdf_path, "rb") as f:
        file_bytes = f.read()

    # Step 1: Extract
    res = client.post(
        "/api/upload/extract",
        files={"file": ("sample_electricity_bill.pdf", io.BytesIO(file_bytes), "application/pdf")},
        data={
            "category": "electricity_bill",
            "building": "Science Complex",
            "billing_period": "September 2026",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "temp_token" in data
    assert data["consumption"] == 218.0
    assert data["bill_amount"] == 2177.0
    assert data["consumer_number"] == "CAMPUS-EL-90214"
    assert data["meter_number"] == "MTR-SCIENCE-401"
    temp_token = data["temp_token"]

    # Step 2: Confirm
    confirm_res = client.post(
        "/api/upload/confirm",
        json={
            "temp_token": temp_token,
            "category": "electricity_bill",
            "building": "Science Complex",
            "billing_period": "September 2026",
            "consumption": 218.0,
            "consumption_unit": "kWh",
            "bill_amount": 2177.0,
            "consumer_number": "CAMPUS-EL-90214",
            "meter_number": "MTR-SCIENCE-401",
            "previous_reading": 13200.0,
            "current_reading": 13418.0,
            "notes": "Verified against physical utility voucher.",
        },
    )
    assert confirm_res.status_code == 201
    confirmed_doc = confirm_res.json()
    doc_id = confirmed_doc["id"]
    assert confirmed_doc["status"] == "Confirmed"
    assert confirmed_doc["consumption"] == 218.0

    # Step 3: Check document list & detail
    doc_res = client.get(f"/api/documents/{doc_id}")
    assert doc_res.status_code == 200
    assert doc_res.json()["filename"] == "sample_electricity_bill.pdf"


def test_extract_and_confirm_water_bill_pdf():
    pdf_path = os.path.join(SAMPLE_DIR, "sample_water_bill.pdf")
    with open(pdf_path, "rb") as f:
        file_bytes = f.read()

    res = client.post(
        "/api/upload/extract",
        files={"file": ("sample_water_bill.pdf", io.BytesIO(file_bytes), "application/pdf")},
        data={
            "category": "water_bill",
            "building": "Engineering Block A",
            "billing_period": "September 2026",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["consumption"] == 1280.0
    assert data["bill_amount"] == 1100.0
    temp_token = data["temp_token"]

    confirm_res = client.post(
        "/api/upload/confirm",
        json={
            "temp_token": temp_token,
            "category": "water_bill",
            "building": "Engineering Block A",
            "billing_period": "September 2026",
            "consumption": 1280.0,
            "consumption_unit": "litres",
            "bill_amount": 1100.0,
        },
    )
    assert confirm_res.status_code == 201


def test_extract_and_confirm_garbage_csv():
    csv_path = os.path.join(SAMPLE_DIR, "sample_garbage_records.csv")
    with open(csv_path, "rb") as f:
        file_bytes = f.read()

    res = client.post(
        "/api/upload/extract",
        files={"file": ("sample_garbage_records.csv", io.BytesIO(file_bytes), "text/csv")},
        data={
            "category": "garbage_records",
            "building": "Main Campus",
            "billing_period": "Week 41",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["records_count"] == 4
    temp_token = data["temp_token"]

    confirm_res = client.post(
        "/api/upload/confirm",
        json={
            "temp_token": temp_token,
            "category": "garbage_records",
            "building": "Main Campus",
            "billing_period": "Week 41",
        },
    )
    assert confirm_res.status_code == 201

    # Check that garbage bins now include BIN-007
    bins_res = client.get("/api/garbage")
    assert bins_res.status_code == 200
    codes = [b["bin_code"] for b in bins_res.json()]
    assert "BIN-007" in codes


def test_extract_and_confirm_maintenance_csv():
    csv_path = os.path.join(SAMPLE_DIR, "sample_maintenance_report.csv")
    with open(csv_path, "rb") as f:
        file_bytes = f.read()

    res = client.post(
        "/api/upload/extract",
        files={"file": ("sample_maintenance_report.csv", io.BytesIO(file_bytes), "text/csv")},
        data={
            "category": "maintenance_report",
            "building": "Main Campus",
            "billing_period": "October 2026",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["records_count"] == 3
    temp_token = data["temp_token"]

    confirm_res = client.post(
        "/api/upload/confirm",
        json={
            "temp_token": temp_token,
            "category": "maintenance_report",
            "building": "Main Campus",
            "billing_period": "October 2026",
        },
    )
    assert confirm_res.status_code == 201


def test_electricity_analytics():
    res = client.get("/api/analytics/electricity")
    assert res.status_code == 200
    data = res.json()
    assert data["resource"] == "Electricity"
    assert "historical_periods" in data
    assert len(data["historical_periods"]) >= 3
    assert "prediction" in data
    # Test linear regression model was trained
    pred = data["prediction"]
    assert pred["has_model"] is True
    assert pred["projected_next"] is not None
    assert pred["r_squared"] is not None


def test_water_analytics():
    res = client.get("/api/analytics/water")
    assert res.status_code == 200
    data = res.json()
    assert data["resource"] == "Water"
    assert "historical_periods" in data
    assert "prediction" in data


def test_documents_csv_export():
    res = client.get("/api/documents/export")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "Filename,Category,Building" in res.text


def test_delete_uploaded_document():
    # Fetch latest document
    list_res = client.get("/api/documents")
    docs = list_res.json()
    assert len(docs) > 0
    target_id = docs[0]["id"]

    del_res = client.delete(f"/api/documents/{target_id}")
    assert del_res.status_code == 200

    check_res = client.get(f"/api/documents/{target_id}")
    assert check_res.status_code == 404
