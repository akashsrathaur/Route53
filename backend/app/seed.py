from sqlalchemy.orm import Session
from .database import generate_route53_id
from .models import User, HostedZone, DnsRecord, ResourceTag, HealthCheck
from .routers.hosted_zones import create_default_ns_soa_records


def seed_initial_data(db: Session):
    # 1. Seed Users if not present
    if db.query(User).count() == 0:
        users = [
            User(
                id="usr_root",
                username="root-account",
                email="aws-root@cloud-enterprise.io",
                role="AdministratorAccess",
                account_id="4920-3184-9102",
                account_alias="aws-prod-admin",
                avatar_color="#EC7211",
            ),
            User(
                id="usr_devops",
                username="alex.devops",
                email="alex.devops@cloud-enterprise.io",
                role="NetworkAdmin",
                account_id="4920-3184-9102",
                account_alias="aws-prod-admin",
                avatar_color="#2563EB",
            ),
            User(
                id="usr_readonly",
                username="sarah.auditor",
                email="sarah.auditor@cloud-enterprise.io",
                role="Route53ReadOnlyAccess",
                account_id="4920-3184-9102",
                account_alias="aws-prod-admin",
                avatar_color="#10B981",
            ),
        ]
        db.add_all(users)
        db.commit()

    # 2. Seed Hosted Zones if not present
    if db.query(HostedZone).count() == 0:
        # Zone 1: acme-corp.com (PUBLIC)
        zone1 = HostedZone(
            id="Z0234857201AC",
            name="acme-corp.com.",
            description="Production domain for Acme Corporation worldwide",
            type="PUBLIC",
            comment="Primary enterprise ingress & public APIs",
            record_count=10,
        )
        db.add(zone1)
        db.commit()

        # Generate default NS & SOA
        create_default_ns_soa_records(db, zone1)

        # Additional rich records for acme-corp.com
        recs_z1 = [
            DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone1.id,
                name="acme-corp.com.",
                type="A",
                ttl=300,
                is_alias=True,
                alias_target="d27g8v3x92.cloudfront.net.",
                alias_target_type="CloudFront distribution",
                routing_policy="SIMPLE",
            ),
            DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone1.id,
                name="www.acme-corp.com.",
                type="CNAME",
                ttl=300,
                routing_policy="SIMPLE",
            ),
            DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone1.id,
                name="api.acme-corp.com.",
                type="A",
                ttl=60,
                routing_policy="WEIGHTED",
                weight=80,
                set_identifier="api-blue-cluster",
            ),
            DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone1.id,
                name="api.acme-corp.com.",
                type="A",
                ttl=60,
                routing_policy="WEIGHTED",
                weight=20,
                set_identifier="api-canary-cluster",
            ),
            DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone1.id,
                name="mail.acme-corp.com.",
                type="MX",
                ttl=3600,
                routing_policy="SIMPLE",
            ),
            DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone1.id,
                name="acme-corp.com.",
                type="TXT",
                ttl=3600,
                routing_policy="SIMPLE",
            ),
            DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone1.id,
                name="_dmarc.acme-corp.com.",
                type="TXT",
                ttl=3600,
                routing_policy="SIMPLE",
            ),
            DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone1.id,
                name="acme-corp.com.",
                type="CAA",
                ttl=86400,
                routing_policy="SIMPLE",
            ),
            DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone1.id,
                name="_sip._tls.acme-corp.com.",
                type="SRV",
                ttl=3600,
                routing_policy="SIMPLE",
            ),
        ]

        recs_z1[0].values = []
        recs_z1[1].values = ["acme-corp.com."]
        recs_z1[2].values = ["198.51.100.24", "198.51.100.25"]
        recs_z1[3].values = ["198.51.100.99"]
        recs_z1[4].values = ["10 aspmx.l.google.com.", "20 alt1.aspmx.l.google.com."]
        recs_z1[5].values = ['"v=spf1 include:_spf.google.com include:amazonses.com ~all"']
        recs_z1[6].values = ['"v=DMARC1; p=reject; rua=mailto:dmarc@acme-corp.com"']
        recs_z1[7].values = ['0 issue "amazon.com"', '0 issue "letsencrypt.org"']
        recs_z1[8].values = ["10 50 5061 sipdir.online.lync.com."]

        db.add_all(recs_z1)

        # Tags for zone 1
        tags_z1 = [
            ResourceTag(resource_type="HOSTED_ZONE", resource_id=zone1.id, key="Environment", value="production"),
            ResourceTag(resource_type="HOSTED_ZONE", resource_id=zone1.id, key="Project", value="CorePlatform"),
            ResourceTag(resource_type="HOSTED_ZONE", resource_id=zone1.id, key="Owner", value="DevOpsTeam"),
        ]
        db.add_all(tags_z1)

        # Zone 2: internal.cloud.local (PRIVATE)
        zone2 = HostedZone(
            id="Z0891048293DF",
            name="internal.cloud.local.",
            description="Private DNS routing for production Kubernetes and database VPC",
            type="PRIVATE",
            vpc_id="vpc-01a9f4c3",
            vpc_region="us-east-1",
            comment="VPC peering private resolution",
            record_count=6,
        )
        db.add(zone2)
        db.commit()
        create_default_ns_soa_records(db, zone2)

        recs_z2 = [
            DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone2.id,
                name="postgres-master.internal.cloud.local.",
                type="A",
                ttl=60,
                routing_policy="SIMPLE",
            ),
            DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone2.id,
                name="redis-cache.internal.cloud.local.",
                type="A",
                ttl=60,
                routing_policy="SIMPLE",
            ),
            DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone2.id,
                name="vault.internal.cloud.local.",
                type="A",
                ttl=300,
                routing_policy="SIMPLE",
            ),
            DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone2.id,
                name="k8s-ingress.internal.cloud.local.",
                type="A",
                ttl=300,
                routing_policy="SIMPLE",
            ),
        ]
        recs_z2[0].values = ["10.0.12.45"]
        recs_z2[1].values = ["10.0.14.88", "10.0.14.89"]
        recs_z2[2].values = ["10.0.8.20"]
        recs_z2[3].values = ["10.0.1.100", "10.0.1.101"]
        db.add_all(recs_z2)

        tags_z2 = [
            ResourceTag(resource_type="HOSTED_ZONE", resource_id=zone2.id, key="Environment", value="internal"),
            ResourceTag(resource_type="HOSTED_ZONE", resource_id=zone2.id, key="SecurityZone", value="restricted"),
        ]
        db.add_all(tags_z2)

        # Zone 3: dev-sandbox.io (PUBLIC)
        zone3 = HostedZone(
            id="Z0471928475MN",
            name="dev-sandbox.io.",
            description="Developer staging and testing sandboxes",
            type="PUBLIC",
            comment="Ephemeral test environments",
            record_count=4,
        )
        db.add(zone3)
        db.commit()
        create_default_ns_soa_records(db, zone3)

        recs_z3 = [
            DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone3.id,
                name="staging.dev-sandbox.io.",
                type="A",
                ttl=120,
                routing_policy="SIMPLE",
            ),
            DnsRecord(
                id=generate_route53_id("R"),
                hosted_zone_id=zone3.id,
                name="docs.dev-sandbox.io.",
                type="CNAME",
                ttl=300,
                routing_policy="SIMPLE",
            ),
        ]
        recs_z3[0].values = ["203.0.113.88"]
        recs_z3[1].values = ["cname.vercel-dns.com."]
        db.add_all(recs_z3)

        db.commit()

    # 3. Seed Health Checks if not present
    if db.query(HealthCheck).count() == 0:
        health_checks = [
            HealthCheck(
                id="H0918237461AA",
                name="acme-api-health",
                protocol="HTTPS",
                ip_or_domain="api.acme-corp.com",
                port=443,
                path="/health",
                request_interval=10,
                failure_threshold=3,
                status="HEALTHY",
                inverted=False,
            ),
            HealthCheck(
                id="H0284719283BB",
                name="auth-service-health",
                protocol="HTTPS",
                ip_or_domain="auth.acme-corp.com",
                port=443,
                path="/status",
                request_interval=30,
                failure_threshold=3,
                status="HEALTHY",
                inverted=False,
            ),
            HealthCheck(
                id="H0739182645CC",
                name="internal-vault-probe",
                protocol="TCP",
                ip_or_domain="10.0.8.20",
                port=8200,
                path="",
                request_interval=30,
                failure_threshold=2,
                status="HEALTHY",
                inverted=False,
            ),
        ]
        db.add_all(health_checks)
        db.commit()
