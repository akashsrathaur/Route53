import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.database import Base, get_db
from backend.app.seed import seed_initial_data

# Use SQLite with StaticPool so all threads share the same in-memory database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_initial_data(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_root_and_health(client):
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["service"] == "AWS Route 53 Clone Backend"

    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"


def test_auth_me_and_switch(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "root-account"

    # Switch user to DevOps
    res_switch = client.post("/api/auth/switch-user/usr_devops")
    assert res_switch.status_code == 200
    assert res_switch.json()["username"] == "alex.devops"


def test_hosted_zones_crud(client):
    # List seeded zones
    res = client.get("/api/hosted-zones")
    assert res.status_code == 200
    zones = res.json()
    assert len(zones) >= 3

    # Create new zone
    new_zone_payload = {
        "name": "test-domain.org",
        "description": "Integration test zone",
        "type": "PUBLIC",
        "tags": [{"key": "Stage", "value": "test"}],
    }
    create_res = client.post("/api/hosted-zones", json=new_zone_payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["name"] == "test-domain.org."
    assert created["record_count"] == 2  # default SOA + NS
    zone_id = created["id"]

    # Verify default records (NS and SOA) exist
    records_res = client.get(f"/api/hosted-zones/{zone_id}/records")
    assert records_res.status_code == 200
    records = records_res.json()
    types = [r["type"] for r in records]
    assert "NS" in types
    assert "SOA" in types

    # Update zone
    upd_res = client.put(f"/api/hosted-zones/{zone_id}", json={"description": "Updated desc"})
    assert upd_res.status_code == 200
    assert upd_res.json()["description"] == "Updated desc"

    # Delete zone
    del_res = client.delete(f"/api/hosted-zones/{zone_id}")
    assert del_res.status_code == 200


def test_dns_records_crud_and_validations(client):
    # Get first zone
    zones = client.get("/api/hosted-zones").json()
    zone_id = zones[0]["id"]
    zone_name = zones[0]["name"]

    # Create valid A record
    a_rec = {
        "name": f"web.{zone_name}",
        "type": "A",
        "ttl": 300,
        "values": ["192.0.2.1", "192.0.2.2"],
        "routing_policy": "SIMPLE",
    }
    res_a = client.post(f"/api/hosted-zones/{zone_id}/records", json=a_rec)
    assert res_a.status_code == 201
    rec_data = res_a.json()
    assert len(rec_data["values"]) == 2
    rec_id = rec_data["id"]

    # Test invalid IPv4 for A record
    res_inv = client.post(
        f"/api/hosted-zones/{zone_id}/records",
        json={"name": "invalid-a", "type": "A", "values": ["999.999.999.999"]},
    )
    assert res_inv.status_code == 400

    # Create MX record
    res_mx = client.post(
        f"/api/hosted-zones/{zone_id}/records",
        json={"name": f"mail2.{zone_name}", "type": "MX", "values": ["10 mail2.example.com."]},
    )
    assert res_mx.status_code == 201

    # Update record
    upd_rec = client.put(
        f"/api/hosted-zones/{zone_id}/records/{rec_id}",
        json={"ttl": 600, "values": ["192.0.2.100"]},
    )
    assert upd_rec.status_code == 200
    assert upd_rec.json()["ttl"] == 600

    # Delete record
    del_rec = client.delete(f"/api/hosted-zones/{zone_id}/records/{rec_id}")
    assert del_rec.status_code == 200


def test_bind_zone_import_and_export(client):
    zones = client.get("/api/hosted-zones").json()
    zone_id = zones[0]["id"]

    bind_sample = """
$ORIGIN acme-corp.com.
$TTL 300
blog            IN  A       192.0.2.77
docs            IN  CNAME   acme-corp.com.
status          IN  A       192.0.2.88
"""
    import_res = client.post(
        f"/api/hosted-zones/{zone_id}/records/import-bind",
        json={"zone_content": bind_sample},
    )
    assert import_res.status_code == 200
    assert import_res.json()["imported_count"] >= 3

    # Export BIND format
    export_bind = client.get(f"/api/hosted-zones/{zone_id}/export?format=bind")
    assert export_bind.status_code == 200
    assert "$ORIGIN" in export_bind.text
    assert "blog" in export_bind.text

    # Export JSON format
    export_json = client.get(f"/api/hosted-zones/{zone_id}/export?format=json")
    assert export_json.status_code == 200
    assert "records" in export_json.json()


def test_dns_query_tester(client):
    # Query an existing record
    res = client.post(
        "/api/test-dns",
        json={"record_name": "www.acme-corp.com.", "record_type": "CNAME"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "NOERROR"
    assert len(data["answers"]) > 0

    # Query a non-existent record
    res_nx = client.post(
        "/api/test-dns",
        json={"record_name": "nonexistent-record-123.acme-corp.com.", "record_type": "A"},
    )
    assert res_nx.status_code == 200
    assert res_nx.json()["status"] == "NXDOMAIN"


def test_dashboard_stats(client):
    res = client.get("/api/dashboard/stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_hosted_zones"] >= 3
    assert stats["total_records"] >= 10
    assert len(stats["query_volume_24h"]) == 24
