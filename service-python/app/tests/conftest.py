import pytest

from app.services import scraper


@pytest.fixture(autouse=True)
def offline_scraper(monkeypatch):
    """Evita llamadas reales a Openverse durante las pruebas."""

    async def fake_search(self, search):
        return [{"title": f"ref {search}", "image_url": "https://example.org/a.jpg", "source": "test"}]

    monkeypatch.setattr(scraper.WebReferenceScraper, "_search_openverse", fake_search)
    scraper.web_scraper._cache.clear()
