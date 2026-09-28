from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "service-python"}


def test_structure_cake_order():
    payload = {"raw_text": "torta para 15 personas de chocolate vegana temática marvel", "domain": "cake"}
    response = client.post("/api/v1/nlp/structure-order", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["domain"] == "cake"
    assert data["entities"]["servings"] == 15
    assert "Chocolate" in data["entities"]["flavors"]
    assert "Vegana" in data["entities"]["dietary_restrictions"]
    assert data["entities"]["confidence_score"] >= 0.9
    assert len(data["web_references"]) >= 1


def test_domain_defaults_to_cake():
    response = client.post("/api/v1/nlp/structure-order", json={"raw_text": "pastel de vainilla"})
    assert response.status_code == 200
    assert response.json()["domain"] == "cake"


def test_structure_tattoo_order():
    payload = {"raw_text": "Quiero un tatuaje de 15cm en el antebrazo a color", "domain": "tattoo"}
    response = client.post("/api/v1/nlp/structure-order", json=payload)
    assert response.status_code == 200
    entities = response.json()["entities"]
    assert entities["size"] == "15 cm"
    assert entities["body_part"] == "Antebrazo"
    assert entities["style"] == "A color"


def test_rejects_unknown_domain():
    response = client.post("/api/v1/nlp/structure-order", json={"raw_text": "arreglar cañería", "domain": "plomeria"})
    assert response.status_code == 422


def test_rejects_blank_text():
    response = client.post("/api/v1/nlp/structure-order", json={"raw_text": "     ", "domain": "cake"})
    assert response.status_code == 422


def test_scraper_failure_uses_fallback(monkeypatch):
    import httpx

    from app.services import scraper

    async def boom(self, search):
        raise httpx.ConnectError("sin red")

    monkeypatch.setattr(scraper.WebReferenceScraper, "_search_openverse", boom)
    response = client.post("/api/v1/nlp/structure-order", json={"raw_text": "torta de boda para 80 personas"})
    assert response.status_code == 200
    assert "respaldo" in response.json()["web_references"][0]["source"]
