from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from database import Base


class WaterReading(Base):
    __tablename__ = "water_readings"

    id = Column(Integer, primary_key=True, index=True)
    building = Column(String(100), nullable=False, index=True)
    location = Column(String(150), nullable=False)
    timestamp = Column(String(50), nullable=False, index=True)  # ISO 8601
    consumption = Column(Float, nullable=False)
    unit = Column(String(20), default="litres")
    status = Column(String(50), default="Normal")  # Normal, Unusual Usage Warning, Attention
    threshold = Column(Float, default=1200.0)
    is_anomaly = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    is_synthetic = Column(Boolean, default=True)


class ElectricityReading(Base):
    __tablename__ = "electricity_readings"

    id = Column(Integer, primary_key=True, index=True)
    building = Column(String(100), nullable=False, index=True)
    location = Column(String(150), nullable=False)
    timestamp = Column(String(50), nullable=False, index=True)  # ISO 8601
    consumption = Column(Float, nullable=False)
    unit = Column(String(20), default="kWh")
    status = Column(String(50), default="Normal")  # Normal, Unusual Usage Warning, Attention
    threshold = Column(Float, default=180.0)
    is_anomaly = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    is_synthetic = Column(Boolean, default=True)


class GarbageBin(Base):
    __tablename__ = "garbage_bins"

    id = Column(Integer, primary_key=True, index=True)
    bin_code = Column(String(50), unique=True, nullable=False, index=True)
    building = Column(String(100), nullable=False, index=True)
    location = Column(String(150), nullable=False)
    fill_level = Column(Float, nullable=False)  # 0 to 100 percentage
    last_updated = Column(String(50), nullable=False)  # ISO 8601
    status = Column(String(50), default="Normal")  # Normal, Attention, Collection Recommended
    collection_recommended = Column(Boolean, default=False)
    is_synthetic = Column(Boolean, default=True)


class DeviceIssue(Base):
    __tablename__ = "device_issues"

    id = Column(Integer, primary_key=True, index=True)
    device_name = Column(String(120), nullable=False)
    device_type = Column(String(80), nullable=False)  # e.g., Tap, Pipe, Flush System, Light Fixture, AC, etc.
    resource_type = Column(String(50), nullable=False, index=True)  # Water, Electricity, Other
    building = Column(String(100), nullable=False, index=True)
    location = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), default="Medium", index=True)  # Low, Medium, High
    estimated_waste = Column(Float, nullable=True)  # Optional resource waste estimation
    waste_unit = Column(String(30), nullable=True)  # e.g., litres/day, kWh/day
    reporter_name = Column(String(100), nullable=True)
    status = Column(String(30), default="Reported", index=True)  # Reported, In Progress, Resolved
    reported_at = Column(String(50), nullable=False)  # ISO 8601
    updated_at = Column(String(50), nullable=False)  # ISO 8601
    resolved_at = Column(String(50), nullable=True)
    repair_notes = Column(Text, nullable=True)
    is_synthetic = Column(Boolean, default=False)

    # Relationship to linked alerts
    alerts = relationship("Alert", back_populates="device_issue", cascade="all, delete-orphan")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    resource_type = Column(String(50), nullable=False, index=True)  # Water, Electricity, Garbage, Device
    building = Column(String(100), nullable=False)
    location = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), default="Medium", index=True)  # Low, Medium, High
    created_at = Column(String(50), nullable=False, index=True)
    recommended_action = Column(Text, nullable=False)
    status = Column(String(30), default="Active", index=True)  # Active, Resolved
    resolved_at = Column(String(50), nullable=True)
    linked_device_issue_id = Column(Integer, ForeignKey("device_issues.id"), nullable=True)
    is_synthetic = Column(Boolean, default=True)

    # Relationship back to DeviceIssue
    device_issue = relationship("DeviceIssue", back_populates="alerts")
