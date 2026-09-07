from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db, generate_route53_id
from ..models import HealthCheck
from ..schemas import HealthCheckCreate, HealthCheckResponse

router = APIRouter(prefix="/api/health-checks", tags=["Health Checks"])


@router.get("", response_model=List[HealthCheckResponse])
def list_health_checks(db: Session = Depends(get_db)):
    return db.query(HealthCheck).order_by(HealthCheck.created_at.desc()).all()


@router.post("", response_model=HealthCheckResponse, status_code=status.HTTP_201_CREATED)
def create_health_check(payload: HealthCheckCreate, db: Session = Depends(get_db)):
    hc = HealthCheck(
        id=generate_route53_id("H"),
        name=payload.name,
        protocol=payload.protocol.upper(),
        ip_or_domain=payload.ip_or_domain,
        port=payload.port or 443,
        path=payload.path or "/health",
        request_interval=payload.request_interval or 30,
        failure_threshold=payload.failure_threshold or 3,
        status="HEALTHY",
        inverted=payload.inverted or False,
    )
    db.add(hc)
    db.commit()
    db.refresh(hc)
    return hc


@router.post("/{health_check_id}/toggle-status", response_model=HealthCheckResponse)
def toggle_health_check_status(health_check_id: str, db: Session = Depends(get_db)):
    hc = db.query(HealthCheck).filter(HealthCheck.id == health_check_id).first()
    if not hc:
        raise HTTPException(status_code=404, detail="Health check not found")
    hc.status = "UNHEALTHY" if hc.status == "HEALTHY" else "HEALTHY"
    db.commit()
    db.refresh(hc)
    return hc


@router.delete("/{health_check_id}")
def delete_health_check(health_check_id: str, db: Session = Depends(get_db)):
    hc = db.query(HealthCheck).filter(HealthCheck.id == health_check_id).first()
    if not hc:
        raise HTTPException(status_code=404, detail="Health check not found")
    db.delete(hc)
    db.commit()
    return {"message": f"Health check {health_check_id} deleted successfully"}
