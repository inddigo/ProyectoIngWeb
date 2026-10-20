from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health", headers={"X-Correlation-Id": "test-corr-123"})
    assert response.status_code == 200
    assert response.headers.get("X-Correlation-Id") == "test-corr-123"
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "service-python"
    assert body["external_source"]["provider"] == "openverse"


def test_structure_cake_order():
    payload = {"raw_text": "torta para 15 personas de chocolate vegana temática marvel", "domain": "cake"}
    response = client.post("/api/v1/nlp/structure-order", json=payload)
    assert response.status_code == 200
    assert "X-Correlation-Id" in response.headers
    data = response.json()
    assert data["domain"] == "cake"
    assert data["entities"]["servings"] == 15
    assert "Chocolate" in data["entities"]["flavors"]
    assert "Vegana" in data["entities"]["dietary_restrictions"]
    assert data["entities"]["confidence_score"] >= 0.9
    assert len(data["web_references"]) >= 1
    assert data["web_references"][0]["retrieved_at"] is not None
    assert data["extraction_meta"] is not None
    assert "latency_ms" in data["extraction_meta"]
    assert data["extraction_meta"]["fallback_used"] is False
    assert data["web_references"][0]["source"].startswith("Openverse")


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

    scraper.web_scraper.clear_cache()

    async def boom(self, search):
        raise httpx.ConnectError("sin red")

    monkeypatch.setattr(scraper.WebReferenceScraper, "_search_openverse", boom)
    response = client.post("/api/v1/nlp/structure-order", json={"raw_text": "torta de boda para 80 personas"})
    assert response.status_code == 200
    body = response.json()
    assert body["web_references"] == []
    assert body["extraction_meta"]["fallback_used"] is True


def test_metrics_endpoint_returns_web_and_nlp_evaluation():
    response = client.get("/api/v1/nlp/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "web_retrieval" in data
    assert "nlp_benchmark" in data
    assert data["nlp_benchmark"]["entity_extraction_accuracy_pct"] >= 90.0


def test_source_health_degrades_on_empty_timeout_and_recovers(monkeypatch):
    import httpx

    from app.services import scraper

    async def timeout(self, search):
        raise httpx.ReadTimeout("")

    monkeypatch.setattr(scraper.WebReferenceScraper, "_search_openverse", timeout)
    body = client.post("/api/v1/nlp/structure-order", json={"raw_text": "torta de chocolate"}).json()
    assert body["extraction_meta"]["fallback_used"]
    assert body["extraction_meta"]["valid_count"] == 0
    assert client.get("/health").json()["external_source"]["status"] == "degraded"

    async def recovered(self, search):
        return self.process_raw_results([{"title": "Cake", "thumbnail": "https://example.org/cake.jpg"}], search)

    monkeypatch.setattr(scraper.WebReferenceScraper, "_search_openverse", recovered)
    body = client.post("/api/v1/nlp/structure-order", json={"raw_text": "torta de chocolate"}).json()
    assert not body["extraction_meta"]["fallback_used"]
    assert client.get("/health").json()["external_source"]["status"] == "ready"
    assert scraper.web_scraper.get_metrics()["last_error"] is None
