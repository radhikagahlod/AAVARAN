import io
import os
import uuid
import csv
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine, get_db
import models
import schemas
import services
import extractor
import analytics

# In-memory dictionary storing pending extraction data for preview & confirmation
TEMP_EXTRACTS: Dict[str, Dict[str, Any]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    Base.metadata.create_all(bind=engine)
    # Seed initial demo data safely if empty
    db = SessionLocal()
    try:
        services.seed_database_if_empty(db)
        services.seed_documents_if_empty(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="AAVARAN API",
    description="Campus Resource Awareness & Defective Device Monitoring Platform",
    version="1.1.0",
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
        db.execute(models.WaterReading.__table__.select().limit(1))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return schemas.HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        database=db_status,
        version="1.1.0",
        message="AAVARAN API is running smoothly with upload & analytics engine active.",
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

    total_water = sum(r.consumption for r in water_readings) if water_readings else 0.0
    total_electricity = sum(r.consumption for r in electricity_readings) if electricity_readings else 0.0
    avg_garbage = (sum(b.fill_level for b in garbage_bins) / len(garbage_bins)) if garbage_bins else 0.0

    has_water_warning = any(r.is_anomaly for r in water_readings)
    has_elec_warning = any(r.is_anomaly for r in electricity_readings)
    has_garbage_warning = any(b.collection_recommended for b in garbage_bins)

    water_status = "Attention Required" if has_water_warning else "Normal"
    electricity_status = "Attention Required" if has_elec_warning else "Normal"
    garbage_status = "Collection Recommended" if has_garbage_warning else ("Moderate" if avg_garbage >= 60 else "Normal")

    active_alerts = [a for a in alerts if a.status == "Active"]
    high_priority_alerts = [a for a in active_alerts if a.severity == "High"]

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

    recent_water = db.query(models.WaterReading).order_by(models.WaterReading.id.desc()).limit(6).all()
    recent_elec = db.query(models.ElectricityReading).order_by(models.ElectricityReading.id.desc()).limit(6).all()
    recent_devices = db.query(models.DeviceIssue).order_by(models.DeviceIssue.id.desc()).limit(5).all()

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
        data_source_notice="Initial campus telemetry readings and baseline seed records are synthetic simulations for demonstration. User-reported issues and uploaded bills are stored live.",
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


# ==========================================
# 8. Document Upload & Extraction Endpoints
# ==========================================
@app.post(
    "/api/upload/extract",
    response_model=schemas.DocumentExtractResponse,
    tags=["Upload & Analyze"],
)
async def extract_document_endpoint(
    file: UploadFile = File(...),
    category: str = Form(...),
    building: str = Form("Main Campus"),
    billing_period: str = Form("Current Period"),
):
    """
    Step 1 of Upload Workflow:
    Upload document, validate type/size, extract fields without committing to DB yet.
    Returns preview of extracted fields and a temporary token for user review.
    """
    filename = file.filename or "uploaded_file"
    content = await file.read()

    # Validate file format and size
    is_valid, err_msg = extractor.validate_file(filename, content)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    # Save safely with UUID prefix in uploads directory
    saved_filename = extractor.save_uploaded_file(filename, content, prefix="temp_")

    try:
        extracted = extractor.extract_document_data(filename, content, category)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to extract document data: {str(e)}"
        )

    temp_token = uuid.uuid4().hex
    TEMP_EXTRACTS[temp_token] = {
        "saved_filename": saved_filename,
        "original_filename": filename,
        "file_type": file.content_type or os.path.splitext(filename)[1],
        "category": category,
        "building": building,
        "billing_period": billing_period,
        "raw_extracted": extracted,
    }

    # Determine default unit based on category
    default_unit = "litres" if "water" in category else "kWh"

    return schemas.DocumentExtractResponse(
        temp_token=temp_token,
        filename=filename,
        category=category,
        building=building,
        billing_period=extracted.get("billing_period") or billing_period,
        consumption=extracted.get("consumption"),
        consumption_unit=extracted.get("consumption_unit", default_unit),
        bill_amount=extracted.get("bill_amount"),
        consumer_number=extracted.get("consumer_number"),
        meter_number=extracted.get("meter_number"),
        previous_reading=extracted.get("previous_reading"),
        current_reading=extracted.get("current_reading"),
        records_count=extracted.get("records_count", 1),
        extraction_confidence=extracted.get("extraction_confidence", "medium"),
        notes=extracted.get("notes"),
        parsed_items=extracted.get("parsed_readings") or extracted.get("parsed_bins") or extracted.get("parsed_issues"),
    )


@app.post(
    "/api/upload/confirm",
    response_model=schemas.DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Upload & Analyze"],
)
def confirm_document_endpoint(
    payload: schemas.DocumentConfirmRequest, db: Session = Depends(get_db)
):
    """
    Step 2 of Upload Workflow:
    User reviews and confirms (or manually edits) the extracted fields.
    Persists document metadata, updates telemetry readings, and runs threshold checks.
    """
    temp_info = TEMP_EXTRACTS.pop(payload.temp_token, None)

    saved_filename = temp_info["saved_filename"] if temp_info else f"doc_{payload.temp_token[:8]}"
    original_filename = temp_info["original_filename"] if temp_info else "manual_entry_bill"
    file_type = temp_info["file_type"] if temp_info else "application/pdf"
    raw_extracted = temp_info["raw_extracted"] if temp_info else {}

    doc = services.confirm_uploaded_document(
        db=db,
        payload_dict=payload.model_dump(),
        saved_filename=saved_filename,
        original_filename=original_filename,
        file_type=file_type,
        raw_extracted_data=raw_extracted,
    )

    return doc


@app.get(
    "/api/documents",
    response_model=List[schemas.DocumentResponse],
    tags=["Upload & Analyze"],
)
def get_documents(
    category: Optional[str] = Query(None),
    building: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List uploaded documents with search and filtering."""
    query = db.query(models.UploadedDocument)
    if category:
        query = query.filter(models.UploadedDocument.category == category)
    if building:
        query = query.filter(models.UploadedDocument.building.ilike(f"%{building}%"))
    if status:
        query = query.filter(models.UploadedDocument.status == status)
    if search:
        query = query.filter(
            (models.UploadedDocument.filename.ilike(f"%{search}%"))
            | (models.UploadedDocument.building.ilike(f"%{search}%"))
            | (models.UploadedDocument.billing_period.ilike(f"%{search}%"))
        )

    return query.order_by(models.UploadedDocument.id.desc()).all()


@app.get("/api/documents/export", tags=["Upload & Analyze"])
def export_documents_csv(db: Session = Depends(get_db)):
    """Export all uploaded documents and extracted measurements as a downloadable CSV report."""
    docs = db.query(models.UploadedDocument).order_by(models.UploadedDocument.id.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID",
        "Filename",
        "Category",
        "Building",
        "Billing Period",
        "Upload Date",
        "Status",
        "Consumption",
        "Unit",
        "Bill Amount",
        "Consumer Number",
        "Meter Number",
        "Previous Reading",
        "Current Reading",
        "Notes",
    ])

    for d in docs:
        writer.writerow([
            d.id,
            d.filename,
            d.category,
            d.building,
            d.billing_period,
            d.upload_date,
            d.status,
            d.consumption if d.consumption is not None else "",
            d.consumption_unit or "",
            d.bill_amount if d.bill_amount is not None else "",
            d.consumer_number or "",
            d.meter_number or "",
            d.previous_reading if d.previous_reading is not None else "",
            d.current_reading if d.current_reading is not None else "",
            d.notes or "",
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=aavaran_resource_documents_report.csv"},
    )


@app.get(
    "/api/documents/{doc_id}",
    response_model=schemas.DocumentResponse,
    tags=["Upload & Analyze"],
)
def get_document_detail(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.UploadedDocument).filter(models.UploadedDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document with ID {doc_id} not found")
    return doc


@app.delete("/api/documents/{doc_id}", tags=["Upload & Analyze"])
def delete_document_endpoint(doc_id: int, db: Session = Depends(get_db)):
    success = services.delete_uploaded_document(db, doc_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Document with ID {doc_id} not found")
    return {"detail": f"Document #{doc_id} safely removed from database and disk storage."}


# ==========================================
# 9. Resource Analytics Endpoints (Real AI)
# ==========================================
@app.get(
    "/api/analytics/electricity",
    response_model=schemas.ResourceAnalyticsResponse,
    tags=["Analytics"],
)
def get_electricity_analytics(
    building: Optional[str] = Query(None), db: Session = Depends(get_db)
):
    """
    Computes period-over-period percentage changes, threshold flags,
    and Ordinary Least Squares Linear Regression projection for electricity.
    """
    return analytics.analyze_electricity(db, building=building)


@app.get(
    "/api/analytics/water",
    response_model=schemas.ResourceAnalyticsResponse,
    tags=["Analytics"],
)
def get_water_analytics(
    building: Optional[str] = Query(None), db: Session = Depends(get_db)
):
    """
    Computes period-over-period percentage changes, threshold flags,
    and Ordinary Least Squares Linear Regression projection for water.
    """
    return analytics.analyze_water(db, building=building)
