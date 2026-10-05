"""Test suite for InsightDI Backend Foundation & Authentication"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.base import Base
from app.db.session import engine

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "project" in data
    assert data["docs"] == "/docs"
    assert data["health"] == "/api/v1/health"


def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["database_status"] == "connected"


def test_register_and_login_flow():
    test_email = "founder@ecommerce-store.com"
    test_password = "supersecretpassword123"

    # Register
    reg_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": test_email,
            "password": test_password,
            "company_name": "Apex Electronics Ltd",
        },
    )
    assert reg_response.status_code in [201, 400]
    if reg_response.status_code == 201:
        reg_data = reg_response.json()
        assert reg_data["success"] is True
        assert reg_data["data"]["email"] == test_email
        assert reg_data["data"]["company_name"] == "Apex Electronics Ltd"

    # Login via JSON endpoint
    login_response = client.post(
        "/api/v1/auth/login-json",
        json={"email": test_email, "password": test_password},
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # Verify Protected /me endpoint with Bearer token
    me_response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert me_response.status_code == 200
    user_data = me_response.json()
    assert user_data["data"]["email"] == test_email
    assert user_data["data"]["company_name"] == "Apex Electronics Ltd"


def test_unauthorized_access():
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid_token"})
    assert response.status_code == 401
