import json
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base, generate_route53_id


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: generate_route53_id("U"))
    username = Column(String, unique=True, nullable=False)
    email = Column(String, nullable=False)
    role = Column(String, default="AdministratorAccess")
    account_id = Column(String, default="4920-3184-9102")
    account_alias = Column(String, default="aws-prod-admin")
    avatar_color = Column(String, default="#EC7211")
    created_at = Column(DateTime, default=utc_now)


class HostedZone(Base):
    __tablename__ = "hosted_zones"

    id = Column(String, primary_key=True, default=lambda: generate_route53_id("Z"))
    name = Column(String, nullable=False, index=True)
    description = Column(String, default="")
    type = Column(String, default="PUBLIC")  # PUBLIC or PRIVATE
    vpc_id = Column(String, nullable=True)
    vpc_region = Column(String, nullable=True)
    comment = Column(Text, nullable=True)
    caller_reference = Column(String, nullable=True)
    record_count = Column(Integer, default=2)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    records = relationship("DnsRecord", back_populates="hosted_zone", cascade="all, delete-orphan")
    tags = relationship("ResourceTag", primaryjoin="and_(ResourceTag.resource_id==HostedZone.id, ResourceTag.resource_type=='HOSTED_ZONE')", cascade="all, delete-orphan", foreign_keys="[ResourceTag.resource_id]")


class DnsRecord(Base):
    __tablename__ = "dns_records"

    id = Column(String, primary_key=True, default=lambda: generate_route53_id("R"))
    hosted_zone_id = Column(String, ForeignKey("hosted_zones.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False, index=True)  # A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA, SOA
    ttl = Column(Integer, default=300)
    values_json = Column(Text, default="[]")  # JSON string array of record values
    
    # Route 53 Alias capabilities
    is_alias = Column(Boolean, default=False)
    alias_target = Column(String, nullable=True)
    alias_target_type = Column(String, nullable=True)  # CloudFront, S3, ALB, Route53
    alias_evaluate_target_health = Column(Boolean, default=False)

    # Routing Policies
    routing_policy = Column(String, default="SIMPLE")  # SIMPLE, WEIGHTED, GEOLOCATION, LATENCY, FAILOVER, MULTIVALUE
    weight = Column(Integer, nullable=True)
    set_identifier = Column(String, nullable=True)
    geo_location = Column(String, nullable=True)
    latency_region = Column(String, nullable=True)
    failover_role = Column(String, nullable=True)  # PRIMARY, SECONDARY
    health_check_id = Column(String, nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    hosted_zone = relationship("HostedZone", back_populates="records")

    @property
    def values(self):
        try:
            return json.loads(self.values_json)
        except Exception:
            return []

    @values.setter
    def values(self, val_list):
        if isinstance(val_list, list):
            self.values_json = json.dumps(val_list)
        elif isinstance(val_list, str):
            # Split lines if newline separated
            lines = [line.strip() for line in val_list.strip().split("\n") if line.strip()]
            self.values_json = json.dumps(lines)
        else:
            self.values_json = json.dumps([])


class ResourceTag(Base):
    __tablename__ = "resource_tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    resource_type = Column(String, nullable=False)  # HOSTED_ZONE, HEALTH_CHECK
    resource_id = Column(String, nullable=False, index=True)
    key = Column(String, nullable=False)
    value = Column(String, default="")


class HealthCheck(Base):
    __tablename__ = "health_checks"

    id = Column(String, primary_key=True, default=lambda: generate_route53_id("H"))
    name = Column(String, nullable=False)
    protocol = Column(String, default="HTTPS")  # HTTP, HTTPS, TCP
    ip_or_domain = Column(String, nullable=False)
    port = Column(Integer, default=443)
    path = Column(String, default="/health")
    request_interval = Column(Integer, default=30)  # seconds (10 or 30)
    failure_threshold = Column(Integer, default=3)  # 1 to 10
    status = Column(String, default="HEALTHY")  # HEALTHY, UNHEALTHY, UNKNOWN
    inverted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
