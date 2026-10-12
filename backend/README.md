# AAVARAN Backend API

FastAPI backend and SQLite database service for **AAVARAN** (AI-Based Analysis and Visualization for Adaptive Resource Awareness Network).

## Features
- **Health Check**: Service and database connectivity monitoring (`/api/health`).
- **Resource Telemetry**: Transparent threshold-based anomaly checking for Water (`/api/water`), Electricity (`/api/electricity`), and Garbage Bins (`/api/garbage`).
- **Defective Device Module**: Full lifecycle management of resource-wasting fixtures (`/api/devices/issues`), including status progression (Reported → In Progress → Resolved), repair notes, and optional waste estimates.
- **Alerts Engine**: Auto-links High and Medium severity device issues with active alerts, ensuring status synchronization upon repair.
- **Explainable Thresholds**: Water (>1200L), Electricity (>180kWh), Garbage (<60% Normal, 60-84% Attention, ≥85% Collection Recommended).

## Technology Stack
- **Language**: Python 3.10+ (tested on Python 3.14)
- **Framework**: FastAPI, Uvicorn
- **ORM & Database**: SQLAlchemy, SQLite (`aavaran.db`)
- **Validation**: Pydantic V2
- **Testing**: Pytest, HTTPX

## Setup Instructions (Windows PowerShell)

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment
py -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run server locally
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Or run accessible over local Wi-Fi for multi-laptop demos:
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Running Automated Tests

```powershell
# From the project root or backend directory:
backend\venv\Scripts\pytest backend\tests
```

## API Documentation
Once running, visit:
- **Swagger UI Interactive Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
