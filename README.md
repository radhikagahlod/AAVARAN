# AAVARAN — AI-Based Analysis and Visualization for Adaptive Resource Awareness Network

> **Tagline:** *Smarter Resources. Sustainable Campus.*

**AAVARAN** is a full-stack campus resource-awareness and monitoring platform designed for educational institutions to track water and electricity consumption, monitor smart garbage bin capacities, report defective fixtures that cause resource waste, and coordinate prompt maintenance actions.

---

## 1. Core Workflow

The operational philosophy of AAVARAN follows a 4-step loop:

$$\text{DETECT} \longrightarrow \text{PRIORITIZE} \longrightarrow \text{ACT} \longrightarrow \text{VERIFY}$$

1. **DETECT**: Real-time evaluation against explainable baseline thresholds:
   - **Water Flow:** Readings above `1,200 litres` flag an *Unusual Usage Warning*.
   - **Electricity Load:** Readings above `180 kWh` flag an *Audit Review Recommendation*.
   - **Garbage Bins:** Levels $\ge 85\%$ trigger an immediate *Collection Recommendation*.
   - **Crowdsourced Device Reports:** Students and staff report leaking taps, running flushes, or malfunctioning lighting timers.
2. **PRIORITIZE**: Issues are triaged by severity (*High*, *Medium*, *Low*). High and Medium severity reports automatically generate actionable system alerts.
3. **ACT**: Facility maintenance managers assign work, record technician notes, track parts replacements, and advance status (*Reported* $\rightarrow$ *In Progress* $\rightarrow$ *Resolved*).
4. **VERIFY**: Status updates are logged transparently with timestamps. Independent inspection or subsequent telemetry confirmation is noted as required to confirm physical waste stoppage.

---

## 2. Key Features

- **Executive Overview Dashboard**: High-level telemetry aggregation, metric cards with live statuses, visual charts for consumption by facility, bin fill distributions, and recent defective device reports.
- **Water Consumption Monitoring**: Facility-by-facility water meter breakdown, baseline threshold indicators, and cautious non-hyperbolic anomaly alerts.
- **Electricity Monitoring**: Campus electrical substation and subpanel tracking with energy audit recommendations.
- **Smart Garbage Monitoring**: Ultrasonic bin fill percentages, threshold-based status categorisation ($<60\%$ Normal, $60\text{--}84\%$ Attention, $\ge 85\%$ Collection Recommended).
- **Defective Device & Resource Waste Tracking**:
  - Summary KPI cards (Total, Open, In Progress, Resolved, High Priority).
  - Report Defective Device form with input validation, optional estimated waste ($\text{L/day}$ or $\text{kWh/day}$), and reporter attribution.
  - Interactive maintenance tracking modal with progress history and repair notes.
  - Linked alert synchronization: Resolving a defect automatically resolves its linked alert.
- **Alerts Management**: Unified alert dashboard with filtering by severity, resource type, and status; manual resolve/reopen functionality.
- **Transparent Honesty Banner**: Clearly distinguishes synthetic simulation telemetry from persistent user-submitted records.

---

## 3. Technology Stack

### Frontend
- **Framework**: React 19 + Vite 8
- **Routing**: React Router DOM (v7)
- **Styling**: Modern Vanilla CSS Design System with responsive sidebar, glassmorphic headers, card elevations, and custom tokens
- **Data Visualization**: Recharts (BarCharts, PieCharts, ReferenceLines)
- **Icons**: Lucide React
- **HTTP Client**: Axios with centralized base URL configuration

### Backend
- **Framework**: Python 3.10+ (tested on Python 3.14) with FastAPI
- **ASGI Server**: Uvicorn
- **Data Validation**: Pydantic V2
- **ORM & Database**: SQLAlchemy with SQLite (`backend/aavaran.db`)
- **Testing**: Pytest & HTTPX TestClient

---

## 4. Project Structure

```
aavaran/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   ├── .env
│   └── src/
│       ├── components/
│       │   ├── DemoBanner.jsx
│       │   ├── MetricCard.jsx
│       │   ├── Navbar.jsx
│       │   ├── Sidebar.jsx
│       │   └── StatusBadge.jsx
│       ├── pages/
│       │   ├── About.jsx
│       │   ├── Alerts.jsx
│       │   ├── DeviceIssues.jsx
│       │   ├── ElectricityMonitoring.jsx
│       │   ├── GarbageMonitoring.jsx
│       │   ├── Overview.jsx
│       │   └── WaterMonitoring.jsx
│       ├── services/
│       │   └── api.js
│       ├── styles/
│       │   └── index.css
│       ├── App.jsx
│       └── main.jsx
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── services.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── README.md
│   └── tests/
│       ├── test_api.py
│       └── test_live_server.py
└── README.md
```

---

## 5. Prerequisites

Before running the application, ensure you have:
1. **Node.js**: v18.0.0 or higher (`node --version`)
2. **Python**: v3.10 or higher (`py --version` or `python --version`)

---

## 6. Installation & Setup (Windows PowerShell)

### Step 1: Backend Setup

```powershell
# 1. Open PowerShell and navigate to the backend folder
cd c:\Users\radhi\OneDrive\Documents\aavaran\backend

# 2. Create a virtual environment
py -m venv venv

# 3. Activate the virtual environment
.\venv\Scripts\Activate.ps1

# 4. Install backend dependencies
pip install -r requirements.txt
```

### Step 2: Frontend Setup

```powershell
# 1. Open a new PowerShell window and navigate to the frontend folder
cd c:\Users\radhi\OneDrive\Documents\aavaran\frontend

# 2. Install Node dependencies
npm install
```

---

## 7. Running the Application

### Option A: Local Development (Single Machine)

**Terminal 1 — Run Backend:**
```powershell
cd c:\Users\radhi\OneDrive\Documents\aavaran\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend will be running at:* `http://127.0.0.1:8000`  
*Interactive Swagger Documentation:* `http://127.0.0.1:8000/docs`

**Terminal 2 — Run Frontend:**
```powershell
cd c:\Users\radhi\OneDrive\Documents\aavaran\frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
*Frontend will be running at:* `http://127.0.0.1:5173`

---

### Option B: Same-Wi-Fi Multi-Laptop Setup (Hackathon Judges Demo)

To run the backend on **Laptop A** and access the UI from **Laptop B**:

1. **On Laptop A (Backend):**
   - Find your local IPv4 address by running:
     ```powershell
     ipconfig
     ```
     *(Look for `IPv4 Address`, e.g., `192.168.1.45`)*
   - Start the backend listening on all interfaces:
     ```powershell
     python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
     ```
2. **On Laptop B (Frontend):**
   - In `frontend/.env`, set the backend IP:
     ```env
     VITE_API_BASE_URL=http://192.168.1.45:8000
     ```
   - Run the frontend server:
     ```powershell
     npm run dev
     ```
   - Open the URL reported in the terminal (e.g. `http://localhost:5173`).

---

## 8. Backend API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health status and SQLite database connection |
| `GET` | `/api/overview` | Aggregated telemetry, active alerts, and summaries |
| `GET` | `/api/water` | Water meter readings and anomaly warnings |
| `GET` | `/api/electricity` | Power meter readings and load status |
| `GET` | `/api/garbage` | Smart bin fill levels and collection alerts |
| `GET` | `/api/alerts` | List alerts (supports `severity`, `resource_type`, `status` filters) |
| `POST` | `/api/alerts/{id}/resolve` | Mark an alert as resolved |
| `POST` | `/api/alerts/{id}/reopen` | Reopen a resolved alert |
| `GET` | `/api/devices/issues` | List reported device defects (supports filtering) |
| `GET` | `/api/devices/issues/{id}` | Detailed issue record |
| `POST` | `/api/devices/issues` | Submit a new defective device report |
| `PATCH`| `/api/devices/issues/{id}` | Update repair status and maintenance notes |
| `GET` | `/api/devices/summary` | KPI counts (Total, Open, In Progress, Resolved, High Priority) |

---

## 9. Automated Testing & Verification

Run the full automated test suites:

### Backend Unit & Integration Tests:
```powershell
cd c:\Users\radhi\OneDrive\Documents\aavaran
backend\venv\Scripts\pytest backend\tests
```
*Result:* **9/9 tests pass** with 100% coverage across health, overview, telemetry, device issue workflows, validation, and alert synchronization.

### Live Server End-to-End Tests:
```powershell
backend\venv\Scripts\python backend\tests\test_live_server.py
```
*Result:* **All HTTP E2E tests pass** against running FastAPI server.

### Frontend Production Build Check:
```powershell
cd frontend
npm run build
```
*Result:* **Production bundle built in 7.6s** with zero errors.

---

## 10. Honesty & Current Limitations

- **Demo Telemetry:** Initial water, electricity, and garbage readings are synthetic simulations to demonstrate campus IoT integration without requiring physical sensor hardware.
- **Explainable Thresholds:** Anomaly detection relies on explainable, documented threshold logic ($>1200\text{ L}$, $>180\text{ kWh}$, $\ge 85\%$).
- **Verification Honesty:** Marking an issue as "Resolved" records user/technician maintenance completion; independent follow-up inspection is still recommended to confirm that resource flow has completely halted.
- **Future Improvements:**
  - Role-based authentication (Admin, Technician, Student Reporter).
  - MQTT broker integration for live hardware IoT sensors (e.g. ESP32 flow meters).
  - Geolocation campus map with floor-by-floor interactive CAD overlays.
