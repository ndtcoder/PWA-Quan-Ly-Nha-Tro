import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.middleware.logging import LoggingMiddleware
from app.middleware.security import SecurityHeadersMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("app")

# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting Rental Management API v1.0.0")
    logger.info(f"Environment: {settings.ENVIRONMENT}")

    if settings.ENVIRONMENT != "test":
        from app.cron.scheduler import scheduler, setup_scheduler

        setup_scheduler()
        scheduler.start()
        logger.info("Scheduler started")
        yield
        scheduler.shutdown()
    else:
        yield

    logger.info("Shutting down Rental Management API")


app = FastAPI(title="Rental Management API", version="1.0.0", lifespan=lifespan)

# Attach limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Logging middleware
app.add_middleware(LoggingMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


# API v1 router placeholder
from fastapi import APIRouter

api_v1_router = APIRouter(prefix="/api/v1")


@api_v1_router.get("/ping")
async def ping():
    return {"message": "pong"}


# Register routers
from app.routers.auth import router as auth_router
from app.routers.properties import router as properties_router
from app.routers.properties import units_router
from app.routers.renters import router as renters_router
from app.routers.contracts import router as contracts_router
from app.routers.staff import router as staff_router
from app.routers.tasks import router as tasks_router
from app.routers.invoices import router as invoices_router
from app.routers.meters import router as meters_router
from app.routers.maintenance import router as maintenance_router
from app.routers.maintenance import properties_maintenance_router
from app.routers.notifications import router as notifications_router
from app.routers.push import router as push_router
from app.routers.reports import router as reports_router

api_v1_router.include_router(auth_router)
api_v1_router.include_router(properties_router)
api_v1_router.include_router(units_router)
api_v1_router.include_router(renters_router)
api_v1_router.include_router(contracts_router)
api_v1_router.include_router(staff_router)
api_v1_router.include_router(tasks_router)
api_v1_router.include_router(invoices_router)
api_v1_router.include_router(meters_router)
api_v1_router.include_router(maintenance_router)
api_v1_router.include_router(properties_maintenance_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(push_router)
api_v1_router.include_router(reports_router)

app.include_router(api_v1_router)
