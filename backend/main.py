import os
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine, get_db
import models
import schemas
import services


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    Base.metadata.create_all(bind=engine)
    # Seed initial demo data safely if empty
    db = SessionLocal()
    try:
        services.seed_database_if_empty(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="AAVARAN API",
    description="Campus Resource Awareness & Defective Device Monitoring Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Support custom CORS origins for same-Wi-Fi multi-device access
extra_origins = os.getenv("CORS_ORIGINS", "")
if extra_origins:
    allowed_origins.extend([origin.strip() for origin in extra_origins.split(",") if origin.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ==========================================
# 1. Health Endpoint
# ==========================================
@app.get("/api/health", response_model=schemas.HealthResponse, tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    try:
        # Check database connectivity
        db.execute(models.WaterReading.__table__.select().limit(1))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return schemas.HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        database=db_status,
        version="1.0.0",
        message="AAVARAN API is running smoothly.",
    )


# ==========================================
# 2. Overview Dashboard Endpoint
# ==========================================
@app.get("/api/overview", response_model=schemas.OverviewResponse, tags=["Overview"])
def get_overview(db: Session = Depends(get_db)):
    water_readings = db.query(models.WaterReading).all()
    electricity_readings = db.query(models.ElectricityReading).all()
    garbage_bins = db.query(models.GarbageBin).all()
    alerts = db.query(models.Alert).all()
    device_issues = db.query(models.DeviceIssue).all()

    # Calculate summaries
    total_water = sum(r.consumption for r in water_readings) if water_readings else 0.0
    total_electricity = sum(r.consumption for r in electricity_readings) if electricity_readings else 0.0
    avg_garbage = (sum(b.fill_level for b in garbage_bins) / len(garbage_bins)) if garbage_bins else 0.0

    # Determine overall resource statuses
    has_water_warning = any(r.is_anomaly for r in water_readings)
    has_elec_warning = any(r.is_anomaly for r in electricity_readings)
    has_garbage_warning = any(b.collection_recommended for b in garbage_bins)

    water_status = "Attention Required" if has_water_warning else "Normal"
    electricity_status = "Attention Required" if has_elec_warning else "Normal"
    garbage_status = "Collection Recommended" if has_garbage_warning else ("Moderate" if avg_garbage >= 60 else "Normal")

    active_alerts = [a for a in alerts if a.status == "Active"]
    high_priority_alerts = [a for a in active_alerts if a.severity == "High"]

    # Device summaries
    total_issues = len(device_issues)
    open_issues = sum(1 for d in device_issues if d.status == "Reported")
    in_progress = sum(1 for d in device_issues if d.status == "In Progress")
    resolved = sum(1 for d in device_issues if d.status == "Resolved")
    high_priority = sum(1 for d in device_issues if d.severity == "High" and d.status != "Resolved")

    device_summary = schemas.DeviceSummaryResponse(
        total_issues=total_issues,
        open_issues=open_issues,
        in_progress_issues=in_progress,
        resolved_issues=resolved,
        high_priority_issues=high_priority,
    )

    # Format recent readings
    recent_water = db.query(models.WaterReading).order_by(models.WaterReading.id.desc()).limit(6).all()
    recent_elec = db.query(models.ElectricityReading).order_by(models.ElectricityReading.id.desc()).limit(6).all()
    recent_devices = db.query(models.DeviceIssue).order_by(models.DeviceIssue.id.desc()).limit(5).all()

    # Check if data contains synthetic records
    any_synthetic = any(r.is_synthetic for r in water_readings) or any(d.is_synthetic for d in device_issues)

    return schemas.OverviewResponse(
        current_water_consumption=round(total_water, 1),
        water_unit="litres",
        water_status=water_status,
        current_electricity_consumption=round(total_electricity, 1),
        electricity_unit="kWh",
        electricity_status=electricity_status,
        average_garbage_fill_level=round(avg_garbage, 1),
        garbage_unit="%",
        garbage_status=garbage_status,
        total_active_alerts=len(active_alerts),
        high_priority_alerts_count=len(high_priority_alerts),
        total_open_device_issues=open_issues + in_progress,
        device_summary=device_summary,
        high_priority_alerts=high_priority_alerts,
        recent_water_readings=recent_water,
        recent_electricity_readings=recent_elec,
        recent_device_issues=recent_devices,
        is_synthetic_data=any_synthetic,
        data_source_notice="Initial campus telemetry readings and baseline seed records are synthetic simulations for demonstration. User-reported issues are stored live.",
    )


# ==========================================
# 3. Water Monitoring Endpoint
# ==========================================
@app.get("/api/water", response_model=List[schemas.WaterReadingResponse], tags=["Water"])
def get_water_readings(
    building: Optional[str] = Query(None, description="Filter by building"),
    db: Session = Depends(get_db),
):
    query = db.query(models.WaterReading)
    if building:
        query = query.filter(models.WaterReading.building.ilike(f"%{building}%"))
    return query.order_by(models.WaterReading.id.asc()).all()


# ==========================================
# 4. Electricity Monitoring Endpoint
# ==========================================
@app.get("/api/electricity", response_model=List[schemas.ElectricityReadingResponse], tags=["Electricity"])
def get_electricity_readings(
    building: Optional[str] = Query(None, description="Filter by building"),
    db: Session = Depends(get_db),
):
    query = db.query(models.ElectricityReading)
    if building:
        query = query.filter(models.ElectricityReading.building.ilike(f"%{building}%"))
    return query.order_by(models.ElectricityReading.id.asc()).all()


# ==========================================
# 5. Garbage Monitoring Endpoint
# ==========================================
@app.get("/api/garbage", response_model=List[schemas.GarbageBinResponse], tags=["Garbage"])
def get_garbage_bins(db: Session = Depends(get_db)):
    return db.query(models.GarbageBin).order_by(models.GarbageBin.fill_level.desc()).all()


# ==========================================
# 6. Alerts Endpoints
# ==========================================
@app.get("/api/alerts", response_model=List[schemas.AlertResponse], tags=["Alerts"])
def get_alerts(
    severity: Optional[str] = Query(None, pattern="^(Low|Medium|High)$"),
    resource_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None, pattern="^(Active|Resolved)$"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Alert)
    if severity:
        query = query.filter(models.Alert.severity == severity)
    if resource_type:
        query = query.filter(models.Alert.resource_type.ilike(f"%{resource_type}%"))
    if status:
        query = query.filter(models.Alert.status == status)
    return query.order_by(models.Alert.id.desc()).all()


@app.post("/api/alerts/{alert_id}/resolve", response_model=schemas.AlertResponse, tags=["Alerts"])
def resolve_alert_endpoint(
    alert_id: int,
    payload: Optional[schemas.AlertStatusUpdate] = None,
    db: Session = Depends(get_db),
):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID {alert_id} not found")
    notes = payload.notes if payload else None
    return services.resolve_alert(db, alert, notes=notes)


@app.post("/api/alerts/{alert_id}/reopen", response_model=schemas.AlertResponse, tags=["Alerts"])
def reopen_alert_endpoint(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID {alert_id} not found")
    return services.reopen_alert(db, alert)


# ==========================================
# 7. Device Issues Endpoints
# ==========================================
@app.get("/api/devices/issues", response_model=List[schemas.DeviceIssueResponse], tags=["Device Issues"])
def get_device_issues(
    status: Optional[str] = Query(None, pattern="^(Reported|In Progress|Resolved)$"),
    resource_type: Optional[str] = Query(None, pattern="^(Water|Electricity|Other)$"),
    severity: Optional[str] = Query(None, pattern="^(Low|Medium|High)$"),
    db: Session = Depends(get_db),
):
    query = db.query(models.DeviceIssue)
    if status:
        query = query.filter(models.DeviceIssue.status == status)
    if resource_type:
        query = query.filter(models.DeviceIssue.resource_type == resource_type)
    if severity:
        query = query.filter(models.DeviceIssue.severity == severity)
    return query.order_by(models.DeviceIssue.id.desc()).all()


@app.get("/api/devices/issues/{issue_id}", response_model=schemas.DeviceIssueResponse, tags=["Device Issues"])
def get_device_issue(issue_id: int, db: Session = Depends(get_db)):
    issue = db.query(models.DeviceIssue).filter(models.DeviceIssue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail=f"Device issue with ID {issue_id} not found")
    return issue


@app.post(
    "/api/devices/issues",
    response_model=schemas.DeviceIssueResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Device Issues"],
)
def create_device_issue_endpoint(payload: schemas.DeviceIssueCreate, db: Session = Depends(get_db)):
    return services.create_device_issue(db, payload)


@app.patch("/api/devices/issues/{issue_id}", response_model=schemas.DeviceIssueResponse, tags=["Device Issues"])
def update_device_issue_endpoint(
    issue_id: int,
    payload: schemas.DeviceIssueUpdate,
    db: Session = Depends(get_db),
):
    issue = db.query(models.DeviceIssue).filter(models.DeviceIssue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail=f"Device issue with ID {issue_id} not found")
    return services.update_device_issue(db, issue, payload)


@app.get("/api/devices/summary", response_model=schemas.DeviceSummaryResponse, tags=["Device Issues"])
def get_device_summary(db: Session = Depends(get_db)):
    issues = db.query(models.DeviceIssue).all()
    total = len(issues)
    open_count = sum(1 for i in issues if i.status == "Reported")
    in_progress = sum(1 for i in issues if i.status == "In Progress")
    resolved = sum(1 for i in issues if i.status == "Resolved")
    high_priority = sum(1 for i in issues if i.severity == "High" and i.status != "Resolved")

    return schemas.DeviceSummaryResponse(
        total_issues=total,
        open_issues=open_count,
        in_progress_issues=in_progress,
        resolved_issues=resolved,
        high_priority_issues=high_priority,
    )
