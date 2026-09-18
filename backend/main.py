"""Watson-Board backend application entrypoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from config import settings
from routers import case_router, cctv_router, copilot_router, pmi_router
from security import limiter

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("watson_board")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup/shutdown hooks.

    Replaces the deprecated `@app.on_event("startup")`, and warms the expensive
    singletons (PMI model, Chroma client) once at boot instead of per request.
    """
    logger.info("Watson-Board Command Backend starting up (env=%s)", settings.environment)

    from routers.pmi_router import load_model

    try:
        load_model()
    except Exception as exc:
        logger.warning("PMI model warm-up skipped: %s", exc)

    try:
        from services.chroma_db import get_collection

        logger.info("Evidence corpus: %d documents indexed", get_collection().count())
    except Exception as exc:
        logger.warning("Evidence corpus unavailable at startup: %s", exc)

    if not settings.admin_api_key:
        logger.warning(
            "ADMIN_API_KEY is not set - /api/pmi/train and /api/cctv/* are UNPROTECTED. "
            "Set it before deploying."
        )
    if not settings.copilot_enabled:
        logger.info("ANTHROPIC_API_KEY not set - Copilot runs in retrieval-only mode.")

    yield
    logger.info("Watson-Board Command Backend shutting down.")


app = FastAPI(
    title=settings.app_name,
    description=(
        "Forensic intelligence system - case management, PMI estimation, "
        "CCTV analysis and an evidence-grounded investigative copilot."
    ),
    version="3.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# Explicit origins. The original shipped allow_origins=["*"] together with
# allow_credentials=True - wide open, and a combination browsers reject.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": f"Rate limit exceeded: {exc.detail}"},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Log the detail internally; return a generic message to the client."""
    logger.error("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error."},
    )


app.include_router(case_router.router, prefix="/api", tags=["Cases"])
app.include_router(pmi_router.router, prefix="/api/pmi", tags=["PMI Prediction"])
app.include_router(cctv_router.router, prefix="/api/cctv", tags=["CCTV Analysis"])
app.include_router(copilot_router.router, prefix="/api/copilot", tags=["Copilot"])


@app.get("/", tags=["Meta"])
def read_root():
    return {
        "service": settings.app_name,
        "version": "3.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["Meta"])
def health():
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/ready", tags=["Meta"])
def ready():
    """Readiness probe - reports whether each subsystem is actually usable."""
    from routers.pmi_router import get_model
    from services.autopsy_service import autopsy_service

    try:
        from services.chroma_db import get_collection

        evidence_count = get_collection().count()
        evidence_ok = True
    except Exception:
        evidence_count, evidence_ok = 0, False

    checks = {
        "pmi_model": get_model() is not None,
        "dataset": autopsy_service.available,
        "evidence_corpus": evidence_ok and evidence_count > 0,
    }
    all_ok = all(checks.values())
    return JSONResponse(
        status_code=status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "ready" if all_ok else "degraded",
            "checks": checks,
            "evidence_documents": evidence_count,
            "copilot_mode": "rag" if settings.copilot_enabled else "retrieval_only",
        },
    )
