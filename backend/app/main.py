from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, SessionLocal
from .seed import seed_initial_data
from .routers import auth, hosted_zones, records, export, dns_tester, health_checks, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    # Seed initial data
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="AWS Route 53 Clone API",
    description="Full-stack AWS Route 53 compatible REST API supporting Hosted Zones, DNS Records, BIND imports, query simulation, and health checks.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(hosted_zones.router)
app.include_router(records.router)
app.include_router(export.router)
app.include_router(dns_tester.router)
app.include_router(health_checks.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {
        "service": "AWS Route 53 Clone Backend",
        "status": "online",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}
