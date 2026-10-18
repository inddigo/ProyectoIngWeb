"""Pruebas unitarias para extracción, validación, limpieza, normalización, deduplicación y caché web."""

from app.services.scraper import (
    WebReferenceScraper,
    clean_and_normalize_text,
    normalize_license,
    normalize_url,
)


def test_clean_and_normalize_text_strips_html_and_entities():
    raw = "  <b>Torta &amp; Pastel &#39;Batman&#39;</b>   IMG_2045.JPG  "
    cleaned = clean_and_normalize_text(raw, fallback="cake")
    assert cleaned == "Torta & Pastel 'Batman'"


def test_clean_and_normalize_text_uses_fallback_when_empty_or_noise():
    assert clean_and_normalize_text("   <br/>  .jpg ", fallback="Respaldo") == "Respaldo"
    assert clean_and_normalize_text(None, fallback="Respaldo") == "Respaldo"


def test_normalize_url_accepts_https_and_strips_tracking_params():
    dirty = "https://Live.StaticFlickr.com/65535/123_b.jpg?utm_source=test&w=500&fbclid=abc#section"
    assert normalize_url(dirty) == "https://live.staticflickr.com/65535/123_b.jpg?w=500"


def test_normalize_url_rejects_insecure_or_malformed_urls():
    assert normalize_url("http://insecure.example.com/img.jpg") is None
    assert normalize_url("javascript:alert(1)") is None
    assert normalize_url("https://sin-dominio") is None
    assert normalize_url("") is None


def test_normalize_license_standardizes_codes():
    assert normalize_license("by-sa", "4.0") == "CC BY-SA 4.0"
    assert normalize_license("cc0", "1.0") == "CC0 1.0"
    assert normalize_license(None) == "CC-BY"


def test_process_raw_results_deduplicates_and_filters_invalid():
    scraper = WebReferenceScraper()
    raw_items = [
        # 1. Válido con HTML sucio y tracking params
        {
            "title": "<b>Batman &amp; Robin Cake</b> DSC_0012.JPG",
            "thumbnail": "https://cdn.example.org/img1.jpg?utm_source=ov",
            "source": "flickr",
            "license": "by",
            "license_version": "2.0",
            "creator": "Chef_1",
            "foreign_landing_url": "https://flickr.com/photos/1",
        },
        # 2. Duplicado por URL canónica (solo cambia utm_medium)
        {
            "title": "Otro título distinto",
            "thumbnail": "https://cdn.example.org/img1.jpg?utm_medium=social",
            "source": "flickr",
            "license": "by",
        },
        # 3. Duplicado por título normalizado
        {
            "title": "batman & robin cake",
            "thumbnail": "https://cdn.example.org/img2-distinta.jpg",
            "source": "wikimedia",
            "license": "by-sa",
        },
        # 4. Inválido (HTTP no seguro)
        {
            "title": "Insegura",
            "thumbnail": "http://cdn.example.org/insecure.jpg",
            "source": "web",
        },
        # 5. Segundo registro válido único
        {
            "title": "Dark Knight Chocolate Cake",
            "thumbnail": "https://cdn.example.org/img3.jpg",
            "source": "wikimedia",
            "license": "cc0",
            "license_version": "1.0",
        },
    ]

    refs, stats = scraper.process_raw_results(raw_items, "batman cake")
    assert stats["raw_count"] == 5
    assert stats["valid_count"] == 2
    assert stats["invalid_dropped"] == 1
    assert stats["duplicates_removed"] == 2

    assert refs[0]["title"] == "Batman & Robin Cake"
    assert refs[0]["image_url"] == "https://cdn.example.org/img1.jpg"
    assert refs[0]["license"] == "CC BY 2.0"
    assert refs[0]["query_used"] == "batman cake"
    assert refs[0]["retrieved_at"].endswith("Z")

    metrics = scraper.get_metrics()
    assert metrics["raw_records_seen"] == 5
    assert metrics["valid_records_kept"] == 2
    assert metrics["duplicates_removed"] == 2
    assert metrics["valid_records_rate_pct"] == 40.0
    assert metrics["duplicate_rate_pct"] == 40.0
