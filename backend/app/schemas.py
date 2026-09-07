import re
from datetime import datetime
from typing import List, Optional, Union
from pydantic import BaseModel, Field, field_validator, ConfigDict


# Tag Schemas
class TagBase(BaseModel):
    key: str
    value: str = ""


class TagCreate(TagBase):
    pass


class TagResponse(TagBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# Hosted Zone Schemas
class HostedZoneCreate(BaseModel):
    name: str = Field(..., description="Domain name (e.g., example.com)")
    description: Optional[str] = ""
    type: str = Field("PUBLIC", description="PUBLIC or PRIVATE")
    vpc_id: Optional[str] = None
    vpc_region: Optional[str] = None
    comment: Optional[str] = None
    tags: Optional[List[TagBase]] = []

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        name = v.strip().lower()
        if not name:
            raise ValueError("Domain name cannot be empty")
        return name


class HostedZoneUpdate(BaseModel):
    description: Optional[str] = None
    comment: Optional[str] = None
    tags: Optional[List[TagBase]] = None


class HostedZoneResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    type: str
    vpc_id: Optional[str] = None
    vpc_region: Optional[str] = None
    record_count: int = 2
    comment: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    tags: List[TagBase] = []
    model_config = ConfigDict(from_attributes=True)


# DNS Record Schemas
RECORD_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA", "SOA"]
ROUTING_POLICIES = ["SIMPLE", "WEIGHTED", "GEOLOCATION", "LATENCY", "FAILOVER", "MULTIVALUE"]


class DnsRecordCreate(BaseModel):
    name: str = Field(..., description="Record name or subdomain (e.g., www.example.com. or www)")
    type: str = Field(..., description="DNS Record Type (A, CNAME, etc.)")
    ttl: Optional[int] = Field(300, ge=0, le=2147483647)
    values: Union[List[str], str] = Field(default=[], description="List of target values or newline-separated string")
    is_alias: Optional[bool] = False
    alias_target: Optional[str] = None
    alias_target_type: Optional[str] = None
    alias_evaluate_target_health: Optional[bool] = False
    routing_policy: Optional[str] = "SIMPLE"
    weight: Optional[int] = Field(None, ge=0, le=255)
    set_identifier: Optional[str] = None
    geo_location: Optional[str] = None
    latency_region: Optional[str] = None
    failover_role: Optional[str] = None
    health_check_id: Optional[str] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        v_upper = v.upper().strip()
        if v_upper not in RECORD_TYPES:
            raise ValueError(f"Invalid record type. Must be one of: {', '.join(RECORD_TYPES)}")
        return v_upper

    @field_validator("routing_policy")
    @classmethod
    def validate_policy(cls, v: Optional[str]) -> str:
        if not v:
            return "SIMPLE"
        v_upper = v.upper().strip()
        if v_upper not in ROUTING_POLICIES:
            raise ValueError(f"Invalid routing policy. Must be one of: {', '.join(ROUTING_POLICIES)}")
        return v_upper


class DnsRecordUpdate(BaseModel):
    ttl: Optional[int] = None
    values: Optional[Union[List[str], str]] = None
    is_alias: Optional[bool] = None
    alias_target: Optional[str] = None
    alias_target_type: Optional[str] = None
    alias_evaluate_target_health: Optional[bool] = None
    routing_policy: Optional[str] = None
    weight: Optional[int] = None
    set_identifier: Optional[str] = None
    geo_location: Optional[str] = None
    latency_region: Optional[str] = None
    failover_role: Optional[str] = None
    health_check_id: Optional[str] = None


class DnsRecordResponse(BaseModel):
    id: str
    hosted_zone_id: str
    name: str
    type: str
    ttl: int
    values: List[str]
    is_alias: bool = False
    alias_target: Optional[str] = None
    alias_target_type: Optional[str] = None
    alias_evaluate_target_health: bool = False
    routing_policy: str = "SIMPLE"
    weight: Optional[int] = None
    set_identifier: Optional[str] = None
    geo_location: Optional[str] = None
    latency_region: Optional[str] = None
    failover_role: Optional[str] = None
    health_check_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class BatchRecordCreate(BaseModel):
    records: List[DnsRecordCreate]


class BatchDeleteRequest(BaseModel):
    record_ids: List[str]


# BIND Import & Export
class BindImportRequest(BaseModel):
    zone_content: str


class BindImportResponse(BaseModel):
    imported_count: int
    records: List[DnsRecordResponse]
    warnings: List[str] = []


# DNS Test Simulation
class DnsTestRequest(BaseModel):
    record_name: str
    record_type: str = "A"
    resolver_ip: Optional[str] = "1.1.1.1"
    protocol: Optional[str] = "UDP"


class DnsTestResponse(BaseModel):
    record_name: str
    record_type: str
    status: str
    response_code: int
    answers: List[str]
    ttl: int
    nameserver: str
    query_time_ms: float
    timestamp: datetime
    raw_response: str


# Health Check Schemas
class HealthCheckCreate(BaseModel):
    name: str
    protocol: str = "HTTPS"
    ip_or_domain: str
    port: Optional[int] = 443
    path: Optional[str] = "/health"
    request_interval: Optional[int] = 30
    failure_threshold: Optional[int] = 3
    inverted: Optional[bool] = False


class HealthCheckResponse(BaseModel):
    id: str
    name: str
    protocol: str
    ip_or_domain: str
    port: int
    path: str
    request_interval: int
    failure_threshold: int
    status: str
    inverted: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# User / Auth Schemas
class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    account_id: str
    account_alias: str
    avatar_color: str
    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username: str
    password: Optional[str] = "password"


class SwitchUserRequest(BaseModel):
    role: Optional[str] = None
    account_id: Optional[str] = None


# Dashboard Stats
class QueryVolumePoint(BaseModel):
    timestamp: str
    queries: int


class DashboardStatsResponse(BaseModel):
    total_hosted_zones: int
    public_zones: int
    private_zones: int
    total_records: int
    total_health_checks: int
    healthy_checks: int
    unhealthy_checks: int
    total_traffic_policies: int = 3
    total_domains: int = 12
    query_volume_24h: List[QueryVolumePoint]
