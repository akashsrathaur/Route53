import random
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import HostedZone, DnsRecord, HealthCheck
from ..schemas import DashboardStatsResponse, QueryVolumePoint

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_zones = db.query(HostedZone).count()
    public_zones = db.query(HostedZone).filter(HostedZone.type == "PUBLIC").count()
    private_zones = db.query(HostedZone).filter(HostedZone.type == "PRIVATE").count()
    total_records = db.query(DnsRecord).count()

    total_checks = db.query(HealthCheck).count()
    healthy_checks = db.query(HealthCheck).filter(HealthCheck.status == "HEALTHY").count()
    unhealthy_checks = db.query(HealthCheck).filter(HealthCheck.status == "UNHEALTHY").count()

    # Generate 24h query volume mock data series
    query_points = []
    base_time = datetime.now(timezone.utc) - timedelta(hours=24)
    base_volume = max(12000, total_records * 450)

    for h in range(24):
        t = base_time + timedelta(hours=h)
        # Hour of day variation
        hour_factor = 1.0 + 0.4 * (1.0 if 8 <= t.hour <= 20 else 0.5)
        jitter = random.randint(-800, 1200)
        point_volume = int((base_volume / 24) * hour_factor + jitter)

        query_points.append(
            QueryVolumePoint(
                timestamp=t.strftime("%H:00"),
                queries=max(200, point_volume),
            )
        )

    return DashboardStatsResponse(
        total_hosted_zones=total_zones,
        public_zones=public_zones,
        private_zones=private_zones,
        total_records=total_records,
        total_health_checks=total_checks,
        healthy_checks=healthy_checks,
        unhealthy_checks=unhealthy_checks,
        total_traffic_policies=3,
        total_domains=8,
        query_volume_24h=query_points,
    )
