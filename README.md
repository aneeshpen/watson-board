# Watson-Board
## AI-Powered Forensic Triage & Postmortem Intelligence System

> An investigative intelligence platform integrating Machine Learning, Computer Vision, NLP, and interactive data visualization to accelerate forensic case analysis.

## Overview

Watson-Board is a full-stack forensic intelligence platform designed to assist investigators in handling complex, multi-source evidence. The system addresses the primary bottleneck in modern forensic workflows — the manual, time-consuming correlation of unstructured documents, digital records, and physical evidence — by automating analysis and surfacing insights through an interactive command dashboard.

---

## Abstract

Forensic investigations involve analyzing large volumes of complex evidence such as autopsy reports, CCTV footage, mobile metadata, GPS records, and environmental information. Manual processing of this data is often time-consuming and may lead to delays or missed connections between critical evidence.

Watson-Board improves investigation efficiency by integrating Artificial Intelligence, Natural Language Processing (NLP), and data correlation techniques. The system analyzes unstructured forensic documents to extract critical information such as injury patterns, causes of death, and medical observations. It uses AI-based analysis to estimate the probable time of death by combining postmortem indicators with environmental factors. The platform correlates digital evidence — CCTV timestamps, location data, and mobile records — to reconstruct event timelines and identify suspicious patterns. An intelligent risk scoring and anomaly detection module helps investigators prioritize cases, while an interactive dashboard presents evidence summaries, timelines, relationships, and AI-generated insights.

This is an investigative **support system**, not a replacement for forensic experts or legal authorities.

---

## System Architecture

Watson-Board uses a decoupled, two-tier architecture:

```
+----------------------------------------------------------------------+
|                       FRONTEND (React + Vite)                        |
|  TanStack Router . Zustand . Recharts . React Flow . Leaflet . GSAP  |
|  ------------------------------------------------------------------- |
|  Dashboard  |  Case Workspace  |  Timeline Replay  |  AI Copilot    |
|  Reports    |  Movement Map    |  Investigation Graph                 |
+----------------------------+-----------------------------------------+
                             | HTTP (REST API)
+----------------------------v-----------------------------------------+
|                    BACKEND (FastAPI + Python)                         |
|  ------------------------------------------------------------------- |
|  case_router.py  |  pmi_router.py  |  cctv_router.py                 |
|  ------------------------------------------------------------------- |
|  Services:                                                            |
|   autopsy_service | cctv_analyzer | chroma_db | data_generator        |
|  ------------------------------------------------------------------- |
|  Storage:                                                             |
|   ChromaDB (Vector)  |  Scikit-learn Model (.pkl)  |  CSV Dataset    |
+----------------------------------------------------------------------+
```

---

## Frontend — Interactive Dashboard

Built as a React 19 + Vite Single Page Application (SPA) with file-based routing via TanStack Router. The UI is designed with a dark, forensic command-center aesthetic using Tailwind CSS v4 and Radix UI primitives.

### Technology Stack (Frontend)

| Category | Technology | Version |
|---|---|---|
| **Core Framework** | React | 19.x |
| **Build Tool** | Vite | 7.x |
| **Language** | TypeScript | 5.8.x |
| **Routing** | TanStack Router | 1.168.x |
| **Server State** | TanStack Query | 5.83.x |
| **Client State** | Zustand | 5.0.x |
| **Styling** | Tailwind CSS | 4.2.x |
| **UI Primitives** | Radix UI | (full suite) |
| **Charts** | Recharts | 3.8.x |
| **Node Graph** | React Flow | 11.11.x |
| **Maps** | Leaflet + React Leaflet | 1.9.x / 5.0.x |
| **Animation** | Framer Motion | 12.38.x |
| **Animation** | GSAP | 3.15.x |
| **Icons** | Lucide React | 0.575.x |
| **Forms** | React Hook Form + Zod | 7.71.x / 3.24.x |
| **Drag & Drop** | DnD Kit | 6.3.x |
| **Date Utilities** | date-fns | 4.1.x |
| **Deployment** | Cloudflare Workers | via @cloudflare/vite-plugin |

---

## Backend — Intelligence Core

A Python-based REST API built with FastAPI, serving three primary intelligence modules. The backend starts automatically, loads the trained ML model, and exposes a full Swagger UI at `/docs`.


## PMI Prediction Engine (Deep Dive)

**Files:** `train_model.py`, `backend/routers/pmi_router.py`

The PMI engine uses **Lange et al.'s Vitreous Potassium formula** as the ground truth for deriving target labels during training:

```
PMI (hours) = (Vitreous Potassium - 5.04) / 0.7
```

**ML Pipeline (`sklearn.Pipeline`):**

**Step 1 — Preprocessing (`ColumnTransformer`):**
- **Numeric features** (`Age`, `Height`, `Weight`, `Putrefaction`, `Algor Mortis`, `Vitreous Potassium`): Scaled with `StandardScaler`.
- **Categorical features** (`Sex`, `Putre_level`, `Rigor Mortis`, `Livor Mortis`, `Stomach Contents`, `Entomology`): Encoded with `OneHotEncoder(handle_unknown='ignore')`.

**Step 2 — Regressor:**
`RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)` trained on ~3000 autopsy records.

**Step 3 — Model Persistence:**
Saved to `models/pmi_model.pkl` via `joblib`. Auto-loaded at startup; if the file is missing, training is triggered automatically from the CSV.

**Step 4 — Confidence Scoring:**
Computed from the coefficient of variation (CV) of predictions across all 200 individual trees:
```
confidence = (1 - std/mean) x 100
```

**Step 5 — Feature Importance:**
Post-prediction, importances are extracted from the Random Forest and mapped back from one-hot-encoded column names to original base feature names, returned as a percentage-weighted dictionary in the response.

**Step 6 — Data Cleaning:**
A dedicated `clean_dataset()` function fixes common data quality issues:
- Fills missing putrefaction levels (`Putre_level`) when Putrefaction = 0.
- Fills missing `Rigor Mortis` and `Livor Mortis` states with "None".
- Clips negative `abdominal cavity` values to 0.

---

## CCTV Forensic Analyzer (Deep Dive)

**File:** `backend/services/cctv_analyzer.py`

A pure Python/OpenCV video analysis pipeline with no external cloud AI dependency.

### Frame Extraction (`FrameExtractor` class)

Uses **five intelligent strategies** to extract forensically relevant key frames:

| Strategy | Mechanism |
|---|---|
| **First frame** | Always extracted to establish the opening scene context. |
| **Time-interval sampling** | Extracts a frame every N seconds (default: 1.5s). Configurable via API param. |
| **Motion detection** | Frame differencing via `cv2.absdiff`. Extracts when motion ratio exceeds 2% of pixels. |
| **Scene change detection** | Histogram comparison via `cv2.HISTCMP_CORREL`. Extracts when correlation drops below 0.6. |
| **Last frame** | Always extracted to capture the final state of the footage. |

### Forensic Description (`ForensicDescriber` class)

Generates natural-language forensic descriptions (max 20 words) for each frame using:

- **Person detection**: HOG + SVM detector (`cv2.HOGDescriptor_getDefaultPeopleDetector`) — identifies count and spatial position (left/center/right of frame).
- **Vehicle detection**: Contour analysis with aspect-ratio filtering (1.3-4.5) — detects vehicle-like shapes and estimates dominant color via HSV hue mapping (red/orange/yellow/green/blue/purple/gray/black/white).
- **Motion direction**: Lucas-Kanade sparse optical flow (`cv2.calcOpticalFlowPyrLK`) on good feature points — classifies into 8 cardinal directions with magnitude levels (slight/moderate/significant).
- **Scene characterization**: Mean brightness and HSV saturation analysis — classifies dark/dim/bright and indoor/outdoor likelihood.
- **Extraction-reason fallback**: Descriptive text derived from the reason the frame was captured (interval, motion, scene_change, first, last).

---

## Evidence Vector Search (ChromaDB)

**Files:** `backend/services/chroma_db.py`, `backend/routers/case_router.py`

ChromaDB is used as a local persistent vector database to store and semantically search forensic evidence documents for Case C-2041.

**Collection:** `watson_board_evidence_graph`

**Stored document types (with metadata):**

| Type | Examples |
|---|---|
| `victim` | Demographics, cause of death, injury details |
| `autopsy` | Organ weights, stomach contents, PMI indicators |
| `toxicology` | BAC levels, drug traces |
| `suspect` | Suspect profiles, prior convictions, financial links |
| `evidence` | Weapon details, fingerprint matches, DNA results |
| `timeline` | CCTV footage logs, financial transactions, phone records |
| `environmental` | Witness statements, weather logs |

Each document is stored with `node_id`, `type`, `confidence`, and `linked_to` metadata fields, enabling relationship-aware retrieval. Semantic search is performed via `/api/search?query=...` and is used by the AI Copilot to answer natural language forensic queries.

### Technology Stack (Backend)

| Category | Technology | Version |
|---|---|---|
| **API Framework** | FastAPI | >=0.103.1 |
| **Server** | Uvicorn | >=0.23.2 |
| **Data Processing** | Pandas | >=2.2.0 |
| **Machine Learning** | Scikit-learn | >=1.4.0 |
| **Model Serialization** | Joblib | >=1.3.0 |
| **Computer Vision** | OpenCV (headless) | >=4.8.0 |
| **Image Processing** | Pillow | >=10.0.0 |
| **Numerical Computing** | NumPy | >=1.24.0 |
| **Vector Database** | ChromaDB | >=0.4.0 |
| **Data Validation** | Pydantic | >=2.3.0 |
| **Test Data** | Faker | >=19.3.0 |


## Project Structure

```
Watson-Board/
├── backend/                      # Python FastAPI backend
│   ├── main.py                   # FastAPI app entry point, CORS, router registration
│   ├── schemas.py                # Pydantic models (PMI request/response)
│   ├── cctv_schemas.py           # Pydantic models for CCTV analysis
│   ├── train_model.py            # ML model training pipeline (Random Forest)
│   ├── requirements.txt          # Python dependencies
│   ├── test_cctv.py              # CCTV module tests
│   ├── chroma_data/              # Persistent ChromaDB vector storage
│   ├── routers/
│   │   ├── case_router.py        # Case mgmt, autopsy, timeline, search endpoints
│   │   ├── pmi_router.py         # PMI prediction & model training endpoints
│   │   └── cctv_router.py        # CCTV video upload & analysis endpoints
│   └── services/
│       ├── autopsy_service.py    # Autopsy CSV reader service
│       ├── cctv_analyzer.py      # Full OpenCV video analysis pipeline
│       ├── chroma_db.py          # ChromaDB setup & evidence population
│       └── data_generator.py     # Timeline & movement data generation
│
├── dataset/                      # Training data & sample case evidence
│   ├── forensic_autopsy_3000.csv # ML training dataset (~3000 records)
│   ├── autopsy_report_C2041.txt  # Unstructured autopsy report (sample)
│   ├── cctv_investigation_log_C2041.json
│   └── gps_log_C2041.csv
│
├── src/                          # React 19 frontend source
│   ├── routes/                   # TanStack Router file-based routes
│   │   ├── index.tsx             # Command Dashboard (/)
│   │   ├── cases.$caseId.tsx     # Case Workspace (/cases/:id)
│   │   ├── copilot.tsx           # AI Copilot full page (/copilot)
│   │   ├── reports.tsx           # Intelligence Reports (/reports)
│   │   ├── heatmap.tsx           # Risk Heatmap (/heatmap)
│   │   ├── timeline.tsx          # Event Timeline (/timeline)
│   │   ├── alerts.tsx            # Alerts (/alerts)
│   │   └── settings.tsx          # Settings (/settings)
│   ├── components/
│   │   ├── watson-board/         # Core forensic UI components
│   │   │   ├── InvestigationGraph.tsx  # React Flow evidence relationship graph
│   │   │   ├── TimelineReplay.tsx      # Animated timeline reconstruction
│   │   │   ├── AutopsyPanel.tsx        # PMI & autopsy intelligence panel
│   │   │   ├── MovementMap.tsx         # Leaflet GPS movement tracker
│   │   │   ├── Copilot.tsx             # AI investigation chat assistant
│   │   │   ├── CommandHeader.tsx       # Top navigation bar
│   │   │   ├── Sidebar.tsx             # Navigation sidebar
│   │   │   ├── EvidenceNode.tsx        # React Flow custom node renderer
│   │   │   ├── StatCard.tsx            # KPI metric card
│   │   │   ├── RiskMap.tsx             # Compact risk map widget
│   │   │   ├── HypothesisPanel.tsx     # AI hypothesis viewer
│   │   │   ├── ContradictionPanel.tsx  # Inconsistency flagging panel
│   │   │   └── LiveFeed.tsx            # Real-time alert/event feed
│   │   └── ui/                   # Radix UI / shadcn component library
│   ├── data/                     # Static frontend data (cases, evidence vault)
│   ├── lib/                      # API client and utility functions
│   ├── hooks/                    # Custom React hooks
│   ├── contexts/                 # React Context providers
│   └── styles.css                # Global Tailwind + custom CSS
│
├── package.json                  # Frontend dependencies & npm scripts
├── vite.config.ts                # Vite + Cloudflare Workers build config
├── tsconfig.json                 # TypeScript configuration
├── eslint.config.js              # ESLint + Prettier rules
└── test_video.mp4                # Sample CCTV footage for testing
```

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **Python** 3.9 or higher
- **pip** (Python package manager)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Initialize the ChromaDB evidence store (one-time setup for Case C-2041):
   ```bash
   python services/chroma_db.py
   ```

4. Train the PMI model (one-time; auto-triggered on first startup if model is absent):
   ```bash
   python train_model.py
   ```

5. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

The backend runs at **`http://localhost:8000`**.
Interactive Swagger API docs: **`http://localhost:8000/docs`**

### Frontend Setup

Open a new terminal in the project root directory:

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

The frontend runs at **`http://localhost:8080`** (set in `vite.config.ts`), and proxies `/api` to the backend on port 8000.

### Frontend Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the production bundle |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint on the codebase |
| `npm run format` | Auto-format code with Prettier |

---

## Disclaimer

Watson-Board is an investigative **support tool** designed to assist forensic professionals. It is **not** a replacement for qualified forensic experts, medical examiners, pathologists, or legal authorities.

All system outputs — including PMI estimates, AI-generated insights, CCTV descriptions, and evidence correlations — are probabilistic in nature and must be independently verified by qualified human professionals before being used to inform any legal, investigative, or official decision.

The developers of Watson-Board assume no liability for decisions made on the basis of system outputs without appropriate expert review.
