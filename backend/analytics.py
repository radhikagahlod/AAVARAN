import json
import math
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from models import ElectricityReading, WaterReading, UploadedDocument, Alert


def calculate_linear_regression(points: List[Tuple[float, float]]) -> Dict[str, Any]:
    """
    Transparent statistical trend modeling / linear regression (Real AI & Modeling).
    Computes slope, intercept, R-squared goodness of fit, and projected next value.
    Points are (x, y) where x is period index (0, 1, 2...) and y is consumption.
    """
    n = len(points)
    if n < 3:
        return {
            "has_model": False,
            "message": "Minimum of 3 billing cycles required to fit statistical regression model.",
            "projected_next": None,
            "trend_direction": "insufficient_data",
            "r_squared": None,
            "slope": None,
        }

    sum_x = sum(p[0] for p in points)
    sum_y = sum(p[1] for p in points)
    sum_xx = sum(p[0] ** 2 for p in points)
    sum_yy = sum(p[1] ** 2 for p in points)
    sum_xy = sum(p[0] * p[1] for p in points)

    denominator = n * sum_xx - (sum_x**2)
    if denominator == 0:
        return {
            "has_model": False,
            "message": "Zero variance in periods; unable to compute regression slope.",
            "projected_next": None,
            "trend_direction": "stable",
            "r_squared": 0.0,
            "slope": 0.0,
        }

    slope = (n * sum_xy - sum_x * sum_y) / denominator
    intercept = (sum_y - slope * sum_x) / n

    # Compute R-squared
    y_mean = sum_y / n
    ss_tot = sum((p[1] - y_mean) ** 2 for p in points)
    ss_res = sum((p[1] - (slope * p[0] + intercept)) ** 2 for p in points)
    r_squared = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 1.0
    r_squared = max(0.0, min(1.0, r_squared))

    # Project next period (x = n)
    projected_next = max(0.0, round(slope * n + intercept, 2))

    trend_dir = "stable"
    if slope > 0.05 * y_mean:
        trend_dir = "upward"
    elif slope < -0.05 * y_mean:
        trend_dir = "downward"

    return {
        "has_model": True,
        "message": f"Linear Regression model fitted across {n} historical billing cycles (R² = {round(r_squared, 3)}).",
        "projected_next": projected_next,
        "trend_direction": trend_dir,
        "slope": round(slope, 3),
        "r_squared": round(r_squared, 3),
        "model_type": "Ordinary Least Squares (OLS) Linear Regression",
    }


def analyze_electricity(db: Session, building: Optional[str] = None) -> Dict[str, Any]:
    """
    Electricity analytics: period-over-period comparison, expenditure,
    threshold check, anomaly detection, and regression trend projection.
    """
    # 1. Fetch confirmed electricity bill documents
    query = (
        db.query(UploadedDocument)
        .filter(
            UploadedDocument.category.in_(["electricity_bill", "electricity_report"]),
            UploadedDocument.status == "Confirmed",
            UploadedDocument.consumption.isnot(None),
        )
        .order_by(UploadedDocument.upload_date.asc())
    )
    if building:
        query = query.filter(UploadedDocument.building.ilike(f"%{building}%"))
    docs = query.all()

    # 2. Also fetch recent telemetry readings for fine-grained aggregation
    readings_query = db.query(ElectricityReading)
    if building:
        readings_query = readings_query.filter(ElectricityReading.building.ilike(f"%{building}%"))
    readings = readings_query.all()

    total_consumption_recent = sum(r.consumption for r in readings) if readings else 0.0
    total_bill_amount = sum(d.bill_amount or 0.0 for d in docs)

    # Historical periods from confirmed docs
    historical_periods = []
    for d in docs:
        historical_periods.append({
            "id": d.id,
            "period": d.billing_period,
            "building": d.building,
            "consumption": d.consumption,
            "bill_amount": d.bill_amount,
            "upload_date": d.upload_date,
            "is_synthetic": d.is_synthetic,
        })

    # Period-over-period comparison
    curr_consumption = None
    prev_consumption = None
    percentage_change = None
    anomaly_flag = False
    anomaly_reason = ""
    recommended_action = "Regular energy review. Ensure equipment in non-active rooms is turned off."

    if len(historical_periods) >= 2:
        curr_doc = historical_periods[-1]
        prev_doc = historical_periods[-2]
        curr_consumption = curr_doc["consumption"]
        prev_consumption = prev_doc["consumption"]

        if prev_consumption and prev_consumption > 0:
            percentage_change = round(
                ((curr_consumption - prev_consumption) / prev_consumption) * 100,
                1,
            )
            # Threshold: > 15% increase is flagged
            if percentage_change > 15.0:
                anomaly_flag = True
                anomaly_reason = (
                    f"Consumption increased by {percentage_change}% compared to previous period "
                    f"({prev_consumption} kWh -> {curr_consumption} kWh)."
                )
                recommended_action = (
                    "Inspect facility HVAC timers, check heavy refrigeration units, and verify that "
                    "lighting schedules were not overridden during weekends or off-peak hours."
                )
    elif len(historical_periods) == 1:
        curr_consumption = historical_periods[0]["consumption"]
        if curr_consumption > 180.0:
            anomaly_flag = True
            anomaly_reason = f"Current billing consumption ({curr_consumption} kWh) exceeds standard baseline threshold (180 kWh)."
            recommended_action = "Audit facility power distribution panels and check for continuously running high-draw appliances."

    # Machine learning / regression prediction
    regression_points = [(float(i), float(h["consumption"])) for i, h in enumerate(historical_periods)]
    prediction = calculate_linear_regression(regression_points)

    return {
        "resource": "Electricity",
        "current_consumption": curr_consumption if curr_consumption is not None else total_consumption_recent,
        "consumption_unit": "kWh",
        "total_bill_amount": round(total_bill_amount, 2),
        "previous_consumption": prev_consumption,
        "percentage_change": percentage_change,
        "anomaly_flag": anomaly_flag,
        "anomaly_reason": anomaly_reason,
        "recommended_action": recommended_action,
        "historical_periods": historical_periods,
        "prediction": prediction,
    }


def analyze_water(db: Session, building: Optional[str] = None) -> Dict[str, Any]:
    """
    Water analytics: period-over-period comparison, expenditure,
    threshold check, anomaly detection, and regression trend projection.
    """
    query = (
        db.query(UploadedDocument)
        .filter(
            UploadedDocument.category.in_(["water_bill", "water_report"]),
            UploadedDocument.status == "Confirmed",
            UploadedDocument.consumption.isnot(None),
        )
        .order_by(UploadedDocument.upload_date.asc())
    )
    if building:
        query = query.filter(UploadedDocument.building.ilike(f"%{building}%"))
    docs = query.all()

    readings_query = db.query(WaterReading)
    if building:
        readings_query = readings_query.filter(WaterReading.building.ilike(f"%{building}%"))
    readings = readings_query.all()

    total_consumption_recent = sum(r.consumption for r in readings) if readings else 0.0
    total_bill_amount = sum(d.bill_amount or 0.0 for d in docs)

    historical_periods = []
    for d in docs:
        historical_periods.append({
            "id": d.id,
            "period": d.billing_period,
            "building": d.building,
            "consumption": d.consumption,
            "bill_amount": d.bill_amount,
            "upload_date": d.upload_date,
            "is_synthetic": d.is_synthetic,
        })

    curr_consumption = None
    prev_consumption = None
    percentage_change = None
    anomaly_flag = False
    anomaly_reason = ""
    recommended_action = "Routine inspection. Verify float valves in overhead supply cisterns."

    if len(historical_periods) >= 2:
        curr_doc = historical_periods[-1]
        prev_doc = historical_periods[-2]
        curr_consumption = curr_doc["consumption"]
        prev_consumption = prev_doc["consumption"]

        if prev_consumption and prev_consumption > 0:
            percentage_change = round(
                ((curr_consumption - prev_consumption) / prev_consumption) * 100,
                1,
            )
            # Threshold: > 20% increase
            if percentage_change > 20.0:
                anomaly_flag = True
                anomaly_reason = (
                    f"Water volume rose by {percentage_change}% compared to previous period "
                    f"({prev_consumption} L -> {curr_consumption} L)."
                )
                recommended_action = (
                    "Inspect restrooms, check underground transmission risers, inspect kitchen taps, "
                    "and examine overhead storage tank overflow sensors for silent seepage."
                )
    elif len(historical_periods) == 1:
        curr_consumption = historical_periods[0]["consumption"]
        if curr_consumption > 1200.0:
            anomaly_flag = True
            anomaly_reason = f"Current water consumption ({curr_consumption} litres) exceeds normal baseline threshold (1200 litres)."
            recommended_action = "Physical inspection of supply lines and restrooms recommended to identify potential hidden leaks."

    regression_points = [(float(i), float(h["consumption"])) for i, h in enumerate(historical_periods)]
    prediction = calculate_linear_regression(regression_points)

    return {
        "resource": "Water",
        "current_consumption": curr_consumption if curr_consumption is not None else total_consumption_recent,
        "consumption_unit": "litres",
        "total_bill_amount": round(total_bill_amount, 2),
        "previous_consumption": prev_consumption,
        "percentage_change": percentage_change,
        "anomaly_flag": anomaly_flag,
        "anomaly_reason": anomaly_reason,
        "recommended_action": recommended_action,
        "historical_periods": historical_periods,
        "prediction": prediction,
    }
