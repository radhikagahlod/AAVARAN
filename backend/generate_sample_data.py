import os
import csv
from pypdf import PdfWriter
from PIL import Image, ImageDraw, ImageFont

SAMPLE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_data"))
os.makedirs(SAMPLE_DIR, exist_ok=True)


def create_simple_pdf(text_lines, filename):
    """Generates a real PDF file with embedded text using pypdf."""
    from pypdf.generic import DictionaryObject, NameObject, ArrayObject, DecodedStreamObject, create_string_object
    
    # We can create a simple PDF page or use standard PDF syntax
    # Simple valid PDF content stream
    content = "BT\n/F1 14 Tf\n50 750 Td\n"
    for line in text_lines:
        safe_line = line.replace("(", "\\(").replace(")", "\\)")
        content += f"({safe_line}) '\n"
    content += "ET"
    
    pdf_text = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length {len(content.encode('latin1'))} >>
stream
{content}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000240 00000 n 
0000000300 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
370
%%EOF"""
    with open(os.path.join(SAMPLE_DIR, filename), "wb") as f:
        f.write(pdf_text.encode("latin1"))
    print(f"Created {filename}")


def create_sample_bills():
    # 1. Electricity Bill PDF
    elec_lines = [
        "CAMPUS ELECTRICITY SUPPLY AUTHORITY (DEMO SYNTHETIC BILL)",
        "----------------------------------------------------------",
        "Consumer No: CAMPUS-EL-90214",
        "Meter No: MTR-SCIENCE-401",
        "Building: Science Complex",
        "Billing Period: September 2026",
        "Billing Date: 2026-10-01",
        "",
        "Previous Reading: 13200.0",
        "Current Reading: 13418.0",
        "Units Consumed: 218.0 kWh",
        "",
        "Energy Charges (@ Rs 9.00/unit): Rs 1962.00",
        "Fixed Meter Rent: Rs 150.00",
        "Regulatory Tax: Rs 65.00",
        "----------------------------------------------------------",
        "Total Bill Amount: Rs 2177.00",
        "Due Date: 2026-10-20",
        "Status: DEMO TEST DATA - FOR AAVARAN VERIFICATION ONLY"
    ]
    create_simple_pdf(elec_lines, "sample_electricity_bill.pdf")

    # 2. Water Bill PDF
    water_lines = [
        "METROPOLITAN WATER SUPPLY & SEWERAGE BOARD (DEMO BILL)",
        "----------------------------------------------------------",
        "Consumer No: CAMPUS-WT-55310",
        "Meter No: WTR-ENG-05",
        "Building: Engineering Block A",
        "Billing Period: September 2026",
        "Billing Date: 2026-10-02",
        "",
        "Previous Reading: 89100.0",
        "Current Reading: 90380.0",
        "Water Consumption: 1280.0 litres",
        "",
        "Water Tariff Charges: Rs 960.00",
        "Sewerage Maintenance Surcharge: Rs 140.00",
        "----------------------------------------------------------",
        "Total Bill Amount: Rs 1100.00",
        "Due Date: 2026-10-22",
        "Status: DEMO TEST DATA - FOR AAVARAN VERIFICATION ONLY"
    ]
    create_simple_pdf(water_lines, "sample_water_bill.pdf")

    # 3. Electricity Report CSV
    elec_csv_path = os.path.join(SAMPLE_DIR, "sample_electricity_report.csv")
    with open(elec_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "building", "location", "consumption", "unit", "status"])
        writer.writerow(["2026-10-10T09:00:00Z", "Computer Center", "Main Cluster Substation", "175.5", "kWh", "Normal"])
        writer.writerow(["2026-10-10T11:00:00Z", "Science Complex", "Chemistry Auditorium AC", "198.0", "kWh", "Elevated"])
        writer.writerow(["2026-10-10T14:00:00Z", "Library Building", "Reading Hall Floor 2", "112.0", "kWh", "Normal"])
        writer.writerow(["2026-10-10T16:00:00Z", "Central Dining Hall", "Kitchen Refrigerator Bank", "145.0", "kWh", "Normal"])
        writer.writerow(["2026-10-10T18:00:00Z", "Sports Complex", "Stadium Lighting Bank", "88.0", "kWh", "Normal"])
    print("Created sample_electricity_report.csv")

    # 4. Water Report CSV
    water_csv_path = os.path.join(SAMPLE_DIR, "sample_water_report.csv")
    with open(water_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "building", "location", "consumption", "unit", "status"])
        writer.writerow(["2026-10-10T08:00:00Z", "Student Hostel 2", "Main Cistern Supply", "1180.0", "litres", "Normal"])
        writer.writerow(["2026-10-10T10:00:00Z", "Central Dining Hall", "Kitchen Utility Riser", "920.0", "litres", "Normal"])
        writer.writerow(["2026-10-10T12:00:00Z", "Engineering Block B", "Ground Restrooms Feeder", "640.0", "litres", "Normal"])
        writer.writerow(["2026-10-10T15:00:00Z", "Science Complex", "Biology Lab Flowmeter", "1310.0", "litres", "Attention"])
    print("Created sample_water_report.csv")

    # 5. Garbage Monitoring CSV
    garbage_csv_path = os.path.join(SAMPLE_DIR, "sample_garbage_records.csv")
    with open(garbage_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["bin_code", "building", "location", "fill_level"])
        writer.writerow(["BIN-007", "Science Complex", "Courtyard Entrance", "91.0"])
        writer.writerow(["BIN-008", "Engineering Block B", "Student Lounge", "68.5"])
        writer.writerow(["BIN-009", "Central Dining Hall", "Outdoor Seating North", "86.0"])
        writer.writerow(["BIN-010", "Administration Block", "Front Portico", "38.0"])
    print("Created sample_garbage_records.csv")

    # 6. Maintenance Report CSV
    maint_csv_path = os.path.join(SAMPLE_DIR, "sample_maintenance_report.csv")
    with open(maint_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["device_name", "device_type", "resource_type", "building", "location", "description", "severity", "status", "estimated_waste"])
        writer.writerow(["Science Block B Washroom Tap", "Tap", "Water", "Science Complex", "1st Floor East Restroom", "Severely leaking tap handle valve", "High", "Reported", "75.0"])
        writer.writerow(["Hostel 1 Corridor Floodlight", "Light Bank", "Electricity", "Student Hostel 1", "Wing C Balcony", "Sensor stuck in continuous ON state during daylight", "Medium", "Reported", "14.0"])
        writer.writerow(["Dining Hall Flush Valve #2", "Flush System", "Water", "Central Dining Hall", "Staff Washroom", "Slow continuous cistern overflow", "Low", "In Progress", "25.0"])
    print("Created sample_maintenance_report.csv")

    # 7. Sample Bill Image (PNG)
    img = Image.new("RGB", (700, 450), color="#0f172a")
    d = ImageDraw.Draw(img)
    d.rectangle([(20, 20), (680, 430)], outline="#10b981", width=2)
    d.text((40, 40), "AAVARAN SMART CAMPUS UTILITY BILL (DEMO)", fill="#10b981")
    d.text((40, 80), "Consumer No: CAMPUS-IMG-1002", fill="#f8fafc")
    d.text((40, 115), "Meter No: MTR-IMG-55", fill="#f8fafc")
    d.text((40, 150), "Building: Science Complex Lab Wing", fill="#f8fafc")
    d.text((40, 185), "Billing Period: September 2026", fill="#f8fafc")
    d.text((40, 220), "Units Consumed: 205.0 kWh", fill="#38bdf8")
    d.text((40, 255), "Total Amount: INR 1845.00", fill="#f59e0b")
    d.text((40, 310), "Status: Verified Scanned Bill (Demo)", fill="#94a3b8")
    img.save(os.path.join(SAMPLE_DIR, "sample_electricity_bill.png"))
    print("Created sample_electricity_bill.png")

if __name__ == "__main__":
    create_sample_bills()
