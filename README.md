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
|  TanStack Router . TanStack Query . Recharts . React Flow . Leaflet  |
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

| Category           | Technology      | Version      |
| ------------------ | --------------- | ------------ |
| **Core Framework** | React           | 19.x         |
| **Build Tool**     | Vite            | 7.x          |
| **Language**       | TypeScript      | 5.8.x        |
| **Routing**        | TanStack Router | 1.168.x      |
| **Server State**   | TanStack Query  | 5.83.x       |
| **Styling**        | Tailwind CSS    | 4.2.x        |
| **UI Primitives**  | Radix UI        | (full suite) |
| **Charts**         | Recharts        | 3.8.x        |
| **Node Graph**     | React Flow      | 11.11.x      |
| **Maps**           | Leaflet         | 1.9.x        |
| **Animation**      | Framer Motion   | 12.38.x      |
| **Icons**          | Lucide React    | 0.575.x      |
| **Forms**          | React Hook Form | 7.71.x       |

---

## Backend — Intelligence Core

A Python-based REST API built with FastAPI, serving three primary intelligence modules. The backend starts automatically, loads the trained ML model, and exposes a full Swagger UI at `/docs`.

## PMI Prediction Engine (Deep Dive)

**Files:** `backend/train_model.py`, `backend/ml_experiments.py`, `backend/routers/pmi_router.py`, `backend/services/pmi_explain.py`

### The problem with the obvious approach

This dataset has **no ground-truth PMI or time-of-death column**. A label has to be
constructed. The naive construction is:

```python
df["PMI"] = (df["Vitreous Potassium"] - 5.04) / 0.7   # the target
FEATURES  = [..., "Vitreous Potassium", ...]          # ...also an input
```

That is target leakage. The label is a closed-form function of one of its own
inputs, so the forest just re-learns the line: potassium takes ~99.8% of the
feature importance and nothing else moves the prediction — a still-warm body and
a decomposing one score identically.

### What this model does instead

It poses a question worth asking:

> Vitreous potassium is the best quantitative PMI estimator available, but it
> requires vitreous humour aspiration and lab analysis. **How well can PMI be
> recovered at the scene, from decomposition signs alone?**

So the **Lange vitreous-potassium regression is the label**, and potassium is
**excluded from the feature matrix**. The model must infer PMI from indicators an
examiner can assess directly: body cooling, rigor, livor, entomology,
putrefaction. The signal is real rather than circular — Algor Mortis correlates
**r ≈ -0.68** with Vitreous Potassium in this data.

### Pipeline

| Stage             | Detail                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Preprocessing** | `StandardScaler` on numerics; `OneHotEncoder(handle_unknown="error")` on categoricals, with an explicit vocabulary shared with the API schema |
| **Regressor**     | `RandomForestRegressor(n_estimators=200, max_depth=10, max_features=0.5)` — tuned by `RandomizedSearchCV`                                     |
| **Validation**    | 60/20/20 train / conformal-calibration / test split **plus** 5-fold cross-validation                                                          |
| **Explanations**  | **TreeSHAP per prediction** — contributions sum to `prediction - base_value` for that specific input                                          |
| **Uncertainty**   | **Normalised split-conformal intervals** — distribution-free coverage, verified at 89.7% against a 90% target                                 |

### Model selection

The production configuration was chosen by experiment, not assertion.
`backend/ml_experiments.py` compares **4 feature representations x 4 model
families** under identical 5-fold CV, then ablates feature groups on the winner.
Re-run it with `python backend/ml_experiments.py`.

| 5-fold CV MAE (h)    | one-hot   | ordinal | +engineered | pruned |
| -------------------- | --------- | ------- | ----------- | ------ |
| Ridge                | 0.930     | 1.265   | 1.268       | 1.266  |
| **RandomForest**     | **0.762** | 0.763   | 0.766       | 0.767  |
| ExtraTrees           | 0.768     | 0.766   | 0.769       | 0.780  |
| HistGradientBoosting | 0.795     | 0.795   | 0.796       | 0.773  |

Three plausible-sounding ideas were tested and **rejected because they did not
help**: target-ordered ordinal encoding of the decomposition stages, physics-derived
features (Newton-cooling hours, temperature deficit, BMI), and pruning the
zero-signal demographics. Trees can already recover ordering from one-hot splits
and are invariant to the monotone transforms, so none of it added information.
They are left in the experiment script as documented negative results.

Hyperparameters then came from `RandomizedSearchCV` (40 configs, 5-fold CV),
which improved CV MAE **0.762 -> 0.741 h** using _fewer, shallower_ trees.

### Which findings actually carry the signal

Ablation on the winning model — drop one group, measure the damage:

| Feature group removed       | CV MAE | Δ          |
| --------------------------- | ------ | ---------- |
| _(none — full model)_       | 0.762  | —          |
| Putrefaction + Putre_level  | 1.328  | **+0.566** |
| Entomology                  | 0.931  | +0.169     |
| Livor Mortis                | 0.837  | +0.075     |
| Algor-derived (temperature) | 0.823  | +0.061     |
| Rigor Mortis                | 0.784  | +0.022     |
| Stomach Contents            | 0.766  | +0.004     |

Putrefaction dominates. Notably, **Rigor Mortis has the highest univariate
correlation with the target (ρ = +0.91) yet costs almost nothing to remove** —
it is largely redundant once putrefaction is known. Correlation ranking and
ablation ranking disagree, which is exactly why the ablation is worth running.

### Measured performance

Reproduce with `python backend/train_model.py`; the numbers are written to
`models/pmi_metrics.json` and served at `GET /api/pmi/model-info`.
The split is three-way — 60% fit / 20% conformal calibration / 20% test — and
every number below is on the test set, which neither the fit nor the calibration
step ever saw.

| Model                                                      | MAE (hours) | R²        |
| ---------------------------------------------------------- | ----------- | --------- |
| Predict-train-mean (trivial floor)                         | 4.91        | —         |
| Henssge body-cooling physics, linearly calibrated on train | 3.05        | 0.527     |
| **Random Forest (this model)**                             | **0.80**    | **0.960** |

5-fold CV MAE: **0.74 ± 0.02 h**.

The physics baseline is included deliberately: it is what the ML has to beat to
justify existing. It is calibrated on the training split only, so the comparison
is not rigged.

**Error by PMI range** — a single headline MAE hides where a model is weak:

| PMI range (h) | n   | MAE (h)  | bias (h) |
| ------------- | --- | -------- | -------- |
| 0–2           | 133 | **0.03** | +0.00    |
| 2–6           | 122 | 0.43     | +0.28    |
| 6–12          | 175 | 1.19     | +0.20    |
| 12–24         | 170 | 1.26     | −0.13    |

Accuracy is highest in the first hours, which is where forensic precision
matters most, and degrades as the interval lengthens.

### Calibrated uncertainty (conformal prediction)

The point estimate is not the result — the interval is. Intervals use
**normalised split-conformal prediction**: residuals on a held-out calibration
split, normalised by the forest's own spread, give a quantile `q` such that

```
interval = ŷ ± q · (σ_forest + floor)
```

covers the truth with probability ≥ 1−α under exchangeability alone, with **no
distributional assumption**.

|                                   |           |
| --------------------------------- | --------- |
| Target coverage                   | 90%       |
| **Empirical coverage (test set)** | **89.7%** |
| Mean interval width               | 3.04 h    |

This replaced the previous interval, which was the 10th–90th percentile of the
forest's predictions — a measure of how much the trees _disagree_, which is not
a prediction interval and carries no guarantee. A forest can agree and still be
wrong.

### Implausible-combination detection

Because the interval is normalised by forest spread, its width doubles as a
novelty signal, and the dataset's findings are tightly coupled — `Putre_level =
"None"` never co-occurs with `Rigor Mortis = "Developing"` in **any** of the
3,000 records. An interval wider than the 90th percentile of test-set widths
therefore means _the model has effectively never seen this combination of
findings_, and the response says so via `unusual_combination`.

Validated on 60 randomly sampled real records: **8% flagged** (the p90 threshold
implies ~10%), mean width **2.93 h**, interval coverage **93%**. Physiologically
impossible combinations, by contrast, produce 14–18 h intervals and are flagged
every time.

For a forensic tool this is a feature, not a diagnostic: internally inconsistent
findings are exactly what an investigator wants surfaced rather than buried under
a confident-looking number.

### Honest caveats

- The label is a **proxy standard**, not a forensically established PMI.
- The dataset's forensic columns are **synthetic and tightly coupled** — that
  coupling is precisely what the implausibility detector exploits, and it is also
  why R² = 0.960 is optimistic and should **not** be read as real-world accuracy.
  The gap against the Henssge and mean baselines is the meaningful result.
- Investigative triage support only — not a substitute for a forensic
  pathologist's determination.

### Input validation

Every categorical is a closed enum. Invalid values return **HTTP 422** listing the
permitted options. (Previously all six were bare strings and
`handle_unknown="ignore"` swallowed typos into an all-zero vector, so
`Sex="banana"` returned a confident answer with HTTP 200.)

---

## Investigative Copilot (RAG)

**Files:** `backend/services/copilot.py`, `backend/routers/copilot_router.py`

Retrieval-augmented generation over the case evidence corpus:

1. **Retrieve** — semantic search over ChromaDB returns the top-k evidence chunks.
2. **Ground** — chunks are rendered into a numbered, citable block carrying each
   item's `node_id`, type and confidence.
3. **Generate** — Claude answers **only** from that context, under a system prompt
   that requires citing every claim by node id and refusing to invent evidence.
4. **Stream** — answers arrive over Server-Sent Events. A `sources` event is
   emitted _before_ any text, so the UI shows what the answer is grounded in
   while it is still being written.

Without an `ANTHROPIC_API_KEY` the Copilot degrades to retrieval-only rather than
erroring, so the app still runs end-to-end on a fresh clone.

```
GET  /api/copilot/stream?question=...   # SSE: sources -> delta* -> done
POST /api/copilot/ask                   # non-streaming, same grounding
GET  /api/copilot/status                # rag | retrieval_only
```

---

## CCTV Forensic Analyzer (Deep Dive)

> Requires **OpenCV 4.x** — `opencv-python-headless` is pinned `<5.0.0` because
> OpenCV 5 removed `cv2.HOGDescriptor`, which the person detector uses.

**File:** `backend/services/cctv_analyzer.py`

A pure Python/OpenCV video analysis pipeline with no external cloud AI dependency.

### Frame Extraction (`FrameExtractor` class)

Uses **five intelligent strategies** to extract forensically relevant key frames:

| Strategy                   | Mechanism                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| **First frame**            | Always extracted to establish the opening scene context.                                  |
| **Time-interval sampling** | Extracts a frame every N seconds (default: 1.5s). Configurable via API param.             |
| **Motion detection**       | Frame differencing via `cv2.absdiff`. Extracts when motion ratio exceeds 2% of pixels.    |
| **Scene change detection** | Histogram comparison via `cv2.HISTCMP_CORREL`. Extracts when correlation drops below 0.6. |
| **Last frame**             | Always extracted to capture the final state of the footage.                               |

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

**Collection:** `watson_board_evidence_graph` (18 documents; the client is a process-wide singleton)

**Stored document types (with metadata):**

| Type            | Examples                                                 |
| --------------- | -------------------------------------------------------- |
| `victim`        | Demographics, cause of death, injury details             |
| `autopsy`       | Organ weights, stomach contents, PMI indicators          |
| `toxicology`    | BAC levels, drug traces                                  |
| `suspect`       | Suspect profiles, prior convictions, financial links     |
| `evidence`      | Weapon details, fingerprint matches, DNA results         |
| `timeline`      | CCTV footage logs, financial transactions, phone records |
| `environmental` | Witness statements, weather logs                         |

Each document is stored with `node_id`, `type`, `confidence`, and `linked_to` metadata fields, enabling relationship-aware retrieval. Semantic search is performed via `/api/search?query=...` and is used by the AI Copilot to answer natural language forensic queries.

### Technology Stack (Backend)

| Category                | Technology        | Version   |
| ----------------------- | ----------------- | --------- |
| **API Framework**       | FastAPI           | >=0.103.1 |
| **Server**              | Uvicorn           | >=0.23.2  |
| **Data Processing**     | Pandas            | >=2.2.0   |
| **Machine Learning**    | Scikit-learn      | >=1.4.0   |
| **Model Serialization** | Joblib            | >=1.3.0   |
| **Computer Vision**     | OpenCV (headless) | >=4.8.0   |
| **Image Processing**    | Pillow            | >=10.0.0  |
| **Numerical Computing** | NumPy             | >=1.24.0  |
| **Vector Database**     | ChromaDB          | >=1.0,<2  |
| **Data Validation**     | Pydantic          | >=2.3.0   |

## Project Structure

```
Watson-Board/
├── backend/                      # Python FastAPI backend
│   ├── main.py                   # FastAPI app, lifespan, CORS, error handlers
│   ├── config.py                 # Pydantic Settings (env-driven configuration)
│   ├── security.py               # API-key auth dependency + rate limiter
│   ├── schemas.py                # Pydantic models (enum-validated PMI request)
│   ├── cctv_schemas.py           # Pydantic models for CCTV analysis
│   ├── train_model.py            # Training, conformal calibration, metrics
│   ├── ml_experiments.py         # Model-selection study (reproduces the tables above)
│   ├── requirements.txt          # Python dependencies
│   ├── chroma_data/              # Persistent ChromaDB vector storage
│   ├── routers/
│   │   ├── case_router.py        # Case mgmt, autopsy, timeline, search endpoints
│   │   ├── pmi_router.py         # PMI prediction, explanation & model info
│   │   ├── cctv_router.py        # CCTV video upload & analysis endpoints
│   │   └── copilot_router.py     # RAG endpoints (SSE stream + ask)
│   └── services/
│       ├── autopsy_service.py    # Autopsy CSV reader service
│       ├── cctv_analyzer.py      # Full OpenCV video analysis pipeline
│       ├── chroma_db.py          # ChromaDB client singleton & evidence seeding
│       ├── copilot.py            # RAG: retrieval -> grounded generation
│       ├── pmi_explain.py        # Per-prediction TreeSHAP explanations
│       └── data_generator.py     # Case timeline & movement fixtures
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
│   ├── lib/                      # Typed API client (+ SSE) and utilities
│   ├── hooks/                    # React Query data hooks
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
- **Python** 3.10-3.12 (3.13+ has no wheels yet for some ML dependencies)
- **pip**

> **Windows note:** run Python commands with `PYTHONIOENCODING=utf-8` if your
> console codepage is cp1252.

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Create a virtual environment and install dependencies:

   ```bash
   python -m venv .venv && .venv/Scripts/activate      # Windows
   # python3 -m venv .venv && source .venv/bin/activate  # macOS / Linux
   pip install -r requirements.txt
   ```

3. Configure the environment:

   ```bash
   cp .env.example .env
   ```

   Set `ADMIN_API_KEY` to protect the training and CCTV endpoints, and
   `ANTHROPIC_API_KEY` to enable generated Copilot answers. Both are optional
   locally — the app runs without them and logs what is disabled.

4. Initialize the ChromaDB evidence store (one-time setup for Case C-2041):

   ```bash
   python services/chroma_db.py
   ```

5. Train the PMI model (one-time; auto-triggered on first startup if absent). Prints hold-out MAE/RMSE/R² and the baseline comparison:

   ```bash
   python train_model.py
   ```

6. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

The backend runs at **`http://localhost:8000`**.
Swagger docs: **`/docs`** · liveness: **`/health`** · readiness: **`/ready`**

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

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the Vite development server    |
| `npm run build`     | Build the production bundle          |
| `npm run preview`   | Preview the production build locally |
| `npm run lint`      | Run ESLint on the codebase           |
| `npm run typecheck` | Type-check with `tsc --noEmit`       |
| `npm run format`    | Auto-format code with Prettier       |

### Deploying

The production bundle is a static SPA with **no dev proxy**, so the API origin must
be supplied at build time:

```bash
VITE_API_BASE_URL=https://your-api-host npm run build
```

Set `ADMIN_API_KEY` and a restrictive `CORS_ORIGINS` on the backend before exposing it.

---

## Security & Operational Posture

| Concern             | Handling                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication**  | `X-API-Key` (`ADMIN_API_KEY`) guards `POST /api/pmi/train` and the CCTV upload endpoints. Unset locally for convenience; startup logs a warning so the gap is never silent. |
| **Rate limiting**   | `slowapi`, per-IP. Expensive routes (training, CCTV, Copilot) get a tighter bucket than read endpoints.                                                                     |
| **CORS**            | Explicit origin allow-list from `CORS_ORIGINS`. Not `*`.                                                                                                                    |
| **Error responses** | Handlers log internally and return generic messages — no exception strings or filesystem paths reach the client.                                                            |
| **Input bounds**    | Pagination, search result counts, upload size, and every numeric field are bounded at the schema level.                                                                     |
| **Concurrency**     | The PMI model is swapped under a lock; a second concurrent retrain is rejected with `409` rather than corrupting state.                                                     |
| **Blocking work**   | OpenCV analysis runs in a worker thread, not on the event loop.                                                                                                             |

---

## Known Limitations

Stated plainly rather than hidden:

- The PMI label is a **proxy standard** derived from vitreous potassium; there is
  no ground-truth PMI in the dataset. See the caveats under
  [PMI Prediction Engine](#pmi-prediction-engine-deep-dive).
- The dataset's forensic columns are **synthetic**, so hold-out R² is optimistic.
- The case timeline and movement fixtures cover **one case (C-2041)**; other case
  ids correctly return `404` rather than pretending to have data.
- Several dashboard counters are **demo fixtures**, flagged as such by the
  `fixture_counters` field on `/api/stats` and labelled in the UI.
- The CCTV analyser is classical computer vision (HOG + colour/motion
  heuristics), not a trained detector.
- Settings is a placeholder screen.

---

## Disclaimer

Watson-Board is an investigative **support tool** designed to assist forensic professionals. It is **not** a replacement for qualified forensic experts, medical examiners, pathologists, or legal authorities.

All system outputs — including PMI estimates, AI-generated insights, CCTV descriptions, and evidence correlations — are probabilistic in nature and must be independently verified by qualified human professionals before being used to inform any legal, investigative, or official decision.

The developers of Watson-Board assume no liability for decisions made on the basis of system outputs without appropriate expert review.
