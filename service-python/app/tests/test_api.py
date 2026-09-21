import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "service-python"}

def test_structure_order():
    payload = {
        "raw_text": "torta para 15 personas de chocolate vegana temática marvel"
    }
    response = client.post("/api/v1/nlp/structure-order", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "entities" in data
    assert "web_references" in data
    assert data["entities"]["servings"] == 15
    assert "Chocolate" in data["entities"]["flavors"]
    assert "Vegana" in data["entities"]["dietary_restrictions"]
