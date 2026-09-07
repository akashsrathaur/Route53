import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db, generate_route53_id
from ..models import HostedZone, DnsRecord, ResourceTag
from ..schemas import (
    HostedZoneCreate,
    HostedZoneUpdate,
    HostedZoneResponse,
    TagBase,
)

router = APIRouter(prefix="/api/hosted-zones", tags=["Hosted Zones"])


def create_default_ns_soa_records(db: Session, zone: HostedZone):
    """
    AWS Route 53 automatically creates 4 Name Server (NS) records
    and 1 Start of Authority (SOA) record upon Hosted Zone creation.
    """
    domain = zone.name if zone.name.endswith(".") else f"{zone.name}."
    random_id = random.randint(10, 99)

    # 4 distinct AWS Name Servers
    name_servers = [
        f"ns-{random_id + 1}.awsdns-{random_id % 64}.com.",
        f"ns-{random_id + 101}.awsdns-{(random_id + 12) % 64}.net.",
        f"ns-{random_id + 501}.awsdns-{(random_id + 24) % 64}.org.",
        f"ns-{random_id + 1001}.awsdns-{(random_id + 36) % 64}.co.uk.",
    ]

    primary_ns = name_servers[0]
    soa_value = f"{primary_ns} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"

    # Create NS Record
    ns_record = DnsRecord(
        id=generate_route53_id("R"),
        hosted_zone_id=zone.id,
        name=domain,
        type="NS",
        ttl=172800,  # 2 days in seconds (Route 53 standard NS default)
        routing_policy="SIMPLE",
    )
    ns_record.values = name_servers
    db.add(ns_record)

    # Create SOA Record
    soa_record = DnsRecord(
        id=generate_route53_id("R"),
        hosted_zone_id=zone.id,
        name=domain,
        type="SOA",
        ttl=900,  # 15 minutes (Route 53 standard SOA default)
        routing_policy="SIMPLE",
    )
    soa_record.values = [soa_value]
    db.add(soa_record)

    db.commit()


@router.get("", response_model=List[HostedZoneResponse])
def list_hosted_zones(
    search: Optional[str] = None,
    type: Optional[str] = Query(None, description="PUBLIC, PRIVATE, or ALL"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(HostedZone)

    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                HostedZone.name.ilike(search_pattern),
                HostedZone.id.ilike(search_pattern),
                HostedZone.description.ilike(search_pattern),
                HostedZone.comment.ilike(search_pattern),
            )
        )

    if type and type.upper() != "ALL":
        query = query.filter(HostedZone.type == type.upper())

    zones = query.order_by(HostedZone.created_at.desc()).offset(skip).limit(limit).all()

    # Build response with tags and dynamic record count
    results = []
    for zone in zones:
        actual_record_count = db.query(DnsRecord).filter(DnsRecord.hosted_zone_id == zone.id).count()
        tags = (
            db.query(ResourceTag)
            .filter(ResourceTag.resource_type == "HOSTED_ZONE", ResourceTag.resource_id == zone.id)
            .all()
        )
        tag_list = [TagBase(key=t.key, value=t.value) for t in tags]

        results.append(
            HostedZoneResponse(
                id=zone.id,
                name=zone.name,
                description=zone.description or "",
                type=zone.type,
                vpc_id=zone.vpc_id,
                vpc_region=zone.vpc_region,
                record_count=actual_record_count,
                comment=zone.comment,
                created_at=zone.created_at,
                updated_at=zone.updated_at,
                tags=tag_list,
            )
        )

    return results


@router.post("", response_model=HostedZoneResponse, status_code=status.HTTP_201_CREATED)
def create_hosted_zone(payload: HostedZoneCreate, db: Session = Depends(get_db)):
    domain_name = payload.name.strip()
    if not domain_name.endswith("."):
        domain_name += "."

    # Check for duplicate domain name in same type
    existing = db.query(HostedZone).filter(HostedZone.name == domain_name, HostedZone.type == payload.type.upper()).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"ConflictingDomainExists: A hosted zone for {domain_name} ({payload.type}) already exists with ID {existing.id}."
        )

    zone_id = generate_route53_id("Z")
    zone = HostedZone(
        id=zone_id,
        name=domain_name,
        description=payload.description or "",
        type=payload.type.upper(),
        vpc_id=payload.vpc_id if payload.type.upper() == "PRIVATE" else None,
        vpc_region=payload.vpc_region if payload.type.upper() == "PRIVATE" else None,
        comment=payload.comment,
        record_count=2,
    )
    db.add(zone)
    db.commit()
    db.refresh(zone)

    # Save tags
    tag_list = []
    if payload.tags:
        for tag_item in payload.tags:
            if tag_item.key.strip():
                tag = ResourceTag(
                    resource_type="HOSTED_ZONE",
                    resource_id=zone.id,
                    key=tag_item.key.strip(),
                    value=tag_item.value.strip(),
                )
                db.add(tag)
                tag_list.append(TagBase(key=tag_item.key.strip(), value=tag_item.value.strip()))
        db.commit()

    # Automatically create Route 53 standard SOA and 4 NS records
    create_default_ns_soa_records(db, zone)

    return HostedZoneResponse(
        id=zone.id,
        name=zone.name,
        description=zone.description or "",
        type=zone.type,
        vpc_id=zone.vpc_id,
        vpc_region=zone.vpc_region,
        record_count=2,
        comment=zone.comment,
        created_at=zone.created_at,
        updated_at=zone.updated_at,
        tags=tag_list,
    )


@router.get("/{zone_id}", response_model=HostedZoneResponse)
def get_hosted_zone(zone_id: str, db: Session = Depends(get_db)):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail=f"NoSuchHostedZone: No hosted zone found with ID {zone_id}")

    actual_record_count = db.query(DnsRecord).filter(DnsRecord.hosted_zone_id == zone.id).count()
    tags = (
        db.query(ResourceTag)
        .filter(ResourceTag.resource_type == "HOSTED_ZONE", ResourceTag.resource_id == zone.id)
        .all()
    )
    tag_list = [TagBase(key=t.key, value=t.value) for t in tags]

    return HostedZoneResponse(
        id=zone.id,
        name=zone.name,
        description=zone.description or "",
        type=zone.type,
        vpc_id=zone.vpc_id,
        vpc_region=zone.vpc_region,
        record_count=actual_record_count,
        comment=zone.comment,
        created_at=zone.created_at,
        updated_at=zone.updated_at,
        tags=tag_list,
    )


@router.put("/{zone_id}", response_model=HostedZoneResponse)
def update_hosted_zone(zone_id: str, payload: HostedZoneUpdate, db: Session = Depends(get_db)):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail=f"NoSuchHostedZone: No hosted zone found with ID {zone_id}")

    if payload.description is not None:
        zone.description = payload.description
    if payload.comment is not None:
        zone.comment = payload.comment

    if payload.tags is not None:
        # Replace existing tags
        db.query(ResourceTag).filter(
            ResourceTag.resource_type == "HOSTED_ZONE", ResourceTag.resource_id == zone.id
        ).delete()

        for tag_item in payload.tags:
            if tag_item.key.strip():
                tag = ResourceTag(
                    resource_type="HOSTED_ZONE",
                    resource_id=zone.id,
                    key=tag_item.key.strip(),
                    value=tag_item.value.strip(),
                )
                db.add(tag)

    db.commit()
    db.refresh(zone)

    actual_record_count = db.query(DnsRecord).filter(DnsRecord.hosted_zone_id == zone.id).count()
    tags = (
        db.query(ResourceTag)
        .filter(ResourceTag.resource_type == "HOSTED_ZONE", ResourceTag.resource_id == zone.id)
        .all()
    )
    tag_list = [TagBase(key=t.key, value=t.value) for t in tags]

    return HostedZoneResponse(
        id=zone.id,
        name=zone.name,
        description=zone.description or "",
        type=zone.type,
        vpc_id=zone.vpc_id,
        vpc_region=zone.vpc_region,
        record_count=actual_record_count,
        comment=zone.comment,
        created_at=zone.created_at,
        updated_at=zone.updated_at,
        tags=tag_list,
    )


@router.delete("/{zone_id}")
def delete_hosted_zone(
    zone_id: str,
    force: bool = Query(False, description="Force delete even if custom records exist"),
    db: Session = Depends(get_db),
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail=f"NoSuchHostedZone: No hosted zone found with ID {zone_id}")

    # Check non-default records if not force
    records = db.query(DnsRecord).filter(DnsRecord.hosted_zone_id == zone.id).all()
    custom_records = [
        r for r in records
        if not (r.type in ("NS", "SOA") and r.name == zone.name)
    ]

    if custom_records and not force:
        raise HTTPException(
            status_code=400,
            detail=f"HostedZoneNotEmpty: The hosted zone '{zone.name}' contains {len(custom_records)} non-default record(s). Delete all custom records first or enable force delete."
        )

    # Delete records, tags, and zone
    db.query(DnsRecord).filter(DnsRecord.hosted_zone_id == zone.id).delete()
    db.query(ResourceTag).filter(
        ResourceTag.resource_type == "HOSTED_ZONE", ResourceTag.resource_id == zone.id
    ).delete()
    db.delete(zone)
    db.commit()

    return {"message": f"Hosted zone {zone_id} deleted successfully", "id": zone_id}
