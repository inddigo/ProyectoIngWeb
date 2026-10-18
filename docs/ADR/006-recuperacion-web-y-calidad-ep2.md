# ADR-006: Pipeline de recuperación, limpieza, deduplicación e indexación de información web (EP2)

- **Estado:** Aceptado
- **Fecha:** 2026-10-18

## Contexto
En la Entrega Parcial 1 (EP1), la obtención de referencias visuales desde la API pública de Openverse realizaba una consulta básica con caché en memoria ilimitado (`dict` sin expiración) y almacenaba únicamente `title`, `image_url` y `source` en PostgreSQL. Para la Entrega Parcial 2 (EP2) se requiere garantizar calidad de datos, trazabilidad de procedencia, control de duplicados, respeto normativo (licencias y límites de tasa) y evaluación cuantitativa.

## Decisión
1. **Extracción responsable y caché con TTL:** `service-python` envía una cabecera `User-Agent` explícita (`CotizaAcademicBot/1.2`) y utiliza un caché en memoria acotado (`MAX_CACHE_ENTRIES=128`) con tiempo de vida configurable (`SCRAPER_CACHE_TTL_SECONDS=3600`).
2. **Pipeline de validación, limpieza, normalización y deduplicación (`scraper.py`):**
   - **Validación:** Se descartan registros sin URL o con esquemas no seguros (`http://`, `javascript:`).
   - **Limpieza y normalización:** Se decodifican entidades HTML (`html.unescape`), se eliminan etiquetas HTML residuales y ruido de nombres de archivo (`IMG_1234.JPG`), se normaliza Unicode (`NFKC`), se estandarizan las licencias abiertas (`CC BY-SA 4.0`, `CC0 1.0`) y se canonizan las URLs eliminando parámetros de rastreo (`utm_*`, `fbclid`, `gclid`).
   - **Deduplicación en dos niveles:** Primero en `service-python` por URL canónica y título normalizado; segundo en `backend-nestjs` y PostgreSQL mediante la restricción única `@@unique([orderId, imageUrl])`.
3. **Persistencia e indexación con metadatos de procedencia:** Se extiende la tabla `web_references` mediante la migración `20261018000000_ep2_web_references_metadata` con `source_url`, `license`, `creator`, `query_used` y `retrieved_at`, añadiendo índices B-Tree sobre `order_id`, `source` y `query_used`, y exponiendo el endpoint `GET /api/v1/orders/web-references`.
4. **Observabilidad y métricas de evaluación:** Se implementa propagación de `X-Correlation-Id` y logs JSON estructurados entre NestJS y FastAPI, además del endpoint `GET /api/v1/nlp/metrics` (y su pasarela `GET /api/v1/orders/nlp-metrics` en NestJS) que reporta porcentaje de registros válidos, porcentaje de duplicados filtrados, latencia promedio, tasa de respaldo y exactitud sobre un benchmark NLP reproducible.

## Consecuencias
- **Positivas:** Trazabilidad completa del origen y licencia de cada imagen, protección frente a datos corruptos o duplicados, cumplimiento de atribución Creative Commons y métricas verificables en tiempo real.
- **Negativas / Trade-offs:** Ligero incremento en el tamaño de cada fila en `web_references` por los metadatos adicionales, ampliamente compensado por los índices de búsqueda y la prevención de duplicados.
