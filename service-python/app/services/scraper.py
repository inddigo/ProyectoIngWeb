"""Obtención de imágenes de referencia desde la Web (Openverse API).

Openverse indexa imágenes con licencias abiertas (Flickr, Wikimedia, etc.) y
no requiere API key. Se usa caché en memoria y, si la API falla o no hay
resultados, se devuelven referencias de respaldo para no bloquear el flujo.
"""

import logging
import os

import httpx

logger = logging.getLogger(__name__)

OPENVERSE_URL = os.getenv("OPENVERSE_URL", "https://api.openverse.org/v1/images/")
MAX_RESULTS = 4

DOMAIN_KEYWORDS = {"cake": "cake", "tattoo": "tattoo"}

FALLBACK_REFERENCES = {
    "cake": [
        {
            "title": "Referencia genérica de pastel",
            "image_url": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500",
            "source": "Unsplash (respaldo)",
        }
    ],
    "tattoo": [
        {
            "title": "Referencia genérica de tatuaje",
            "image_url": "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=500",
            "source": "Unsplash (respaldo)",
        }
    ],
}


class WebReferenceScraper:
    def __init__(self, timeout: float = 4.0):
        self.timeout = timeout
        self._cache: dict[str, list[dict[str, str]]] = {}

    async def get_references(self, domain: str, query: str) -> list[dict[str, str]]:
        search = f"{query} {DOMAIN_KEYWORDS.get(domain, '')}".strip()
        cache_key = f"{domain}:{search.lower()}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        try:
            results = await self._search_openverse(search)
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            logger.warning("Openverse no disponible (%s); usando respaldo", exc)
            return FALLBACK_REFERENCES.get(domain, FALLBACK_REFERENCES["cake"])

        if not results:
            return FALLBACK_REFERENCES.get(domain, FALLBACK_REFERENCES["cake"])

        self._cache[cache_key] = results
        return results

    async def _search_openverse(self, search: str) -> list[dict[str, str]]:
        params = {"q": search, "page_size": MAX_RESULTS, "mature": "false"}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(OPENVERSE_URL, params=params)
            response.raise_for_status()
            data = response.json()

        references = []
        for item in data.get("results", [])[:MAX_RESULTS]:
            url = item.get("thumbnail") or item.get("url")
            if not url or not url.startswith("https://"):
                continue
            references.append(
                {
                    "title": (item.get("title") or search)[:200],
                    "image_url": url,
                    "source": f"Openverse / {item.get('source', 'web')} ({item.get('license', 'cc')})",
                }
            )
        return references


web_scraper = WebReferenceScraper()
