import pytest

from app.services import scraper


@pytest.fixture(autouse=True)
def offline_scraper(monkeypatch):
    """Evita llamadas reales a Openverse durante las pruebas."""

    async def fake_search(self, search):
        return self.process_raw_results(
            [{"title": f"ref {search}", "thumbnail": "https://example.org/a.jpg", "source": "test", "license": "by"}],
            search,
        )

    monkeypatch.setattr(scraper.WebReferenceScraper, "_search_openverse", fake_search)
    monkeypatch.setattr(scraper, "web_scraper", scraper.WebReferenceScraper())
    from app import api, main

    monkeypatch.setattr(api, "web_scraper", scraper.web_scraper)
    monkeypatch.setattr(main, "web_scraper", scraper.web_scraper)
