from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from models import WaterReading, ElectricityReading, GarbageBin, DeviceIssue, Alert
from schemas import DeviceIssueCreate, DeviceIssueUpdate
import json

def get_current_iso_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def evaluate_garbage_status(fill_level: float) -> tuple[str, bool]:
    """
    Transparent threshold logic:
    - Below 60%: Normal
    - 60% to below 85%: Attention
    - 85% to 100%: Collection Recommended
    """
    clamped = max(0.0, min(100.0, fill_level))
    if clamped >= 85.0:
        return "Collection Recommended", True
    elif clamped >= 60.0:
        return "Attention", False
    else:
        return "Normal", False


def evaluate_water_status(consumption: float, threshold: float = 1200.0) -> tuple[str, bool]:
    """
    Explainable threshold check for water consumption.
    Cautious wording: Unusual usage detected — inspection recommended.
    """
    if consumption > threshold:
        return "Unusual Usage Warning - inspection recommended", True
    elif consumption > (threshold * 0.85):
        return "Elevated", False
    return "Normal", False


def evaluate_electricity_status(consumption: float, threshold: float = 180.0) -> tuple[str, bool]:
    """
    Explainable threshold check for electricity consumption.
    Cautious wording: Unusual usage detected — usage review recommended.
    """
    if consumption > threshold:
        return "Unusual Usage Warning - usage review recommended", True
    elif consumption > (threshold * 0.85):
        return "Elevated", False
    return "Normal", False


def seed_database_if_empty(db: Session):
    """
    Safely seed initial synthetic demo data if database is empty.
    Avoids duplicate demo records on restarts.
    """
    existing_count = db.query(WaterReading).count()
    if existing_count > 0:
        return  # Already seeded or contains user records

    now_iso = get_current_iso_timestamp()

    # 1. Seed Water Readings
    water_samples = [
        {"building": "Science Complex", "location": "Basement Hydrant & Main Riser", "consumption": 1420.0, "notes": "High flow rate observed during off-peak hours.", "threshold": 1200.0},
        {"building": "Engineering Block A", "location": "Main Supply Cistern", "consumption": 980.0, "notes": "Typical daytime consumption.", "threshold": 1200.0},
        {"building": "Student Hostel 2", "location": "Overhead Tank Meter", "consumption": 1150.0, "notes": "Morning peak shower usage.", "threshold": 1200.0},
        {"building": "Central Dining Hall", "location": "Kitchen Utility Connection", "consumption": 890.0, "notes": "Lunch preparation hours.", "threshold": 1200.0},
        {"building": "Library Building", "location": "Restroom Feeder Pipe", "consumption": 340.0, "notes": "Normal quiet hours baseline.", "threshold": 1200.0},
        {"building": "Sports Complex", "location": "Shower Facility Supply", "consumption": 620.0, "notes": "Afternoon training session.", "threshold": 1200.0},
    ]

    for item in water_samples:
        st, is_anom = evaluate_water_status(item["consumption"], item["threshold"])
        db.add(WaterReading(
            building=item["building"],
            location=item["location"],
            timestamp=now_iso,
            consumption=item["consumption"],
            unit="litres",
            status=st,
            threshold=item["threshold"],
            is_anomaly=is_anom,
            notes=item["notes"],
            is_synthetic=True
        ))

    # 2. Seed Electricity Readings
    elec_samples = [
        {"building": "Science Complex", "location": "Auditorium HVAC Panel", "consumption": 215.0, "notes": "AC chillers running outside scheduled class hours.", "threshold": 180.0},
        {"building": "Computer Center", "location": "Server Room Main Feed", "consumption": 165.0, "notes": "High computational cluster load.", "threshold": 180.0},
        {"building": "Engineering Block B", "location": "Robotics Lab Substation", "consumption": 142.0, "notes": "Daytime equipment load.", "threshold": 180.0},
        {"building": "Library Building", "location": "Reading Hall Lighting & Power", "consumption": 95.0, "notes": "Standard LED lighting and laptop charging.", "threshold": 180.0},
        {"building": "Administration Block", "location": "Executive Offices & Central AC", "consumption": 110.0, "notes": "Regular administrative working hours.", "threshold": 180.0},
        {"building": "Sports Arena", "location": "Indoor Stadium Floodlights", "consumption": 75.0, "notes": "Dimmable LED systems active.", "threshold": 180.0},
    ]

    for item in elec_samples:
        st, is_anom = evaluate_electricity_status(item["consumption"], item["threshold"])
        db.add(ElectricityReading(
            building=item["building"],
            location=item["location"],
            timestamp=now_iso,
            consumption=item["consumption"],
            unit="kWh",
            status=st,
            threshold=item["threshold"],
            is_anomaly=is_anom,
            notes=item["notes"],
            is_synthetic=True
        ))

    # 3. Seed Garbage Bins
    bin_samples = [
        {"bin_code": "BIN-001", "building": "Food Court", "location": "Central Dining Plaza North", "fill_level": 92.0},
        {"bin_code": "BIN-002", "building": "Library", "location": "Main Entrance Lobby", "fill_level": 45.0},
        {"bin_code": "BIN-003", "building": "Engineering Block A", "location": "Student Common Area", "fill_level": 78.0},
        {"bin_code": "BIN-004", "building": "Sports Arena", "location": "Grandstand East Concourse", "fill_level": 88.0},
        {"bin_code": "BIN-005", "building": "Science Quad", "location": "Courtyard Walkway", "fill_level": 35.0},
        {"bin_code": "BIN-006", "building": "Student Hostel 1", "location": "Hostel Quad Recycle Depot", "fill_level": 64.0},
    ]

    for item in bin_samples:
        st, coll_rec = evaluate_garbage_status(item["fill_level"])
        db.add(GarbageBin(
            bin_code=item["bin_code"],
            building=item["building"],
            location=item["location"],
            fill_level=item["fill_level"],
            last_updated=now_iso,
            status=st,
            collection_recommended=coll_rec,
            is_synthetic=True
        ))

    db.commit()

    # 4. Seed Initial Device Issues
    device_issues_seed = [
        {
            "device_name": "Main Cafeteria Dishwashing Tap",
            "device_type": "Tap",
            "resource_type": "Water",
            "building": "Central Dining Hall",
            "location": "Kitchen Area Prep Sink 2",
            "description": "Continuous dripping tap with degraded washer, creating steady stream overnight.",
            "severity": "High",
            "estimated_waste": 65.0,
            "waste_unit": "litres/day",
            "reporter_name": "Sunita Rao (Dining Supervisor)",
            "status": "Reported",
            "repair_notes": None,
            "is_synthetic": True,
        },
        {
            "device_name": "Hostel Block 3 Ground Floor Flush",
            "device_type": "Flush System",
            "resource_type": "Water",
            "building": "Student Hostel 3",
            "location": "Ground Floor Restroom Cubicle 2",
            "description": "Dual-flush valve does not seal properly, causing continuous silent water cistern overflow.",
            "severity": "Medium",
            "estimated_waste": 110.0,
            "waste_unit": "litres/day",
            "reporter_name": "Arjun Kumar (Hostel Warden)",
            "status": "In Progress",
            "repair_notes": "Plumbing contractor inspected on 2026-10-11. Replacement silicone seal ordered.",
            "is_synthetic": True,
        },
        {
            "device_name": "Campus Walkway Pathway Floodlights",
            "device_type": "Lighting Bank",
            "resource_type": "Electricity",
            "building": "Campus Quadrangle",
            "location": "East Walkway Exterior",
            "description": "Timer relay switch malfunction causing 8 exterior pathway floodlights to remain energized during daylight hours.",
            "severity": "Medium",
            "estimated_waste": 19.5,
            "waste_unit": "kWh/day",
            "reporter_name": "Vikas Patil (Campus Security)",
            "status": "Reported",
            "repair_notes": None,
            "is_synthetic": True,
        },
        {
            "device_name": "Engineering Block B Staircase Fixture",
            "device_type": "Light Fixture",
            "resource_type": "Electricity",
            "building": "Engineering Block B",
            "location": "North Stairwell Level 2",
            "description": "Defective magnetic ballast causing excessive heat and persistent buzzing.",
            "severity": "Low",
            "estimated_waste": 3.2,
            "waste_unit": "kWh/day",
            "reporter_name": "Priya Sharma (Student Council)",
            "status": "Resolved",
            "repair_notes": "Replaced with integrated 18W LED fixture on 2026-10-10.",
            "resolved_at": now_iso,
            "is_synthetic": True,
        },
    ]

    created_issues: List[DeviceIssue] = []
    for d in device_issues_seed:
        issue = DeviceIssue(
            device_name=d["device_name"],
            device_type=d["device_type"],
            resource_type=d["resource_type"],
            building=d["building"],
            location=d["location"],
            description=d["description"],
            severity=d["severity"],
            estimated_waste=d["estimated_waste"],
            waste_unit=d["waste_unit"],
            reporter_name=d["reporter_name"],
            status=d["status"],
            reported_at=now_iso,
            updated_at=now_iso,
            resolved_at=d.get("resolved_at"),
            repair_notes=d["repair_notes"],
            is_synthetic=True,
        )
        db.add(issue)
        created_issues.append(issue)

    db.commit()
    for ci in created_issues:
        db.refresh(ci)

    # 5. Seed Alerts (Linked device alerts + Resource threshold alerts)
    # Linked alert for cafeteria tap (High severity)
    cafeteria_issue = created_issues[0]
    db.add(Alert(
        title=f"Device Waste Report: {cafeteria_issue.device_name}",
        resource_type="Water",
        building=cafeteria_issue.building,
        location=cafeteria_issue.location,
        description=f"Reported defective device: {cafeteria_issue.description}",
        severity=cafeteria_issue.severity,
        created_at=now_iso,
        recommended_action="Dispatch maintenance technician to inspect tap and replace degraded washer gasket.",
        status="Active",
        linked_device_issue_id=cafeteria_issue.id,
        is_synthetic=True
    ))

    # Linked alert for walkway lights (Medium severity)
    lights_issue = created_issues[2]
    db.add(Alert(
        title=f"Device Waste Report: {lights_issue.device_name}",
        resource_type="Electricity",
        building=lights_issue.building,
        location=lights_issue.location,
        description=f"Reported defective lighting timer: {lights_issue.description}",
        severity=lights_issue.severity,
        created_at=now_iso,
        recommended_action="Electrician inspection recommended to reset or replace photocell / timer relay.",
        status="Active",
        linked_device_issue_id=lights_issue.id,
        is_synthetic=True
    ))

    # Threshold alerts for anomalous readings
    db.add(Alert(
        title="Unusual Water Usage Detected — Science Complex",
        resource_type="Water",
        building="Science Complex",
        location="Basement Hydrant & Main Riser",
        description="Reading of 1420 litres exceeded threshold (1200 litres). Inspection recommended.",
        severity="High",
        created_at=now_iso,
        recommended_action="Conduct physical inspection of basement distribution lines and restrooms.",
        status="Active",
        linked_device_issue_id=None,
        is_synthetic=True
    ))

    db.add(Alert(
        title="Unusual Electricity Consumption — Science Complex HVAC",
        resource_type="Electricity",
        building="Science Complex",
        location="Auditorium HVAC Panel",
        description="Reading of 215 kWh exceeded baseline threshold (180 kWh). Usage review recommended.",
        severity="Medium",
        created_at=now_iso,
        recommended_action="Verify building automation schedule and check whether chiller setpoint was overridden.",
        status="Active",
        linked_device_issue_id=None,
        is_synthetic=True
    ))

    db.add(Alert(
        title="Garbage Bin Near Capacity — Food Court Plaza",
        resource_type="Garbage",
        building="Food Court",
        location="Central Dining Plaza North (BIN-001)",
        description="Fill level reached 92% (threshold: 85%). Collection recommended.",
        severity="High",
        created_at=now_iso,
        recommended_action="Dispatch campus sanitation team for immediate waste collection.",
        status="Active",
        linked_device_issue_id=None,
        is_synthetic=True
    ))

    db.commit()


def create_device_issue(db: Session, payload: DeviceIssueCreate) -> DeviceIssue:
    now_iso = get_current_iso_timestamp()

    issue = DeviceIssue(
        device_name=payload.device_name.strip(),
        device_type=payload.device_type.strip(),
        resource_type=payload.resource_type,
        building=payload.building.strip(),
        location=payload.location.strip(),
        description=payload.description.strip(),
        severity=payload.severity,
        estimated_waste=payload.estimated_waste,
        waste_unit=payload.waste_unit.strip() if payload.waste_unit else None,
        reporter_name=payload.reporter_name.strip() if payload.reporter_name else None,
        status="Reported",
        reported_at=now_iso,
        updated_at=now_iso,
        resolved_at=None,
        repair_notes=None,
        is_synthetic=False,  # Live user-created issue
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)

    # Automatically generate a linked alert for Medium and High severity issues
    if issue.severity in ("Medium", "High"):
        alert_title = f"Reported Defect: {issue.device_name} ({issue.resource_type})"
        recommended_action = (
            f"Inspect {issue.device_type} at {issue.building} ({issue.location}). "
            f"Coordinate maintenance to mitigate potential {issue.resource_type.lower()} waste."
        )
        alert = Alert(
            title=alert_title,
            resource_type=issue.resource_type if issue.resource_type in ["Water", "Electricity"] else "Device",
            building=issue.building,
            location=issue.location,
            description=f"Device issue logged: {issue.description}",
            severity=issue.severity,
            created_at=now_iso,
            recommended_action=recommended_action,
            status="Active",
            linked_device_issue_id=issue.id,
            is_synthetic=False,
        )
        db.add(alert)
        db.commit()

    return issue


def update_device_issue(db: Session, issue: DeviceIssue, payload: DeviceIssueUpdate) -> DeviceIssue:
    now_iso = get_current_iso_timestamp()
    changed = False

    if payload.severity is not None and payload.severity != issue.severity:
        issue.severity = payload.severity
        changed = True

    if payload.repair_notes is not None:
        issue.repair_notes = payload.repair_notes
        changed = True

    if payload.status is not None and payload.status != issue.status:
        old_status = issue.status
        issue.status = payload.status
        changed = True

        if payload.status == "Resolved":
            issue.resolved_at = now_iso
            # Synchronize linked alerts to Resolved
            linked_alerts = db.query(Alert).filter(Alert.linked_device_issue_id == issue.id).all()
            for alert in linked_alerts:
                alert.status = "Resolved"
                alert.resolved_at = now_iso
        elif old_status == "Resolved" and payload.status in ("Reported", "In Progress"):
            # Reopening the issue
            issue.resolved_at = None
            linked_alerts = db.query(Alert).filter(Alert.linked_device_issue_id == issue.id).all()
            for alert in linked_alerts:
                alert.status = "Active"
                alert.resolved_at = None

    if changed:
        issue.updated_at = now_iso
        db.commit()
        db.refresh(issue)

    return issue


def resolve_alert(db: Session, alert: Alert, notes: Optional[str] = None) -> Alert:
    now_iso = get_current_iso_timestamp()
    alert.status = "Resolved"
    alert.resolved_at = now_iso

    # If linked to a device issue, mark the device issue as Resolved if it wasn't already
    if alert.linked_device_issue_id:
        issue = db.query(DeviceIssue).filter(DeviceIssue.id == alert.linked_device_issue_id).first()
        if issue and issue.status != "Resolved":
            issue.status = "Resolved"
            issue.resolved_at = now_iso
            issue.updated_at = now_iso
            if notes:
                existing_notes = issue.repair_notes or ""
                issue.repair_notes = f"{existing_notes} [Resolved via Alert: {notes}]".strip()

    db.commit()
    db.refresh(alert)
    return alert


def reopen_alert(db: Session, alert: Alert) -> Alert:
    now_iso = get_current_iso_timestamp()
    alert.status = "Active"
    alert.resolved_at = None

    # If linked to a device issue, mark the device issue as In Progress
    if alert.linked_device_issue_id:
        issue = db.query(DeviceIssue).filter(DeviceIssue.id == alert.linked_device_issue_id).first()
        if issue and issue.status == "Resolved":
            issue.status = "In Progress"
            issue.resolved_at = None
            issue.updated_at = now_iso

    db.commit()
    db.refresh(alert)
    return alert


def seed_documents_if_empty(db: Session):
    """
    Seed initial historical uploaded bills if uploaded_documents table is empty.
    Provides baseline historical data for regression analysis and percentage comparisons.
    """
    from models import UploadedDocument
    if db.query(UploadedDocument).count() > 0:
        return

    now_iso = get_current_iso_timestamp()
    sample_docs = [
        {
            "filename": "Science_Complex_Elec_Bill_June2026.pdf",
            "saved_filename": "sample_elec_june2026.pdf",
            "file_type": "application/pdf",
            "category": "electricity_bill",
            "building": "Science Complex",
            "billing_period": "June 2026",
            "upload_date": "2026-07-02T10:00:00Z",
            "status": "Confirmed",
            "consumption": 162.0,
            "consumption_unit": "kWh",
            "bill_amount": 1458.0,
            "consumer_number": "CAMPUS-EL-78901",
            "meter_number": "MTR-SC-101",
            "previous_reading": 12450.0,
            "current_reading": 12612.0,
            "notes": "Archived digital billing record.",
            "is_synthetic": True,
        },
        {
            "filename": "Science_Complex_Elec_Bill_July2026.pdf",
            "saved_filename": "sample_elec_july2026.pdf",
            "file_type": "application/pdf",
            "category": "electricity_bill",
            "building": "Science Complex",
            "billing_period": "July 2026",
            "upload_date": "2026-08-02T11:15:00Z",
            "status": "Confirmed",
            "consumption": 178.0,
            "consumption_unit": "kWh",
            "bill_amount": 1602.0,
            "consumer_number": "CAMPUS-EL-78901",
            "meter_number": "MTR-SC-101",
            "previous_reading": 12612.0,
            "current_reading": 12790.0,
            "notes": "Archived digital billing record.",
            "is_synthetic": True,
        },
        {
            "filename": "Science_Complex_Elec_Bill_August2026.pdf",
            "saved_filename": "sample_elec_aug2026.pdf",
            "file_type": "application/pdf",
            "category": "electricity_bill",
            "building": "Science Complex",
            "billing_period": "August 2026",
            "upload_date": "2026-09-03T09:30:00Z",
            "status": "Confirmed",
            "consumption": 195.0,
            "consumption_unit": "kWh",
            "bill_amount": 1755.0,
            "consumer_number": "CAMPUS-EL-78901",
            "meter_number": "MTR-SC-101",
            "previous_reading": 12790.0,
            "current_reading": 12985.0,
            "notes": "Summer research labs elevated AC consumption.",
            "is_synthetic": True,
        },
        {
            "filename": "Engineering_Water_Bill_June2026.pdf",
            "saved_filename": "sample_water_june2026.pdf",
            "file_type": "application/pdf",
            "category": "water_bill",
            "building": "Engineering Block A",
            "billing_period": "June 2026",
            "upload_date": "2026-07-03T14:20:00Z",
            "status": "Confirmed",
            "consumption": 920.0,
            "consumption_unit": "litres",
            "bill_amount": 736.0,
            "consumer_number": "CAMPUS-WT-44120",
            "meter_number": "WTR-ENG-02",
            "previous_reading": 84200.0,
            "current_reading": 85120.0,
            "notes": "Baseline municipal water utility statement.",
            "is_synthetic": True,
        },
        {
            "filename": "Engineering_Water_Bill_July2026.pdf",
            "saved_filename": "sample_water_july2026.pdf",
            "file_type": "application/pdf",
            "category": "water_bill",
            "building": "Engineering Block A",
            "billing_period": "July 2026",
            "upload_date": "2026-08-04T12:00:00Z",
            "status": "Confirmed",
            "consumption": 990.0,
            "consumption_unit": "litres",
            "bill_amount": 792.0,
            "consumer_number": "CAMPUS-WT-44120",
            "meter_number": "WTR-ENG-02",
            "previous_reading": 85120.0,
            "current_reading": 86110.0,
            "notes": "Standard campus consumption.",
            "is_synthetic": True,
        },
        {
            "filename": "Engineering_Water_Bill_August2026.pdf",
            "saved_filename": "sample_water_aug2026.pdf",
            "file_type": "application/pdf",
            "category": "water_bill",
            "building": "Engineering Block A",
            "billing_period": "August 2026",
            "upload_date": "2026-09-04T16:45:00Z",
            "status": "Confirmed",
            "consumption": 1080.0,
            "consumption_unit": "litres",
            "bill_amount": 864.0,
            "consumer_number": "CAMPUS-WT-44120",
            "meter_number": "WTR-ENG-02",
            "previous_reading": 86110.0,
            "current_reading": 87190.0,
            "notes": "Moderate increase; verified within standard operating margins.",
            "is_synthetic": True,
        },
    ]

    for item in sample_docs:
        doc = UploadedDocument(
            filename=item["filename"],
            saved_filename=item["saved_filename"],
            file_type=item["file_type"],
            category=item["category"],
            building=item["building"],
            billing_period=item["billing_period"],
            upload_date=item["upload_date"],
            status=item["status"],
            consumption=item["consumption"],
            consumption_unit=item["consumption_unit"],
            bill_amount=item["bill_amount"],
            consumer_number=item["consumer_number"],
            meter_number=item["meter_number"],
            previous_reading=item["previous_reading"],
            current_reading=item["current_reading"],
            records_count=1,
            notes=item["notes"],
            is_synthetic=item["is_synthetic"],
        )
        db.add(doc)
    db.commit()


def confirm_uploaded_document(
    db: Session,
    payload_dict: dict,
    saved_filename: str,
    original_filename: str,
    file_type: str,
    raw_extracted_data: Optional[dict] = None,
):
    """
    Persists confirmed document record, updates corresponding dashboards,
    and runs anomaly checks to generate alerts if threshold is exceeded.
    """
    from models import UploadedDocument
    now_iso = get_current_iso_timestamp()

    category = payload_dict.get("category", "electricity_bill")
    building = payload_dict.get("building", "Main Campus")
    billing_period = payload_dict.get("billing_period", "Current")
    consumption = payload_dict.get("consumption")
    consumption_unit = payload_dict.get("consumption_unit", "kWh")
    bill_amount = payload_dict.get("bill_amount")

    doc = UploadedDocument(
        filename=original_filename,
        saved_filename=saved_filename,
        file_type=file_type,
        category=category,
        building=building,
        billing_period=billing_period,
        upload_date=now_iso,
        status="Confirmed",
        extracted_data=json.dumps(raw_extracted_data or {}),
        consumption=consumption,
        consumption_unit=consumption_unit,
        bill_amount=bill_amount,
        consumer_number=payload_dict.get("consumer_number"),
        meter_number=payload_dict.get("meter_number"),
        previous_reading=payload_dict.get("previous_reading"),
        current_reading=payload_dict.get("current_reading"),
        records_count=raw_extracted_data.get("records_count", 1) if raw_extracted_data else 1,
        notes=payload_dict.get("notes"),
        is_synthetic=False,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Automatically update corresponding dashboards & trigger explainable alerts
    if category in ["electricity_bill", "electricity_report"] and consumption is not None:
        status_text, is_anom = evaluate_electricity_status(consumption)
        db.add(
            ElectricityReading(
                building=building,
                location=f"Bill Import - {billing_period}",
                timestamp=now_iso,
                consumption=consumption,
                unit="kWh",
                status=status_text,
                threshold=180.0,
                is_anomaly=is_anom,
                notes=f"Uploaded and confirmed via bill '{original_filename}'. {payload_dict.get('notes') or ''}".strip(),
                is_synthetic=False,
            )
        )
        if is_anom:
            db.add(
                Alert(
                    title=f"Unusual Electricity Bill Consumption: {building}",
                    resource_type="Electricity",
                    building=building,
                    location=f"Billing Period: {billing_period}",
                    description=f"Confirmed billing consumption of {consumption} kWh exceeded baseline threshold (180 kWh).",
                    severity="High" if consumption > 220 else "Medium",
                    created_at=now_iso,
                    recommended_action="Energy audit recommended. Inspect off-hours equipment, chillers, and HVAC schedules.",
                    status="Active",
                    is_synthetic=False,
                )
            )

    elif category in ["water_bill", "water_report"] and consumption is not None:
        status_text, is_anom = evaluate_water_status(consumption)
        db.add(
            WaterReading(
                building=building,
                location=f"Bill Import - {billing_period}",
                timestamp=now_iso,
                consumption=consumption,
                unit="litres",
                status=status_text,
                threshold=1200.0,
                is_anomaly=is_anom,
                notes=f"Uploaded and confirmed via bill '{original_filename}'. {payload_dict.get('notes') or ''}".strip(),
                is_synthetic=False,
            )
        )
        if is_anom:
            db.add(
                Alert(
                    title=f"Unusual Water Bill Volume: {building}",
                    resource_type="Water",
                    building=building,
                    location=f"Billing Period: {billing_period}",
                    description=f"Confirmed billing consumption of {consumption} litres exceeded baseline threshold (1200 litres).",
                    severity="High" if consumption > 1400 else "Medium",
                    created_at=now_iso,
                    recommended_action="Physical inspection recommended to verify fixtures, float valves, and check for potential line leakage.",
                    status="Active",
                    is_synthetic=False,
                )
            )

    elif category == "garbage_records" and raw_extracted_data:
        parsed_bins = raw_extracted_data.get("parsed_bins", [])
        for b in parsed_bins:
            fill = b.get("fill_level", 50.0)
            st_text, coll_rec = evaluate_garbage_status(fill)
            # Check if bin code already exists; update or insert
            existing_bin = db.query(GarbageBin).filter(GarbageBin.bin_code == b.get("bin_code")).first()
            if existing_bin:
                existing_bin.fill_level = fill
                existing_bin.status = st_text
                existing_bin.collection_recommended = coll_rec
                existing_bin.last_updated = now_iso
            else:
                db.add(
                    GarbageBin(
                        bin_code=b.get("bin_code", f"BIN-{now_iso[:10]}"),
                        building=b.get("building", building),
                        location=b.get("location", "Campus Plaza"),
                        fill_level=fill,
                        last_updated=now_iso,
                        status=st_text,
                        collection_recommended=coll_rec,
                        is_synthetic=False,
                    )
                )

    elif category == "maintenance_report" and raw_extracted_data:
        parsed_issues = raw_extracted_data.get("parsed_issues", [])
        for issue_item in parsed_issues:
            issue_rec = DeviceIssue(
                device_name=issue_item.get("device_name", "Equipment"),
                device_type=issue_item.get("device_type", "Fixture"),
                resource_type=issue_item.get("resource_type", "Water"),
                building=issue_item.get("building", building),
                location=issue_item.get("location", "General Area"),
                description=issue_item.get("description", "Imported maintenance record."),
                severity=issue_item.get("severity", "Medium"),
                status=issue_item.get("status", "Reported"),
                estimated_waste=issue_item.get("estimated_waste"),
                reported_at=now_iso,
                updated_at=now_iso,
                is_synthetic=False,
            )
            db.add(issue_rec)
            db.commit()
            db.refresh(issue_rec)
            if issue_rec.severity in ["High", "Medium"] and issue_rec.status != "Resolved":
                db.add(
                    Alert(
                        title=f"Maintenance Report: {issue_rec.device_name}",
                        resource_type=issue_rec.resource_type if issue_rec.resource_type in ["Water", "Electricity"] else "Device",
                        building=issue_rec.building,
                        location=issue_rec.location,
                        description=issue_rec.description,
                        severity=issue_rec.severity,
                        created_at=now_iso,
                        recommended_action="Dispatch maintenance technician to inspect and repair fixture.",
                        status="Active",
                        linked_device_issue_id=issue_rec.id,
                        is_synthetic=False,
                    )
                )

    db.commit()
    db.refresh(doc)
    return doc


def delete_uploaded_document(db: Session, doc_id: int) -> bool:
    """Safely deletes document record and removes physical file from disk."""
    import os
    from models import UploadedDocument
    from extractor import UPLOAD_DIR

    doc = db.query(UploadedDocument).filter(UploadedDocument.id == doc_id).first()
    if not doc:
        return False

    # Remove file on disk if it exists
    if doc.saved_filename:
        file_path = os.path.join(UPLOAD_DIR, doc.saved_filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

    db.delete(doc)
    db.commit()
    return True

