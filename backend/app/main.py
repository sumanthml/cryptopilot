"""FastAPI application entry point."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import init_db
from app.services.monitoring.live_threat_crawler import threat_crawler_scheduler_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Start 2-hour continuous threat crawler in the background
    crawler_task = asyncio.create_task(threat_crawler_scheduler_loop())
    yield
    crawler_task.cancel()
    try:
        await crawler_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="CryptoPilot API",
    description="Production-grade cryptographic analysis and modernization platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
from app.routers import auth, projects, scans, findings, risk, migrations, watch, cbom, reports, ai as ai_router, compliance  # noqa: E402

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api", tags=["projects"])
app.include_router(scans.router, prefix="/api", tags=["scans"])
app.include_router(findings.router, prefix="/api", tags=["findings"])
app.include_router(risk.router, prefix="/api", tags=["risk"])
app.include_router(migrations.router, prefix="/api", tags=["migrations"])
app.include_router(watch.router, prefix="/api/watch", tags=["watch"])
app.include_router(cbom.router, prefix="/api", tags=["cbom"])
app.include_router(compliance.router, prefix="/api", tags=["compliance"])
app.include_router(reports.router, prefix="/api", tags=["reports"])
app.include_router(ai_router.router, prefix="/api/ai", tags=["ai"])


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "CryptoPilot API", "version": "1.0.0"}
