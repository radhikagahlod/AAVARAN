from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from models import WaterReading, ElectricityReading, GarbageBin, DeviceIssue, Alert
from schemas import DeviceIssueCreate, DeviceIssueUpdate


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
