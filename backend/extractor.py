import csv
import io
import json
import os
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple
from pypdf import PdfReader
from PIL import Image

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".csv"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit


def validate_file(filename: str, content: bytes) -> Tuple[bool, str]:
    """Validate file extension and size."""
    if not filename:
        return False, "Filename cannot be empty."

    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        return (
            False,
            f"Unsupported file type '{ext}'. Allowed formats: PDF, JPG, PNG, CSV.",
        )

    if len(content) > MAX_FILE_SIZE_BYTES:
        return False, "File exceeds maximum permitted size of 10 MB."

    if len(content) == 0:
        return False, "Uploaded file is empty."

    return True, ""


def save_uploaded_file(filename: str, content: bytes, prefix: str = "") -> str:
    """Save file safely with sanitized UUID filename to prevent path traversal."""
    _, ext = os.path.splitext(filename.lower())
    safe_name = f"{prefix}{uuid.uuid4().hex[:12]}_{re.sub(r'[^a-zA-Z0-9_-]', '_', os.path.splitext(filename)[0])}{ext}"
    target_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(target_path, "wb") as f:
        f.write(content)
    return safe_name


def extract_text_from_pdf(content: bytes) -> str:
    """Extract plain text from PDF using pypdf."""
    try:
        reader = PdfReader(io.BytesIO(content))
        text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
        return text
    except Exception as e:
        return f""


def parse_clean_float(val_str: Optional[str]) -> Optional[float]:
    """Clean and parse a string into a float."""
    if not val_str:
        return None
    try:
        cleaned = re.sub(r"[^\d.]", "", val_str)
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


def extract_electricity_bill(content: bytes, filename: str) -> Dict[str, Any]:
    """Extract electricity bill fields from PDF or image."""
    _, ext = os.path.splitext(filename.lower())
    raw_text = ""
    is_image = ext in [".jpg", ".jpeg", ".png"]

    if ext == ".pdf":
        raw_text = extract_text_from_pdf(content)

    extracted: Dict[str, Any] = {
        "consumer_number": None,
        "meter_number": None,
        "billing_period": None,
        "billing_date": None,
        "consumption": None,
        "consumption_unit": "kWh",
        "bill_amount": None,
        "previous_reading": None,
        "current_reading": None,
        "extraction_confidence": "low",
        "notes": "",
    }

    if raw_text:
        # 1. Consumer / Account Number
        c_match = re.search(
            r"(?:Consumer|Account|CA|Customer)\s*(?:No|ID|Number|#)?[:\s]+([A-Za-z0-9\-]+?)(?=(?:Meter|Building|Billing|Date)\b|\n|$)",
            raw_text,
            re.IGNORECASE,
        )
        if c_match:
            extracted["consumer_number"] = c_match.group(1).strip()

        # 2. Meter Number
        m_match = re.search(
            r"Meter\s*(?:No|Number|#)?[:\s]+([A-Za-z0-9\-]+?)(?=(?:Building|Billing|Date|Previous|Current)\b|\n|$)",
            raw_text,
            re.IGNORECASE,
        )
        if m_match:
            extracted["meter_number"] = m_match.group(1).strip()

        # 3. Units / kWh Consumed
        kwh_match = re.search(
            r"(?:Units?\s*(?:Consumed|Billed)?|Total\s*Consumption|Energy\s*Consumed)[:\s]+([0-9\.,]+)\s*(?:kWh|Units)?",
            raw_text,
            re.IGNORECASE,
        )
        if not kwh_match:
            kwh_match = re.search(r"([0-9\.,]+)\s*kWh", raw_text, re.IGNORECASE)
        if kwh_match:
            extracted["consumption"] = parse_clean_float(kwh_match.group(1))

        # 4. Total Bill Amount
        amt_match = re.search(
            r"(?:Total\s*(?:Amount|Payable|Bill\s*Amount)?|Net\s*Amount|Amount\s*Due)[:\s]*(?:₹|Rs\.?|INR|\$)?\s*([0-9\.,]+)",
            raw_text,
            re.IGNORECASE,
        )
        if amt_match:
            extracted["bill_amount"] = parse_clean_float(amt_match.group(1))

        # 5. Billing Period / Date
        date_match = re.search(
            r"Bill(?:ing)?\s*Date[:\s]+([0-9\.\-_/]+)", raw_text, re.IGNORECASE
        )
        if date_match:
            extracted["billing_date"] = date_match.group(1).strip()

        period_match = re.search(
            r"Bill(?:ing)?\s*Period[:\s]+([A-Za-z0-9\s\-_/]+?)(?:\n|$)",
            raw_text,
            re.IGNORECASE,
        )
        if period_match:
            extracted["billing_period"] = period_match.group(1).strip()

        # 6. Previous & Current Meter Reading
        curr_m = re.search(
            r"Current\s*(?:Reading|Meter)?[:\s]+([0-9\.,]+)",
            raw_text,
            re.IGNORECASE,
        )
        if curr_m:
            extracted["current_reading"] = parse_clean_float(curr_m.group(1))

        prev_m = re.search(
            r"Previous\s*(?:Reading|Meter)?[:\s]+([0-9\.,]+)",
            raw_text,
            re.IGNORECASE,
        )
        if prev_m:
            extracted["previous_reading"] = parse_clean_float(prev_m.group(1))

        # Calculate consumption from meter readings if consumption not directly caught
        if (
            extracted["consumption"] is None
            and extracted["current_reading"] is not None
            and extracted["previous_reading"] is not None
        ):
            diff = extracted["current_reading"] - extracted["previous_reading"]
            if diff >= 0:
                extracted["consumption"] = round(diff, 2)

        has_core = extracted["consumption"] is not None or extracted["bill_amount"] is not None
        extracted["extraction_confidence"] = "high" if has_core else "medium"
        extracted["notes"] = (
            "Text extracted successfully from digital PDF document."
            if has_core
            else "Partial text extracted from PDF. Please review and confirm fields."
        )
    elif is_image:
        extracted["notes"] = (
            "Scanned image received. Please review, adjust or manually enter the bill fields below."
        )
        extracted["extraction_confidence"] = "manual_review_needed"
    else:
        extracted["notes"] = (
            "No embedded text detected in PDF document (may be a scanned copy). Please enter values manually."
        )
        extracted["extraction_confidence"] = "manual_review_needed"

    return extracted


def extract_water_bill(content: bytes, filename: str) -> Dict[str, Any]:
    """Extract water bill fields from PDF or image."""
    _, ext = os.path.splitext(filename.lower())
    raw_text = ""
    is_image = ext in [".jpg", ".jpeg", ".png"]

    if ext == ".pdf":
        raw_text = extract_text_from_pdf(content)

    extracted: Dict[str, Any] = {
        "consumer_number": None,
        "meter_number": None,
        "billing_period": None,
        "billing_date": None,
        "consumption": None,
        "consumption_unit": "litres",
        "bill_amount": None,
        "previous_reading": None,
        "current_reading": None,
        "extraction_confidence": "low",
        "notes": "",
    }

    if raw_text:
        c_match = re.search(
            r"(?:Consumer|Connection|Account)\s*(?:No|ID|#)?[:\s]+([A-Za-z0-9\-]+?)(?=(?:Meter|Building|Billing|Date)\b|\n|$)",
            raw_text,
            re.IGNORECASE,
        )
        if c_match:
            extracted["consumer_number"] = c_match.group(1).strip()

        m_match = re.search(
            r"Meter\s*(?:No|Number|#)?[:\s]+([A-Za-z0-9\-]+?)(?=(?:Building|Billing|Date|Water|Previous|Current)\b|\n|$)",
            raw_text,
            re.IGNORECASE,
        )
        if m_match:
            extracted["meter_number"] = m_match.group(1).strip()

        w_match = re.search(
            r"(?:Water\s*)?(?:Consumption|Quantity|Units?|Volume)[:\s]+([0-9\.,]+)\s*(?:litres|kL|KL|L|m3|units)?",
            raw_text,
            re.IGNORECASE,
        )
        if w_match:
            extracted["consumption"] = parse_clean_float(w_match.group(1))

        amt_match = re.search(
            r"(?:Total\s*(?:Amount|Payable|Bill\s*Amount)?|Net\s*Amount|Amount\s*Due)[:\s]*(?:₹|Rs\.?|INR|\$)?\s*([0-9\.,]+)",
            raw_text,
            re.IGNORECASE,
        )
        if amt_match:
            extracted["bill_amount"] = parse_clean_float(amt_match.group(1))

        period_match = re.search(
            r"Bill(?:ing)?\s*Period[:\s]+([A-Za-z0-9\s\-_/]+?)(?:\n|$)",
            raw_text,
            re.IGNORECASE,
        )
        if period_match:
            extracted["billing_period"] = period_match.group(1).strip()

        date_match = re.search(
            r"Bill(?:ing)?\s*Date[:\s]+([0-9\.\-_/]+)", raw_text, re.IGNORECASE
        )
        if date_match:
            extracted["billing_date"] = date_match.group(1).strip()

        has_core = extracted["consumption"] is not None or extracted["bill_amount"] is not None
        extracted["extraction_confidence"] = "high" if has_core else "medium"
        extracted["notes"] = (
            "Water bill text extracted successfully from PDF."
            if has_core
            else "Partial text extracted from water bill. Review details before confirmation."
        )
    elif is_image:
        extracted["notes"] = (
            "Scanned image received. Please review, adjust or manually enter the water bill values below."
        )
        extracted["extraction_confidence"] = "manual_review_needed"
    else:
        extracted["notes"] = (
            "No direct text found in water bill PDF. Please provide measurements manually."
        )
        extracted["extraction_confidence"] = "manual_review_needed"

    return extracted


def parse_csv_content(content: bytes) -> List[Dict[str, str]]:
    """Helper to parse raw bytes into list of row dicts."""
    text_stream = io.StringIO(content.decode("utf-8-sig", errors="replace"))
    reader = csv.DictReader(text_stream)
    rows = []
    for r in reader:
        # Strip all keys and values
        clean_row = {
            k.strip().lower() if k else "": v.strip() if v else ""
            for k, v in r.items()
            if k is not None
        }
        rows.append(clean_row)
    return rows


def extract_electricity_csv(content: bytes) -> Dict[str, Any]:
    """Parse and validate electricity consumption CSV report."""
    rows = parse_csv_content(content)
    if not rows:
        raise ValueError("CSV file is empty or missing headers.")

    sample_keys = list(rows[0].keys())
    consumption_key = next(
        (k for k in sample_keys if any(x in k for x in ["consumption", "kwh", "units", "value", "reading"])),
        None,
    )
    if not consumption_key:
        raise ValueError(
            "CSV missing consumption column. Required column name like 'consumption', 'kwh', or 'units'."
        )

    building_key = next((k for k in sample_keys if any(x in k for x in ["building", "facility", "block"])), None)
    timestamp_key = next((k for k in sample_keys if any(x in k for x in ["timestamp", "date", "time", "period"])), None)
    location_key = next((k for k in sample_keys if any(x in k for x in ["location", "meter", "room", "substation"])), None)

    total_consumption = 0.0
    parsed_readings = []

    for i, r in enumerate(rows):
        val = parse_clean_float(r.get(consumption_key))
        if val is not None:
            total_consumption += val
            parsed_readings.append({
                "building": r.get(building_key, "Campus Block") if building_key else "Campus Block",
                "location": r.get(location_key, f"Feed #{i+1}") if location_key else f"Feed #{i+1}",
                "timestamp": r.get(timestamp_key, "") if timestamp_key else "",
                "consumption": val,
                "unit": "kWh",
            })

    return {
        "records_count": len(parsed_readings),
        "consumption": round(total_consumption, 2),
        "consumption_unit": "kWh",
        "bill_amount": None,
        "parsed_readings": parsed_readings,
        "extraction_confidence": "high",
        "notes": f"Validated and structured {len(parsed_readings)} electricity readings from CSV report.",
    }


def extract_water_csv(content: bytes) -> Dict[str, Any]:
    """Parse and validate water consumption CSV report."""
    rows = parse_csv_content(content)
    if not rows:
        raise ValueError("CSV file is empty or missing headers.")

    sample_keys = list(rows[0].keys())
    consumption_key = next(
        (k for k in sample_keys if any(x in k for x in ["consumption", "litres", "liters", "volume", "value"])),
        None,
    )
    if not consumption_key:
        raise ValueError(
            "CSV missing water consumption column. Required column name like 'consumption', 'litres', or 'volume'."
        )

    building_key = next((k for k in sample_keys if any(x in k for x in ["building", "facility", "block"])), None)
    timestamp_key = next((k for k in sample_keys if any(x in k for x in ["timestamp", "date", "time"])), None)
    location_key = next((k for k in sample_keys if any(x in k for x in ["location", "meter", "zone"])), None)

    total_consumption = 0.0
    parsed_readings = []

    for i, r in enumerate(rows):
        val = parse_clean_float(r.get(consumption_key))
        if val is not None:
            total_consumption += val
            parsed_readings.append({
                "building": r.get(building_key, "Campus Block") if building_key else "Campus Block",
                "location": r.get(location_key, f"Supply Meter #{i+1}") if location_key else f"Supply Meter #{i+1}",
                "timestamp": r.get(timestamp_key, "") if timestamp_key else "",
                "consumption": val,
                "unit": "litres",
            })

    return {
        "records_count": len(parsed_readings),
        "consumption": round(total_consumption, 2),
        "consumption_unit": "litres",
        "bill_amount": None,
        "parsed_readings": parsed_readings,
        "extraction_confidence": "high",
        "notes": f"Validated and structured {len(parsed_readings)} water meter readings from CSV report.",
    }


def extract_garbage_csv(content: bytes) -> Dict[str, Any]:
    """Parse and validate garbage monitoring records CSV."""
    rows = parse_csv_content(content)
    if not rows:
        raise ValueError("CSV file is empty or missing headers.")

    sample_keys = list(rows[0].keys())
    fill_key = next(
        (k for k in sample_keys if any(x in k for x in ["fill", "level", "percentage", "capacity"])),
        None,
    )
    if not fill_key:
        raise ValueError("CSV missing fill level column. Required column name like 'fill_level' or 'capacity'.")

    code_key = next((k for k in sample_keys if any(x in k for x in ["bin_code", "bin", "id", "code"])), None)
    building_key = next((k for k in sample_keys if any(x in k for x in ["building", "zone", "facility"])), None)
    location_key = next((k for k in sample_keys if any(x in k for x in ["location", "area", "spot"])), None)

    parsed_bins = []
    for i, r in enumerate(rows):
        raw_val = parse_clean_float(r.get(fill_key))
        if raw_val is not None:
            val = max(0.0, min(100.0, raw_val))
            code = r.get(code_key, f"BIN-{i+1:03d}") if code_key else f"BIN-{i+1:03d}"
            building = r.get(building_key, "Campus Quad") if building_key else "Campus Quad"
            location = r.get(location_key, "General Area") if location_key else "General Area"
            parsed_bins.append({
                "bin_code": code,
                "building": building,
                "location": location,
                "fill_level": val,
            })

    return {
        "records_count": len(parsed_bins),
        "parsed_bins": parsed_bins,
        "extraction_confidence": "high",
        "notes": f"Validated {len(parsed_bins)} garbage bin records from CSV import.",
    }


def extract_maintenance_csv(content: bytes) -> Dict[str, Any]:
    """Parse and validate maintenance / defective device reports CSV."""
    rows = parse_csv_content(content)
    if not rows:
        raise ValueError("CSV file is empty or missing headers.")

    sample_keys = list(rows[0].keys())
    name_key = next((k for k in sample_keys if any(x in k for x in ["device_name", "device", "name", "equipment"])), None)
    if not name_key:
        raise ValueError("CSV missing device name column (e.g. 'device_name' or 'equipment').")

    type_key = next((k for k in sample_keys if any(x in k for x in ["device_type", "type", "category"])), None)
    resource_key = next((k for k in sample_keys if any(x in k for x in ["resource_type", "resource"])), None)
    building_key = next((k for k in sample_keys if any(x in k for x in ["building", "block", "facility"])), None)
    location_key = next((k for k in sample_keys if any(x in k for x in ["location", "room", "area"])), None)
    desc_key = next((k for k in sample_keys if any(x in k for x in ["description", "issue", "problem", "notes"])), None)
    sev_key = next((k for k in sample_keys if any(x in k for x in ["severity", "priority"])), None)
    status_key = next((k for k in sample_keys if any(x in k for x in ["status", "state"])), None)
    waste_key = next((k for k in sample_keys if any(x in k for x in ["waste", "estimated_waste", "leak_rate"])), None)

    parsed_issues = []
    for r in rows:
        d_name = r.get(name_key, "").strip()
        if not d_name:
            continue
        parsed_issues.append({
            "device_name": d_name,
            "device_type": r.get(type_key, "Fixture").strip() if type_key else "Fixture",
            "resource_type": r.get(resource_key, "Water").strip().capitalize() if resource_key else "Water",
            "building": r.get(building_key, "Main Campus").strip() if building_key else "Main Campus",
            "location": r.get(location_key, "General Area").strip() if location_key else "General Area",
            "description": r.get(desc_key, "Reported defect requiring maintenance.").strip() if desc_key else "Reported defect requiring maintenance.",
            "severity": r.get(sev_key, "Medium").strip().capitalize() if sev_key else "Medium",
            "status": r.get(status_key, "Reported").strip().title() if status_key else "Reported",
            "estimated_waste": parse_clean_float(r.get(waste_key)) if waste_key else None,
        })

    return {
        "records_count": len(parsed_issues),
        "parsed_issues": parsed_issues,
        "extraction_confidence": "high",
        "notes": f"Validated {len(parsed_issues)} defective device records from CSV import.",
    }


def extract_document_data(
    filename: str, content: bytes, category: str
) -> Dict[str, Any]:
    """
    Main dispatch function for extracting data according to document category.
    Does not invent data; returns honest confidence and previewable fields.
    """
    if category == "electricity_bill":
        return extract_electricity_bill(content, filename)
    elif category == "water_bill":
        return extract_water_bill(content, filename)
    elif category == "electricity_report":
        return extract_electricity_csv(content)
    elif category == "water_report":
        return extract_water_csv(content)
    elif category == "garbage_records":
        return extract_garbage_csv(content)
    elif category == "maintenance_report":
        return extract_maintenance_csv(content)
    else:
        raise ValueError(f"Unknown document category: {category}")
