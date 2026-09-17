from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import case_router, cctv_router, pmi_router
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("watson_board")

app = FastAPI(
    title="Watson-Board Command Backend API",
    description="Forensic intelligence system — Case management, PMI prediction, and CCTV analysis",
    version="2.0.0",
)

# Configure CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ────────────────────────────────────────────────────────
app.include_router(case_router.router, prefix="/api")
app.include_router(pmi_router.router, prefix="/api/pmi", tags=["PMI Prediction"])
app.include_router(cctv_router.router, prefix="/api/cctv", tags=["CCTV Analysis"])

@app.on_event("startup")
async def startup_event():
    logger.info("Watson-Board Command Backend starting up...")
    logger.info("  → Case management module: ACTIVE")
    logger.info("  → PMI prediction module: ACTIVE")
    logger.info("  → CCTV forensic analysis module: ACTIVE")

    # Auto-load PMI model on startup
    try:
        from routers.pmi_router import load_model
        load_model()
    except Exception as e:
        logger.warning(f"PMI model auto-load skipped: {e}")

@app.get("/")
def read_root():
    return {"message": "Watson-Board Command Backend is running. Access /docs for Swagger UI."}

