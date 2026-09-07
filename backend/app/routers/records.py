import ipaddress
import re
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db, generate_route53_id
from ..models import HostedZone, DnsRecord
from ..schemas import (
    DnsRecordCreate,
    DnsRecordUpdate,
    DnsRecordResponse,
    BatchRecordCreate,
    BatchDeleteRequest,
    BindImportRequest,
    BindImportResponse,
)

router = APIRouter(prefix="/api/hosted-zones/{zone_id}/records", tags=["DNS Records"])


def normalize_record_name(name: str, zone_name: str) -> str:
    """Normalize record name to ensure fully qualified domain name ending with a dot."""
    name = name.strip()
    zone_clean = zone_name.rstrip(".")

    if name == "" or name == "@" or name == zone_name or name == f"{zone_clean}.":
        return f"{zone_clean}."

    if name.endswith("."):
        return name

    # If it's a subdomain like "www" or "api"
    if not name.endswith(zone_clean):
        return f"{name}.{zone_clean}."

    return f"{name}."


def validate_record_values(record_type: str, values: List[str], is_alias: bool = False, alias_target: Optional[str] = None):
    """Validate DNS record values according to RFC specifications."""
    if is_alias:
        if not alias_target or not alias_target.strip():
            raise HTTPException(
                status_code=400,
                detail="Alias target endpoint is required when Alias is enabled."
            )
        return

    if not values or len(values) == 0:
        raise HTTPException(
            status_code=400,
            detail=f"At least one value is required for {record_type} record."
        )

    for val in values:
        v = val.strip()
        if not v:
            continue

        if record_type == "A":
            try:
                ip = ipaddress.IPv4Address(v)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid IPv4 address '{v}' for A record."
                )

        elif record_type == "AAAA":
            try:
                ip = ipaddress.IPv6Address(v)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid IPv6 address '{v}' for AAAA record."
                )

        elif record_type == "CNAME":
            # CNAME value must be a valid hostname, not an IP address
            try:
                ipaddress.ip_address(v)
                raise HTTPException(
                    status_code=400,
                    detail=f"CNAME record value '{v}' cannot be an IP address. Must be a domain name (e.g., target.example.com.)."
                )
            except ValueError:
                pass  # Good, not an IP

        elif record_type == "MX":
            # Must have format: <priority> <mail-server>
            parts = v.split()
            if len(parts) != 2 or not parts[0].isdigit():
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid MX record '{v}'. Format must be '<priority> <mail-server>' (e.g., '10 mail.example.com.')."
                )

        elif record_type == "SRV":
            # Format: <priority> <weight> <port> <target>
            parts = v.split()
            if len(parts) != 4 or not (parts[0].isdigit() and parts[1].isdigit() and parts[2].isdigit()):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid SRV record '{v}'. Format must be '<priority> <weight> <port> <target>' (e.g., '10 5 5060 sip.example.com.')."
                )

        elif record_type == "CAA":
            # Format: <flags> <tag> "<value>"
            parts = v.split(maxsplit=2)
            if len(parts) < 3 or not parts[0].isdigit():
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid CAA record '{v}'. Format must be '<flags> <tag> \"<value>\"' (e.g., '0 issue \"letsencrypt.org\"')."
                )


def parse_values_input(values: Union[List[str], str]) -> List[str]:
    """Parse list or multi-line string into cleaned list of non-empty strings."""
    if isinstance(values, list):
        return [v.strip() for v in values if isinstance(v, str) and v.strip()]
    elif isinstance(values, str):
        return [v.strip() for v in values.split("\n") if v.strip()]
    return []


@router.get("", response_model=List[DnsRecordResponse])
def list_records(
    zone_id: str,
    search: Optional[str] = None,
    type: Optional[str] = Query(None, description="Record type filter (A, CNAME, etc.)"),
    routing_policy: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail=f"Hosted zone {zone_id} not found")

    query = db.query(DnsRecord).filter(DnsRecord.hosted_zone_id == zone_id)

    if search:
        pattern = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                DnsRecord.name.ilike(pattern),
                DnsRecord.values_json.ilike(pattern),
                DnsRecord.alias_target.ilike(pattern),
                DnsRecord.id.ilike(pattern),
            )
        )

    if type and type.upper() != "ALL":
        query = query.filter(DnsRecord.type == type.upper())

    if routing_policy and routing_policy.upper() != "ALL":
        query = query.filter(DnsRecord.routing_policy == routing_policy.upper())

    records = query.order_by(DnsRecord.name.asc(), DnsRecord.type.asc()).offset(skip).limit(limit).all()

    return [
        DnsRecordResponse(
            id=r.id,
            hosted_zone_id=r.hosted_zone_id,
            name=r.name,
            type=r.type,
            ttl=r.ttl,
            values=r.values,
            is_alias=r.is_alias or False,
            alias_target=r.alias_target,
            alias_target_type=r.alias_target_type,
            alias_evaluate_target_health=r.alias_evaluate_target_health or False,
            routing_policy=r.routing_policy or "SIMPLE",
            weight=r.weight,
            set_identifier=r.set_identifier,
            geo_location=r.geo_location,
            latency_region=r.latency_region,
            failover_role=r.failover_role,
            health_check_id=r.health_check_id,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in records
    ]


@router.post("", response_model=DnsRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    zone_id: str,
    payload: DnsRecordCreate,
    db: Session = Depends(get_db),
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail=f"Hosted zone {zone_id} not found")

    full_name = normalize_record_name(payload.name, zone.name)
    val_list = parse_values_input(payload.values)

    validate_record_values(
        payload.type,
        val_list,
        is_alias=payload.is_alias or False,
        alias_target=payload.alias_target,
    )

    # Check for CNAME duplicate collision or conflicting records
    if payload.type == "CNAME":
        existing_other = db.query(DnsRecord).filter(
            DnsRecord.hosted_zone_id == zone_id,
            DnsRecord.name == full_name,
            DnsRecord.type != "CNAME"
        ).first()
        if existing_other:
            raise HTTPException(
                status_code=400,
                detail=f"InvalidChange: A CNAME record cannot coexist with other record types ({existing_other.type}) for the same name '{full_name}'."
            )

    # If simple routing, ensure no duplicate name + type
    if payload.routing_policy == "SIMPLE":
        existing_simple = db.query(DnsRecord).filter(
            DnsRecord.hosted_zone_id == zone_id,
            DnsRecord.name == full_name,
            DnsRecord.type == payload.type,
            DnsRecord.routing_policy == "SIMPLE"
        ).first()
        if existing_simple:
            raise HTTPException(
                status_code=400,
                detail=f"ConflictingRecordExists: A {payload.type} record for '{full_name}' already exists. Edit the existing record to add multiple values."
            )

    record_id = generate_route53_id("R")
    record = DnsRecord(
        id=record_id,
        hosted_zone_id=zone_id,
        name=full_name,
        type=payload.type,
        ttl=payload.ttl if payload.ttl is not None else 300,
        is_alias=payload.is_alias or False,
        alias_target=payload.alias_target if payload.is_alias else None,
        alias_target_type=payload.alias_target_type if payload.is_alias else None,
        alias_evaluate_target_health=payload.alias_evaluate_target_health if payload.is_alias else False,
        routing_policy=payload.routing_policy or "SIMPLE",
        weight=payload.weight if payload.routing_policy == "WEIGHTED" else None,
        set_identifier=payload.set_identifier,
        geo_location=payload.geo_location if payload.routing_policy == "GEOLOCATION" else None,
        latency_region=payload.latency_region if payload.routing_policy == "LATENCY" else None,
        failover_role=payload.failover_role if payload.routing_policy == "FAILOVER" else None,
        health_check_id=payload.health_check_id,
    )
    record.values = val_list
    db.add(record)

    # Update zone record count
    zone.record_count = db.query(DnsRecord).filter(DnsRecord.hosted_zone_id == zone_id).count() + 1
    db.commit()
    db.refresh(record)

    return DnsRecordResponse(
        id=record.id,
        hosted_zone_id=record.hosted_zone_id,
        name=record.name,
        type=record.type,
        ttl=record.ttl,
        values=record.values,
        is_alias=record.is_alias or False,
        alias_target=record.alias_target,
        alias_target_type=record.alias_target_type,
        alias_evaluate_target_health=record.alias_evaluate_target_health or False,
        routing_policy=record.routing_policy or "SIMPLE",
        weight=record.weight,
        set_identifier=record.set_identifier,
        geo_location=record.geo_location,
        latency_region=record.latency_region,
        failover_role=record.failover_role,
        health_check_id=record.health_check_id,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.post("/batch", response_model=List[DnsRecordResponse])
def batch_create_records(
    zone_id: str,
    payload: BatchRecordCreate,
    db: Session = Depends(get_db),
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail=f"Hosted zone {zone_id} not found")

    created_records = []
    for item in payload.records:
        full_name = normalize_record_name(item.name, zone.name)
        val_list = parse_values_input(item.values)
        validate_record_values(item.type, val_list, is_alias=item.is_alias or False, alias_target=item.alias_target)

        record_id = generate_route53_id("R")
        record = DnsRecord(
            id=record_id,
            hosted_zone_id=zone_id,
            name=full_name,
            type=item.type,
            ttl=item.ttl if item.ttl is not None else 300,
            is_alias=item.is_alias or False,
            alias_target=item.alias_target if item.is_alias else None,
            alias_target_type=item.alias_target_type if item.is_alias else None,
            alias_evaluate_target_health=item.alias_evaluate_target_health if item.is_alias else False,
            routing_policy=item.routing_policy or "SIMPLE",
            weight=item.weight,
            set_identifier=item.set_identifier,
            geo_location=item.geo_location,
            latency_region=item.latency_region,
            failover_role=item.failover_role,
            health_check_id=item.health_check_id,
        )
        record.values = val_list
        db.add(record)
        created_records.append(record)

    db.commit()
    zone.record_count = db.query(DnsRecord).filter(DnsRecord.hosted_zone_id == zone_id).count()
    db.commit()

    return [
        DnsRecordResponse(
            id=r.id,
            hosted_zone_id=r.hosted_zone_id,
            name=r.name,
            type=r.type,
            ttl=r.ttl,
            values=r.values,
            is_alias=r.is_alias or False,
            alias_target=r.alias_target,
            alias_target_type=r.alias_target_type,
            alias_evaluate_target_health=r.alias_evaluate_target_health or False,
            routing_policy=r.routing_policy or "SIMPLE",
            weight=r.weight,
            set_identifier=r.set_identifier,
            geo_location=r.geo_location,
            latency_region=r.latency_region,
            failover_role=r.failover_role,
            health_check_id=r.health_check_id,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in created_records
    ]


@router.post("/batch-delete")
def batch_delete_records(
    zone_id: str,
    payload: BatchDeleteRequest,
    db: Session = Depends(get_db),
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail=f"Hosted zone {zone_id} not found")

    deleted_count = 0
    for rec_id in payload.record_ids:
        record = db.query(DnsRecord).filter(
            DnsRecord.id == rec_id,
            DnsRecord.hosted_zone_id == zone_id
        ).first()
        if record:
            db.delete(record)
            deleted_count += 1

    db.commit()
    zone.record_count = db.query(DnsRecord).filter(DnsRecord.hosted_zone_id == zone_id).count()
    db.commit()

    return {"message": f"Successfully deleted {deleted_count} record(s)", "deleted_count": deleted_count}


@router.get("/{record_id}", response_model=DnsRecordResponse)
def get_record(zone_id: str, record_id: str, db: Session = Depends(get_db)):
    record = db.query(DnsRecord).filter(
        DnsRecord.id == record_id,
        DnsRecord.hosted_zone_id == zone_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Record {record_id} not found in hosted zone {zone_id}")

    return DnsRecordResponse(
        id=record.id,
        hosted_zone_id=record.hosted_zone_id,
        name=record.name,
        type=record.type,
        ttl=record.ttl,
        values=record.values,
        is_alias=record.is_alias or False,
        alias_target=record.alias_target,
        alias_target_type=record.alias_target_type,
        alias_evaluate_target_health=record.alias_evaluate_target_health or False,
        routing_policy=record.routing_policy or "SIMPLE",
        weight=record.weight,
        set_identifier=record.set_identifier,
        geo_location=record.geo_location,
        latency_region=record.latency_region,
        failover_role=record.failover_role,
        health_check_id=record.health_check_id,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.put("/{record_id}", response_model=DnsRecordResponse)
def update_record(
    zone_id: str,
    record_id: str,
    payload: DnsRecordUpdate,
    db: Session = Depends(get_db),
):
    record = db.query(DnsRecord).filter(
        DnsRecord.id == record_id,
        DnsRecord.hosted_zone_id == zone_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Record {record_id} not found in hosted zone {zone_id}")

    if payload.ttl is not None:
        record.ttl = payload.ttl

    if payload.values is not None:
        val_list = parse_values_input(payload.values)
        validate_record_values(
            record.type,
            val_list,
            is_alias=payload.is_alias if payload.is_alias is not None else record.is_alias,
            alias_target=payload.alias_target if payload.alias_target is not None else record.alias_target,
        )
        record.values = val_list

    if payload.is_alias is not None:
        record.is_alias = payload.is_alias
    if payload.alias_target is not None:
        record.alias_target = payload.alias_target
    if payload.alias_target_type is not None:
        record.alias_target_type = payload.alias_target_type
    if payload.alias_evaluate_target_health is not None:
        record.alias_evaluate_target_health = payload.alias_evaluate_target_health

    if payload.routing_policy is not None:
        record.routing_policy = payload.routing_policy
    if payload.weight is not None:
        record.weight = payload.weight
    if payload.set_identifier is not None:
        record.set_identifier = payload.set_identifier
    if payload.geo_location is not None:
        record.geo_location = payload.geo_location
    if payload.latency_region is not None:
        record.latency_region = payload.latency_region
    if payload.failover_role is not None:
        record.failover_role = payload.failover_role
    if payload.health_check_id is not None:
        record.health_check_id = payload.health_check_id

    db.commit()
    db.refresh(record)

    return DnsRecordResponse(
        id=record.id,
        hosted_zone_id=record.hosted_zone_id,
        name=record.name,
        type=record.type,
        ttl=record.ttl,
        values=record.values,
        is_alias=record.is_alias or False,
        alias_target=record.alias_target,
        alias_target_type=record.alias_target_type,
        alias_evaluate_target_health=record.alias_evaluate_target_health or False,
        routing_policy=record.routing_policy or "SIMPLE",
        weight=record.weight,
        set_identifier=record.set_identifier,
        geo_location=record.geo_location,
        latency_region=record.latency_region,
        failover_role=record.failover_role,
        health_check_id=record.health_check_id,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.delete("/{record_id}")
def delete_record(zone_id: str, record_id: str, db: Session = Depends(get_db)):
    record = db.query(DnsRecord).filter(
        DnsRecord.id == record_id,
        DnsRecord.hosted_zone_id == zone_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Record {record_id} not found in hosted zone {zone_id}")

    db.delete(record)
    db.commit()

    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if zone:
        zone.record_count = db.query(DnsRecord).filter(DnsRecord.hosted_zone_id == zone_id).count()
        db.commit()

    return {"message": f"Record {record_id} deleted successfully", "id": record_id}


@router.post("/import-bind", response_model=BindImportResponse)
def import_bind_zone_file(
    zone_id: str,
    payload: BindImportRequest,
    db: Session = Depends(get_db),
):
    """
    Parse RFC 1035 standard BIND zone file content ($ORIGIN, $TTL, IN records)
    and create DNS records in Route 53.
    """
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail=f"Hosted zone {zone_id} not found")

    lines = payload.zone_content.splitlines()
    origin = zone.name.rstrip(".") + "."
    current_ttl = 300
    warnings = []
    imported_records = []

    # Map to group multiple values for the same record (e.g. multi-line A, NS, MX records)
    records_map = {}  # key: (name, type) -> {"ttl": ttl, "values": []}

    last_record_name = origin

    for line_num, line in enumerate(lines, 1):
        line = line.strip()
        # Skip empty lines or comments
        if not line or line.startswith(";"):
            continue

        # Strip inline comments
        if ";" in line:
            line = line.split(";", 1)[0].strip()

        # Directives
        if line.upper().startswith("$ORIGIN"):
            parts = line.split()
            if len(parts) > 1:
                origin = parts[1].strip()
                if not origin.endswith("."):
                    origin += "."
            continue

        if line.upper().startswith("$TTL"):
            parts = line.split()
            if len(parts) > 1 and parts[1].isdigit():
                current_ttl = int(parts[1])
            continue

        # Parse Record line: [NAME] [TTL] [CLASS] TYPE RDATA
        tokens = line.split()
        if not tokens:
            continue

        name = None
        ttl = current_ttl
        rtype = None
        rdata_tokens = []

        # Find record type in tokens
        type_idx = -1
        for idx, token in enumerate(tokens):
            if token.upper() in ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"]:
                type_idx = idx
                rtype = token.upper()
                break

        if type_idx == -1:
            warnings.append(f"Line {line_num}: Could not determine supported DNS record type in '{line}'")
            continue

        # Tokens before type can be [name], [ttl], [IN]
        pre_tokens = tokens[:type_idx]
        rdata_tokens = tokens[type_idx + 1 :]

        if not pre_tokens:
            # Inherit previous record name
            name = last_record_name
        else:
            # Check for IN or TTL in pre_tokens
            clean_pre = []
            for t in pre_tokens:
                if t.upper() == "IN":
                    continue
                elif t.isdigit():
                    ttl = int(t)
                else:
                    clean_pre.append(t)

            if clean_pre:
                raw_name = clean_pre[0]
                if raw_name == "@":
                    name = origin
                elif raw_name.endswith("."):
                    name = raw_name
                else:
                    name = f"{raw_name}.{origin}"
            else:
                name = last_record_name

        last_record_name = name
        rdata_str = " ".join(rdata_tokens).strip()

        # Normalization
        full_rec_name = normalize_record_name(name, zone.name)
        key = (full_rec_name, rtype)

        if key not in records_map:
            records_map[key] = {"ttl": ttl, "values": []}

        if rdata_str not in records_map[key]["values"]:
            records_map[key]["values"].append(rdata_str)

    # Now create or update records in SQLite
    for (rec_name, rec_type), data in records_map.items():
        # Check if already exists
        existing = db.query(DnsRecord).filter(
            DnsRecord.hosted_zone_id == zone_id,
            DnsRecord.name == rec_name,
            DnsRecord.type == rec_type,
        ).first()

        if existing:
            # Append new values
            existing_vals = set(existing.values)
            for v in data["values"]:
                existing_vals.add(v)
            existing.values = list(existing_vals)
            existing.ttl = data["ttl"]
            imported_records.append(existing)
        else:
            new_rec = DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone_id,
                name=rec_name,
                type=rec_type,
                ttl=data["ttl"],
                routing_policy="SIMPLE",
            )
            new_rec.values = data["values"]
            db.add(new_rec)
            imported_records.append(new_rec)

    db.commit()
    zone.record_count = db.query(DnsRecord).filter(DnsRecord.hosted_zone_id == zone_id).count()
    db.commit()

    return BindImportResponse(
        imported_count=len(imported_records),
        records=[
            DnsRecordResponse(
                id=r.id,
                hosted_zone_id=r.hosted_zone_id,
                name=r.name,
                type=r.type,
                ttl=r.ttl,
                values=r.values,
                is_alias=r.is_alias or False,
                alias_target=r.alias_target,
                alias_target_type=r.alias_target_type,
                alias_evaluate_target_health=r.alias_evaluate_target_health or False,
                routing_policy=r.routing_policy or "SIMPLE",
                weight=r.weight,
                set_identifier=r.set_identifier,
                geo_location=r.geo_location,
                latency_region=r.latency_region,
                failover_role=r.failover_role,
                health_check_id=r.health_check_id,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
            for r in imported_records
        ],
        warnings=warnings,
    )
