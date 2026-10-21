"""Obtención, limpieza, normalización y evaluación de referencias visuales web (Openverse API).

Openverse indexa imágenes con licencias abiertas Creative Commons (Flickr, Wikimedia,
Rawpixel, WordPress Photo Directory, etc.) sin requerir API key para uso responsable.
Este módulo implementa:
1. Extracción automatizada con cabecera User-Agent identificable y control de timeout.
2. Validación de esquema, protocolo seguro (HTTPS) y formato de URL.
3. Limpieza y normalización de metadatos (decodificación de entidades HTML, eliminación
   de etiquetas/ruido, normalización Unicode NFKC y estandarización de licencias CC).
4. Deduplicación determinista por URL canónica (sin parámetros de rastreo) y por título.
5. Caché en memoria acotado con expiración por tiempo (TTL) para respetar límites de tasa.
6. Trazabilidad y métricas de calidad en tiempo real (porcentaje de válidos, porcentaje
   de duplicados, tiempo de respuesta, tasa de errores/fallback y Precision@K en benchmark).
"""

from __future__ import annotations

import html
import json
import logging
import os
import re
import time
import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import httpx

logger = logging.getLogger(__name__)

OPENVERSE_URL = os.getenv("OPENVERSE_URL", "https://api.openverse.org/v1/images/")
USER_AGENT = os.getenv(
    "SCRAPER_USER_AGENT",
    "CotizaAcademicBot/1.2 (+https://github.com/inddigo/ProyectoIngWeb; uso academico responsable)",
)
CACHE_TTL_SECONDS = int(os.getenv("SCRAPER_CACHE_TTL_SECONDS", "3600"))
MAX_CACHE_ENTRIES = int(os.getenv("SCRAPER_MAX_CACHE_ENTRIES", "128"))
MAX_RESULTS = 4
RAW_PAGE_SIZE = 12

DOMAIN_KEYWORDS = {"cake": "cake", "tattoo": "tattoo", "general": "design"}

TRACKING_QUERY_PARAMS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
    "ref",
}


def clean_and_normalize_text(raw: str | None, fallback: str = "Referencia visual", max_len: int = 200) -> str:
    """Limpia entidades HTML, etiquetas, caracteres de control y normaliza espacios/Unicode."""
    if not raw or not isinstance(raw, str):
        return fallback[:max_len]

    # 1. Decodificar entidades HTML (&amp; -> &, &#39; -> ')
    text = html.unescape(raw)
    # 2. Eliminar etiquetas HTML residuales (<p>, <b>, <a ...>)
    text = re.sub(r"<[^>]+>", " ", text)
    # 3. Normalización Unicode NFKC
    text = unicodedata.normalize("NFKC", text)
    # 4. Eliminar caracteres de control no imprimibles y ruido común de nombres de archivo
    text = re.sub(r"[\x00-\x1f\x7f-\x9f]", " ", text)
    text = re.sub(r"\b(IMG|DSC|PXL|PHOTO)[_-]?\d+\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\.(jpg|jpeg|png|webp|svg|gif)\b", "", text, flags=re.IGNORECASE)
    # 5. Colapsar espacios múltiples y recortar
    text = re.sub(r"\s+", " ", text).strip(" -_.,;:|")

    if len(text) < 2:
        return fallback[:max_len]
    return text[:max_len]


def normalize_url(raw_url: str | None) -> str | None:
    """Valida que la URL sea HTTPS válida y elimina fragmentos y parámetros de tracking."""
    if not raw_url or not isinstance(raw_url, str):
        return None
    cleaned = raw_url.strip()
    if not cleaned.startswith("https://"):
        return None
    try:
        parts = urlsplit(cleaned)
    except ValueError:
        return None
    if not parts.netloc or "." not in parts.netloc or " " in cleaned:
        return None

    filtered_query = [
        (k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k.lower() not in TRACKING_QUERY_PARAMS
    ]
    normalized_netloc = parts.netloc.lower()
    return urlunsplit(("https", normalized_netloc, parts.path, urlencode(filtered_query), ""))


def normalize_license(license_code: str | None, license_version: str | None = None) -> str:
    """Estandariza el código de licencia abierta (ej. 'by-sa', '4.0' -> 'CC BY-SA 4.0')."""
    if not license_code or not isinstance(license_code, str):
        return "Licencia no informada"
    code = license_code.strip().upper()
    version = (license_version or "").strip()
    if code in ("CC0", "PDM"):
        return f"{code} {version}".strip()
    if not code.startswith("CC"):
        code = f"CC {code}"
    return f"{code} {version}".strip()[:50]


@dataclass
class CacheEntry:
    references: list[dict[str, str]]
    meta: dict[str, Any]
    expires_at: float


class WebReferenceScraper:
    def __init__(self, timeout: float = 4.0, ttl_seconds: int = CACHE_TTL_SECONDS):
        self.timeout = timeout
        self.ttl_seconds = ttl_seconds
        self._cache: dict[str, CacheEntry] = {}
        self._stats: dict[str, Any] = {
            "total_requests": 0,
            "cache_hits": 0,
            "fallback_count": 0,
            "error_count": 0,
            "raw_records_seen": 0,
            "valid_records_kept": 0,
            "valid_records_total": 0,
            "invalid_records_dropped": 0,
            "duplicates_removed": 0,
            "total_latency_ms": 0.0,
            "last_error": None,
            "last_success_at": None,
            "source_status": "unknown",
        }

    def clear_cache(self) -> None:
        self._cache.clear()

    def get_metrics(self) -> dict[str, Any]:
        """Calcula las métricas de calidad de datos y desempeño de recuperación web."""
        reqs = self._stats["total_requests"]
        raw = self._stats["raw_records_seen"]
        valid = self._stats["valid_records_total"]
        dups = self._stats["duplicates_removed"]
        errors = self._stats["error_count"]
        fallbacks = self._stats["fallback_count"]

        return {
            "source": "Openverse API (https://api.openverse.org/v1/images/)",
            "total_requests": reqs,
            "cache_hits": self._stats["cache_hits"],
            "cache_hit_rate_pct": round((self._stats["cache_hits"] / reqs) * 100, 2) if reqs else 0.0,
            "raw_records_seen": raw,
            "valid_records_kept": self._stats["valid_records_kept"],
            "valid_records_total": valid,
            "invalid_records_dropped": self._stats["invalid_records_dropped"],
            "duplicates_removed": dups,
            "valid_records_rate_pct": round((valid / raw) * 100, 2) if raw else None,
            "duplicate_rate_pct": round((dups / raw) * 100, 2) if raw else 0.0,
            "avg_latency_ms": round(self._stats["total_latency_ms"] / reqs, 2) if reqs else 0.0,
            "error_rate_pct": round((errors / reqs) * 100, 2) if reqs else 0.0,
            "fallback_rate_pct": round((fallbacks / reqs) * 100, 2) if reqs else 0.0,
            "active_cache_entries": len(self._cache),
            "cache_ttl_seconds": self.ttl_seconds,
            "last_success_at": self._stats["last_success_at"],
            "last_error": self._stats["last_error"],
            "source_status": self._stats["source_status"],
        }

    async def get_references(self, domain: str, query: str) -> list[dict[str, str]]:
        refs, _ = await self.get_references_with_meta(domain, query)
        return refs

    async def get_references_with_meta(self, domain: str, query: str) -> tuple[list[dict[str, str]], dict[str, Any]]:
        start = time.perf_counter()
        self._stats["total_requests"] += 1

        clean_query = clean_and_normalize_text(query, fallback="", max_len=80)
        search = f"{clean_query} {DOMAIN_KEYWORDS.get(domain, '')}".strip() or DOMAIN_KEYWORDS.get(domain, "cake")
        cache_key = f"{domain}:{search.lower()}"
        now = time.monotonic()

        cached = self._cache.get(cache_key)
        if cached and cached.expires_at > now:
            self._stats["cache_hits"] += 1
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            self._stats["total_latency_ms"] += latency_ms
            meta = {
                **cached.meta,
                "cache_hit": True,
                "fallback_used": False,
                "latency_ms": latency_ms,
            }
            return cached.references, meta

        try:
            results, parse_stats = await self._search_openverse(search)
            if not results:
                tokens = [t for t in clean_query.split() if len(t) >= 3]
                if len(tokens) > 1:
                    domain_kw = DOMAIN_KEYWORDS.get(domain, "cake")
                    broad_search = f"{tokens[0]} {domain_kw}".strip()
                    if broad_search.lower() != search.lower():
                        results, parse_stats = await self._search_openverse(broad_search)
                        if results:
                            search = broad_search
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            self._stats["total_latency_ms"] += latency_ms
            self._stats["error_count"] += 1
            self._stats["fallback_count"] += 1
            self._stats["last_error"] = type(exc).__name__
            self._stats["source_status"] = "degraded"
            logger.warning(
                json.dumps({"event": "web_source_error", "provider": "openverse", "error": type(exc).__name__})
            )
            fallback = self._build_fallback(domain, search)
            return fallback, {
                "query_used": search,
                "raw_count": 0,
                "valid_count": 0,
                "returned_count": len(fallback),
                "invalid_dropped": 0,
                "duplicates_removed": 0,
                "cache_hit": False,
                "fallback_used": True,
                "latency_ms": latency_ms,
            }

        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        self._stats["total_latency_ms"] += latency_ms

        if not results:
            self._stats["fallback_count"] += 1
            self._stats["source_status"] = "empty"
            self._stats["last_error"] = None
            fallback = self._build_fallback(domain, search)
            return fallback, {
                **parse_stats,
                "returned_count": len(fallback),
                "query_used": search,
                "cache_hit": False,
                "fallback_used": True,
                "latency_ms": latency_ms,
            }

        self._stats["last_success_at"] = datetime.now(UTC).isoformat().replace("+00:00", "Z")
        self._stats["last_error"] = None
        self._stats["source_status"] = "ready"
        meta = {
            **parse_stats,
            "query_used": search,
            "cache_hit": False,
            "fallback_used": False,
            "latency_ms": latency_ms,
        }
        self._store_in_cache(cache_key, results, meta, now)
        return results, meta

    async def _search_openverse(self, search: str) -> tuple[list[dict[str, str]], dict[str, int]]:
        params = {"q": search, "page_size": RAW_PAGE_SIZE, "mature": "false"}
        headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
        async with httpx.AsyncClient(timeout=self.timeout, headers=headers) as client:
            response = await client.get(OPENVERSE_URL, params=params)
            response.raise_for_status()
            data = response.json()

        if not isinstance(data, dict) or not isinstance(data.get("results"), list):
            raise ValueError("Contrato Openverse inválido")
        return self.process_raw_results(data.get("results", []), search)

    def process_raw_results(
        self, raw_items: list[dict[str, Any]], search: str
    ) -> tuple[list[dict[str, str]], dict[str, int]]:
        """Valida, limpia, normaliza y deduplica la lista cruda de resultados."""
        if not isinstance(raw_items, list):
            raw_items = []

        retrieved_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
        references: list[dict[str, str]] = []
        seen_urls: set[str] = set()
        seen_titles: set[str] = set()

        raw_count = len(raw_items)
        invalid_dropped = 0
        duplicates_removed = 0

        for item in raw_items:
            if not isinstance(item, dict):
                invalid_dropped += 1
                continue

            raw_url = item.get("thumbnail") or item.get("url")
            clean_url = normalize_url(raw_url)
            if not clean_url:
                invalid_dropped += 1
                continue

            title = clean_and_normalize_text(item.get("title"), fallback=search, max_len=200)
            title_key = title.lower()

            if clean_url in seen_urls or (title_key in seen_titles and title_key != search.lower()):
                duplicates_removed += 1
                continue

            seen_urls.add(clean_url)
            seen_titles.add(title_key)

            provider = clean_and_normalize_text(item.get("source") or item.get("provider"), fallback="web", max_len=40)
            license_label = normalize_license(item.get("license"), item.get("license_version"))
            creator = clean_and_normalize_text(item.get("creator"), fallback="Autor no informado", max_len=80)
            landing_url = normalize_url(item.get("foreign_landing_url") or item.get("url")) or clean_url

            references.append(
                {
                    "title": title,
                    "image_url": clean_url,
                    "source": f"Openverse / {provider} ({license_label})"[:100],
                    "source_url": landing_url,
                    "license": license_label,
                    "creator": creator,
                    "query_used": search[:100],
                    "retrieved_at": retrieved_at,
                }
            )
        valid_count = len(references)
        references = references[:MAX_RESULTS]
        self._stats["raw_records_seen"] += raw_count
        self._stats["valid_records_kept"] += len(references)
        self._stats["valid_records_total"] += valid_count
        self._stats["invalid_records_dropped"] += invalid_dropped
        self._stats["duplicates_removed"] += duplicates_removed

        stats = {
            "raw_count": raw_count,
            "valid_count": valid_count,
            "returned_count": len(references),
            "invalid_dropped": invalid_dropped,
            "duplicates_removed": duplicates_removed,
        }
        return references, stats

    def _build_fallback(self, domain: str, search: str) -> list[dict[str, str]]:
        # No inventar autoría/licencias ni presentar imágenes estáticas como datos recuperados.
        # El cliente puede continuar con el formulario sin referencias externas.
        return []

    def _store_in_cache(self, key: str, references: list[dict[str, str]], meta: dict[str, Any], now: float) -> None:
        if len(self._cache) >= MAX_CACHE_ENTRIES:
            oldest_key = min(self._cache, key=lambda k: self._cache[k].expires_at)
            self._cache.pop(oldest_key, None)
        self._cache[key] = CacheEntry(
            references=references,
            meta=meta,
            expires_at=now + self.ttl_seconds,
        )


web_scraper = WebReferenceScraper()
