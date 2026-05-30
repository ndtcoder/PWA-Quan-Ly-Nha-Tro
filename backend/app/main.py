from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Rental Management API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "*",
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

api_v1_router.include_router(auth_router)
api_v1_router.include_router(properties_router)
api_v1_router.include_router(units_router)

app.include_router(api_v1_router)
