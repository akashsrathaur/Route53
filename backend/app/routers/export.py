from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse, JSONResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import HostedZone, DnsRecord
from ..schemas import DnsRecordResponse

router = APIRouter(prefix="/api/hosted-zones/{zone_id}/export", tags=["Export"])


@router.get("")
def export_hosted_zone(
    zone_id: str,
    format: str = Query("bind", description="bind or json"),
    db: Session = Depends(get_db),
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail=f"Hosted zone {zone_id} not found")

    records = db.query(DnsRecord).filter(DnsRecord.hosted_zone_id == zone_id).all()

    if format.lower() == "json":
        data = {
            "hosted_zone": {
                "id": zone.id,
                "name": zone.name,
                "type": zone.type,
                "description": zone.description,
                "exported_at": datetime.now(timezone.utc).isoformat(),
            },
            "records": [
                {
                    "id": r.id,
                    "name": r.name,
                    "type": r.type,
                    "ttl": r.ttl,
                    "values": r.values,
                    "is_alias": r.is_alias,
                    "alias_target": r.alias_target,
                    "routing_policy": r.routing_policy,
                    "weight": r.weight,
                }
                for r in records
            ],
        }
        return JSONResponse(
            content=data,
            headers={
                "Content-Disposition": f'attachment; filename="{zone.name.rstrip(".")}_route53_export.json"'
            },
        )

    # Generate RFC 1035 BIND Zone File
    zone_name = zone.name if zone.name.endswith(".") else f"{zone.name}."
    bind_lines = [
        f"; Zone file exported from AWS Route 53 Clone",
        f"; Zone: {zone_name} (ID: {zone.id})",
        f"; Export Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"$ORIGIN {zone_name}",
        f"$TTL 300",
        "",
    ]

    for r in records:
        rec_name = r.name
        if r.is_alias:
            # Route53 Alias representation in zone file
            bind_lines.append(
                f"{rec_name:<30} {r.ttl:<8} IN  {r.type:<6} ; ALIAS to {r.alias_target}"
            )
            continue

        for val in r.values:
            # Clean quotes for TXT
            val_fmt = val
            if r.type == "TXT" and not (val.startswith('"') and val.endswith('"')):
                val_fmt = f'"{val}"'

            bind_lines.append(f"{rec_name:<30} {r.ttl:<8} IN  {r.type:<6} {val_fmt}")

    bind_content = "\n".join(bind_lines) + "\n"

    return PlainTextResponse(
        content=bind_content,
        media_type="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="{zone.name.rstrip(".")}.zone"'
        },
    )
