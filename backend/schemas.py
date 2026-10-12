from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class HealthResponse(BaseModel):
    status: str
    database: str
    version: str
    message: str


class WaterReadingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    building: str
    location: str
    timestamp: str
    consumption: float
    unit: str
    status: str
    threshold: float
    is_anomaly: bool
    notes: Optional[str] = None
    is_synthetic: bool


class ElectricityReadingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    building: str
    location: str
    timestamp: str
    consumption: float
    unit: str
    status: str
    threshold: float
    is_anomaly: bool
    notes: Optional[str] = None
    is_synthetic: bool


class GarbageBinResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bin_code: str
    building: str
    location: str
    fill_level: float
    last_updated: str
    status: str
    collection_recommended: bool
    is_synthetic: bool


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    resource_type: str
    building: str
    location: str
    description: str
    severity: str
    created_at: str
    recommended_action: str
    status: str
    resolved_at: Optional[str] = None
    linked_device_issue_id: Optional[int] = None
    is_synthetic: bool


class AlertStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Active|Resolved)$")
    notes: Optional[str] = None


class DeviceIssueCreate(BaseModel):
    device_name: str = Field(..., min_length=2, max_length=120)
    device_type: str = Field(..., min_length=2, max_length=80)
    resource_type: str = Field(..., pattern="^(Water|Electricity|Other)$")
    building: str = Field(..., min_length=2, max_length=100)
    location: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=5)
    severity: str = Field(default="Medium", pattern="^(Low|Medium|High)$")
    estimated_waste: Optional[float] = Field(default=None, ge=0.0)
    waste_unit: Optional[str] = Field(default=None, max_length=30)
    reporter_name: Optional[str] = Field(default=None, max_length=100)

    @field_validator("device_name", "building", "location", "description")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field cannot be empty or whitespace only")
        return stripped


class DeviceIssueUpdate(BaseModel):
    status: Optional[str] = Field(default=None, pattern="^(Reported|In Progress|Resolved)$")
    repair_notes: Optional[str] = None
    severity: Optional[str] = Field(default=None, pattern="^(Low|Medium|High)$")


class DeviceIssueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_name: str
    device_type: str
    resource_type: str
    building: str
    location: str
    description: str
    severity: str
    estimated_waste: Optional[float] = None
    waste_unit: Optional[str] = None
    reporter_name: Optional[str] = None
    status: str
    reported_at: str
    updated_at: str
    resolved_at: Optional[str] = None
    repair_notes: Optional[str] = None
    is_synthetic: bool
    linked_alert_id: Optional[int] = None


class DeviceSummaryResponse(BaseModel):
    total_issues: int
    open_issues: int
    in_progress_issues: int
    resolved_issues: int
    high_priority_issues: int


class OverviewResponse(BaseModel):
    current_water_consumption: float
    water_unit: str
    water_status: str
    current_electricity_consumption: float
    electricity_unit: str
    electricity_status: str
    average_garbage_fill_level: float
    garbage_unit: str
    garbage_status: str
    total_active_alerts: int
    high_priority_alerts_count: int
    total_open_device_issues: int
    device_summary: DeviceSummaryResponse
    high_priority_alerts: List[AlertResponse]
    recent_water_readings: List[WaterReadingResponse]
    recent_electricity_readings: List[ElectricityReadingResponse]
    recent_device_issues: List[DeviceIssueResponse]
    is_synthetic_data: bool
    data_source_notice: str


# ==========================================
# Document Upload & Extraction Schemas
# ==========================================
class DocumentExtractResponse(BaseModel):
    temp_token: str
    filename: str
    category: str
    building: str
    billing_period: str
    consumption: Optional[float] = None
    consumption_unit: Optional[str] = None
    bill_amount: Optional[float] = None
    consumer_number: Optional[str] = None
    meter_number: Optional[str] = None
    previous_reading: Optional[float] = None
    current_reading: Optional[float] = None
    records_count: int = 1
    extraction_confidence: str = "medium"
    notes: Optional[str] = None
    parsed_items: Optional[List[Dict[str, Any]]] = None


class DocumentConfirmRequest(BaseModel):
    temp_token: str
    category: str
    building: str
    billing_period: str
    consumption: Optional[float] = None
    consumption_unit: Optional[str] = None
    bill_amount: Optional[float] = None
    consumer_number: Optional[str] = None
    meter_number: Optional[str] = None
    previous_reading: Optional[float] = None
    current_reading: Optional[float] = None
    notes: Optional[str] = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    file_type: str
    category: str
    building: str
    billing_period: str
    upload_date: str
    status: str
    consumption: Optional[float] = None
    consumption_unit: Optional[str] = None
    bill_amount: Optional[float] = None
    consumer_number: Optional[str] = None
    meter_number: Optional[str] = None
    previous_reading: Optional[float] = None
    current_reading: Optional[float] = None
    records_count: int = 1
    notes: Optional[str] = None
    is_synthetic: bool = False


# ==========================================
# Resource Analytics Schemas
# ==========================================
class PredictionModelInfo(BaseModel):
    has_model: bool
    message: str
    projected_next: Optional[float] = None
    trend_direction: str
    slope: Optional[float] = None
    r_squared: Optional[float] = None
    model_type: Optional[str] = None


class HistoricalPeriodInfo(BaseModel):
    id: int
    period: str
    building: str
    consumption: float
    bill_amount: Optional[float] = None
    upload_date: str
    is_synthetic: bool


class ResourceAnalyticsResponse(BaseModel):
    resource: str
    current_consumption: float
    consumption_unit: str
    total_bill_amount: float
    previous_consumption: Optional[float] = None
    percentage_change: Optional[float] = None
    anomaly_flag: bool
    anomaly_reason: str
    recommended_action: str
    historical_periods: List[HistoricalPeriodInfo]
    prediction: PredictionModelInfo
