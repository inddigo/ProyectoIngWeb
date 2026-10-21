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

## Revisión del 20 de octubre de 2026

### Proxy público y excepción de análisis estático

`frontend/nginx.conf` es una plantilla: el entrypoint oficial de nginx sustituye `BACKEND_ORIGIN` antes de iniciar. El destino efectivo es una URL de configuración, nunca `$host`, un parámetro ni una cabecera de la petición. La regla `generic.nginx.security.missing-internal.missing-internal` interpreta el marcador de plantilla como una variable nginx y produce un falso positivo. Se excluye únicamente ese hallazgo en esa línea, conservando el resto del análisis y sus bloqueos. Marcar la ubicación como `internal` impediría el acceso público requerido a `/api`, `/auth` y `/health`. En CI, con acceso directo a nginx (`VERIFY_PROXY_HOST=1`), la prueba de humo verifica también una petición con un `Host` ajeno y comprueba que sigue atendiendo el backend configurado.

Se inspecciona el lote completo antes de seleccionar cuatro imágenes. Se distinguen válidos totales y retornados; sin datos la tasa es nula. La consulta externa utiliza vocabulario cerrado para evitar filtrar temas libres. No se infieren licencias ni autores ausentes y no se usan imágenes estáticas como sustituto de recuperación real. Los fallos actualizan el estado externo a degraded. CI usa una fuente sintética identificada; staging exige fuente real, SHA desplegado y evidencia de persistencia.


## Actualización: alojamiento gratuito

El equipo descarta GCP. La configuración activa es `terraform/render`: tres servicios Free con PostgreSQL Neon Free externo. El pipeline despliega el SHA aprobado mediante la API Render, espera el estado live y verifica el flujo real. Python exige un secreto compartido sobre HTTPS público. Las referencias anteriores a IAM, Cloud SQL o imágenes idénticas entre CI y staging quedan sustituidas por esta decisión. Render reconstruye el commit; la prueba externa posterior es obligatoria. Los límites y pasos vigentes están en `docs/staging.md`.
