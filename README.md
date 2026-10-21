> **Staging EP2:** Render Free + Neon Free. Configuración activa: `terraform/render`; guía: [docs/staging.md](docs/staging.md). Google Cloud y sus scripts quedan históricos. Staging público: [cotiza-ep2-web.onrender.com](https://cotiza-ep2-web.onrender.com), con flujo real verificado.

# Cotiza — Plataforma de cotización inteligente para servicios personalizados

Plataforma para profesionales que trabajan por encargo: talleres, estudios, pastelerías,
organizadores de eventos y freelancers. Convierte solicitudes ambiguas en detalles
claros, referencias y cotizaciones según costos reales. En esta versión los rubros
disponibles son encargos generales (con campos editables), pastelería y tatuajes. Transforma pedidos escritos en lenguaje natural
(*"quiero una torta vegana para 20 personas con temática de Batman"*, *"un tatuaje de 15 cm
en el antebrazo a color"*) en formularios estructurados mediante NLP (`spaCy` + reglas), obtiene,
limpia, normaliza y deduplica referencias visuales desde la Web (Openverse API), las indexa en
PostgreSQL con metadatos de procedencia y permite al profesional cotizar con una calculadora de
costos asistida por reglas. El cliente sigue su pedido y acepta o rechaza la cotización. Ambos paneles incluyen búsqueda por texto o número, filtros de rubro/estado, resumen de pedidos y actualización manual. El cliente puede cancelar antes de recibir una cotización.

- **Definición del proyecto y especificación EP2** (problema, fuente web, limpieza, métricas, diseño adaptativo): [docs/proyecto.md](docs/proyecto.md)
- **Arquitectura** (contexto C4, contenedores, despliegue, modelo de datos e índices, flujo, ADR 001–006): [docs/arquitectura.md](docs/arquitectura.md)
- **Ambiente de staging e infraestructura (Terraform)**: [docs/staging.md](docs/staging.md)
- **Prototipo en Figma**: [E1 — prototipo de interfaz](https://www.figma.com/design/u0EsbFF2IfE2B7LOor9WzQ/E1?node-id=3-90)
- **Tablero del proyecto**: [GitHub Projects — IngWeb](https://github.com/users/inddigo/projects/3)

---

## Estado de preparación de EP2

Correcciones y validación técnica: [guía de entrega y evidencias](docs/entrega2.md). El staging público está desplegado en [Render](https://cotiza-ep2-web.onrender.com) con PostgreSQL Neon y flujo real verificado. El flujo de CI utiliza una fuente sintética explícita; el despliegue exige datos reales de Openverse.

## 1. Continuidad y correcciones de la EP1

En la **Entrega Parcial 2 (EP2)** se reutiliza la base arquitectónica, multiplataforma y DevSecOps de la EP1, incorporando las siguientes mejoras trazables (detalle en [docs/proyecto.md](docs/proyecto.md#4-continuidad-y-correcciones-incorporadas-desde-la-ep1) y [ADR-006](docs/ADR/006-recuperacion-web-y-calidad-ep2.md)):

1. **Pipeline de recuperación, limpieza, normalización y deduplicación web (`service-python/app/services/scraper.py`):** Decodificación de entidades HTML, eliminación de etiquetas/ruido, normalización Unicode `NFKC`, canonización de URLs HTTPS (eliminando parámetros de tracking `utm_*`/`fbclid`), estandarización de licencias Creative Commons, caché en memoria con TTL (`3600s`) y deduplicación por URL y título.
2. **Persistencia e indexación con metadatos de procedencia (`backend-nestjs/prisma/schema.prisma`):** Migración `20261018000000_ep2_web_references_metadata` que añade `source_url`, `license`, `creator`, `query_used`, `retrieved_at`, restricción única compuesta `@@unique([orderId, imageUrl])`, índices B-Tree sobre `order_id`, `source` y `query_used`, y el endpoint de consulta `GET /api/v1/orders/web-references`.
3. **Resiliencia y observabilidad correlacionada:** Reintentos limitados (`retry({ count: 1, delay: 150 })`) y timeout (`10s`) en `NlpService`, propagación de `X-Correlation-Id` de extremo a extremo entre NestJS y FastAPI, registros estructurados en formato JSON con medición de latencia (`durationMs`), y métricas de salud en `/health`.
4. **Evaluación cuantitativa de información recuperada:** Nuevo endpoint `GET /api/v1/nlp/metrics` (y pasarela `GET /api/v1/orders/nlp-metrics`) que calcula porcentaje de registros válidos, porcentaje de duplicados filtrados, latencia promedio, tasa de respaldo y exactitud sobre un benchmark reproducible.

---

## 2. Arquitectura general

```
 Navegador / PWA ──► nginx + Angular/Ionic ──┐
 App Android (Capacitor) ────────────────────┼──► NestJS (API REST, JWT, Correlation ID) ──► PostgreSQL 16 (Prisma + Índices)
                                             │            │
                                             │            └──► FastAPI + spaCy (NLP + Limpieza + Caché TTL) ──► Openverse API
```

| Componente | Carpeta | Tecnología |
|---|---|---|
| Frontend multiplataforma | [`frontend/`](frontend) | Angular 20, Ionic 8, Capacitor 8 (Android), Service Worker (PWA) |
| Backend orquestador | [`backend-nestjs/`](backend-nestjs) | NestJS 11, Prisma 6, passport-jwt, class-validator |
| Servicio NLP + Web | [`service-python/`](service-python) | Python 3.12, FastAPI, spaCy `es_core_news_md`, httpx |
| Base de datos | — | PostgreSQL 16 (migraciones versionadas Prisma) |
| Infraestructura | [`terraform/render/`](terraform/render), [`docker-compose.yml`](docker-compose.yml) | Docker, Terraform (Render Free) y PostgreSQL Neon Free |
| CI/CD | [`.github/workflows/`](.github/workflows/devsecops-ci-cd.yml) | GitHub Actions |

---

## 3. Fuente de información web y proceso de extracción/limpieza

### 3.1. Fuente web, frecuencia y aspectos legales/privacidad
- **Fuente:** **Openverse API** (`https://api.openverse.org/v1/images/`), catálogo abierto de imágenes Creative Commons y dominio público.
- **Método de obtención:** Consulta REST automatizada vía `httpx.AsyncClient` con `timeout=4.0s`, filtro `mature=false` y cabecera `User-Agent: CotizaAcademicBot/1.2 (+https://github.com/inddigo/ProyectoIngWeb; uso academico responsable)`.
- **Frecuencia y actualización:** Consulta bajo demanda con **caché en memoria con TTL de 3600 segundos (1 hora)** y límite de 128 entradas (`SCRAPER_CACHE_TTL_SECONDS`, `SCRAPER_MAX_CACHE_ENTRIES`). Al confirmar el pedido, la marca temporal exacta `retrieved_at` se persiste en PostgreSQL.
- **Ética, licencias y privacidad:** Se respetan las condiciones de uso de Openverse y las licencias Creative Commons conservando autor (`creator`), licencia normalizada (`CC BY 4.0`, `CC0 1.0`, etc.), proveedor (`source`) y enlace original (`source_url`). Por **minimización de datos**, nunca se envía el texto libre del cliente (`raw_text`) a Openverse, sino únicamente la entidad temática/estilo extraída por `spaCy`.

### 3.2. Flujo de validación, limpieza, normalización, deduplicación y respaldo
1. **Validación (`normalize_url`):** Exige esquema `https://` y host válido; descarta enlaces `http://`, `javascript:` o vacíos (`invalid_records_dropped`).
2. **Limpieza (`clean_and_normalize_text`):** Decodifica entidades HTML (`html.unescape`), elimina etiquetas HTML (`<[^>]+>`), caracteres de control y ruido de nombres de archivo de cámara (`IMG_2045.JPG`, `DSC_0012.PNG`).
3. **Normalización:** Normaliza Unicode en forma `NFKC`, colapsa espacios en blanco, limpia parámetros de rastreo en URLs (`utm_*`, `fbclid`, `gclid`) y estandariza códigos de licencia (`normalize_license`).
4. **Deduplicación en 2 niveles:**
   - En `service-python`: filtra URLs canónicas repetidas y títulos normalizados idénticos dentro del lote crudo (`duplicates_removed`).
   - En `backend-nestjs` / PostgreSQL: deduplica por `imageUrl` en `OrdersService.create` y protege la tabla `web_references` con `UNIQUE (order_id, image_url)`.
5. **Manejo de indisponibilidad:** Si Openverse no responde o retorna vacío, `service-python` devuelve cero referencias y `fallback_used: true`; el usuario puede continuar sin imágenes. Si `service-python` completo falla tras el reintento en NestJS, el orquestador responde `fallback: true` permitiendo al cliente completar el formulario manualmente.

---

## 4. Documentación de APIs (NestJS y FastAPI)

Swagger de NestJS: `/api/docs`; especificación OpenAPI: `/api/docs-json`. FastAPI: `/docs` y `/openapi.json`.

### 4.1. API principal — Backend Orquestador (`backend-nestjs`, puerto `3000`)

Todas las respuestas incluyen la cabecera `X-Correlation-Id` para trazabilidad de extremo a extremo.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/health` | Público | Estado de NestJS, PostgreSQL y servicio Python + latencias (`dbLatencyMs`, `nlpLatencyMs`, `correlationId`) |
| `POST` | `/auth/register` | Público | Registro de cliente (`CLIENT`); las cuentas profesionales se aprovisionan de forma controlada |
| `POST` | `/auth/login` | Público | Autenticación; devuelve `access_token` JWT |
| `POST` | `/api/v1/orders/nlp-structure` | Público | Texto libre → atributos + referencias web limpias + `extraction_meta` (NestJS → FastAPI con retry y fallback) |
| `GET` | `/api/v1/orders/nlp-metrics` | Público | Métricas de calidad de recuperación web y evaluación del benchmark NLP |
| `POST` | `/api/v1/orders` | `CLIENT` | Confirma un pedido y persiste sus `webReferences` deduplicadas con metadatos de procedencia |
| `GET` | `/api/v1/orders/mine` | `CLIENT` | Lista los pedidos del cliente autenticado (incluye `webReferences` y `quote`) |
| `GET` | `/api/v1/orders/web-references` | Autenticado | Busca referencias web indexadas en PostgreSQL (`?q=`, `?domain=`, `?source=`) |
| `PATCH` | `/api/v1/orders/:id/status` | `CLIENT` (dueño) | Acepta (`ACCEPTED_BY_CLIENT`) o rechaza (`REJECTED_BY_CLIENT`) una cotización |
| `PATCH` | `/api/v1/orders/:id/cancel` | `CLIENT` (dueño) | Cancela solo pedidos aún pendientes de cotización, conservando historial |
| `GET` | `/api/v1/orders?status=` | `BAKER` / `ADMIN` | Lista pedidos filtrados por estado |
| `GET` | `/api/v1/quotes/calculate/:orderId` | `BAKER` | Estimación referencial de precio por reglas según atributos del rubro |
| `POST` | `/api/v1/quotes` | `BAKER` | Crea cotización y actualiza el pedido a `QUOTED` en una transacción ACID |

### 4.2. API interna — Servicio Especializado Python (`service-python`, puerto `8000`)

Documentación OpenAPI interactiva generada automáticamente por FastAPI en `http://localhost:8000/docs`.

| Método | Ruta | Entrada / Contrato | Respuesta estructurada |
|---|---|---|---|
| `GET` | `/health` | Cabecera opcional `X-Correlation-Id` | `{"status": "ok", "service": "service-python", "external_source": {"provider": "openverse", "status": "ready", "avg_latency_ms": ..., "cache_entries": ...}}` |
| `POST` | `/api/v1/nlp/structure-order` | `{"raw_text": string (5..2000), "domain": "cake" \| "tattoo"}` | `{"raw_text", "domain", "entities": {..., "confidence_score"}, "web_references": [{"title", "image_url", "source", "source_url", "license", "creator", "query_used", "retrieved_at"}], "extraction_meta": {"query_used", "raw_count", "valid_count", "invalid_dropped", "duplicates_removed", "cache_hit", "fallback_used", "latency_ms"}}` |
| `GET` | `/api/v1/nlp/metrics` | Sin parámetros | `{"web_retrieval": {"valid_records_rate_pct", "duplicate_rate_pct", "avg_latency_ms", "cache_hit_rate_pct", "fallback_rate_pct", ...}, "nlp_benchmark": {"benchmark_cases": 6, "evaluated_fields": 21, "matched_fields": 21, "entity_extraction_accuracy_pct": 100.0}}` |

---

## 5. Evaluación de la información recuperada y diseño adaptativo

### 5.1. Métricas de evaluación aplicadas
Expuestas en `/api/v1/nlp/metrics` y verificadas en [`service-python/app/tests/test_scraper.py`](service-python/app/tests/test_scraper.py) y [`test_api.py`](service-python/app/tests/test_api.py):
- **Porcentaje de registros válidos (`valid_records_rate_pct`):** proporción de resultados de Openverse que superan validación HTTPS, limpieza y deduplicación (**100 %** en un lote de 12 registros válidos y únicos; **40 %** en el lote de prueba con ruido y duplicados inyectados).
- **Porcentaje de duplicados filtrados (`duplicate_rate_pct`):** proporción de elementos descartados por URL canónica o título repetido (**40 %** en el lote de prueba con duplicados).
- **Tiempo de respuesta (`avg_latency_ms`):** se mide en cada ejecución; no se garantiza una latencia de la fuente externa. La caché se verifica con reloj controlado.
- **Exactitud de extracción de entidades (`entity_extraction_accuracy_pct`):** **100 % (21/21 atributos)** sobre los 6 casos multirubro del conjunto `EVALUATION_BENCHMARK`.

### 5.2. Especificación preliminar de la capacidad adaptativa (Módulo 3)
El diseño completo (variables de usuario, uso de información web, mecanismo híbrido `spaCy` + reglas + calibración histórica, explicabilidad, control del usuario, mitigación de sesgos y plan de evaluación) se encuentra detallado en [docs/proyecto.md — Sección 8](docs/proyecto.md#8-diseño-preliminar-de-la-capacidad-adaptativa-o-inteligente-módulo-3).

---

## 6. Ejecución con Docker Compose (recomendado)

Requisitos: Docker Engine / Docker Desktop con Compose v2.

```bash
cp .env.example .env        # opcional: define POSTGRES_PASSWORD y JWT_SECRET
docker compose up --build -d
docker compose ps           # los 4 contenedores deben quedar "healthy"
./scripts/smoke-test.sh     # recorre y verifica los 8 pasos del flujo E2E (EP1 + EP2)
```

| Servicio | URL |
|---|---|
| Frontend (web/PWA) | http://localhost:8080 |
| API NestJS | http://localhost:3000 (`GET /health`, `GET /api/v1/orders/nlp-metrics`) |
| Servicio NLP (FastAPI) | http://localhost:8000 (`GET /health`, `/docs`, `/api/v1/nlp/metrics`) |
| PostgreSQL | `localhost:5432` |

Al iniciar, el contenedor `backend` aplica automáticamente las migraciones (`prisma migrate deploy`) y carga los usuarios de demostración definidos en [`backend-nestjs/prisma/seed.js`](backend-nestjs/prisma/seed.js).

---

## 7. Desarrollo local sin Docker y compilación Android

Requisitos: Node.js 22, Python 3.12, PostgreSQL 16.

```bash
# 1. Servicio Python
cd service-python && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt && uvicorn app.main:app --reload --port 8000

# 2. Backend NestJS (otra terminal)
cd backend-nestjs && cp .env.example .env && npm ci
npx prisma migrate deploy && npm run prisma:seed && npm run start:dev

# 3. Frontend Angular/Ionic (otra terminal) -> http://localhost:4200
cd frontend && npm ci && npm start
```

### Android (Capacitor)
```bash
cd frontend
npm run cap:sync          # ng build --configuration android + npx cap sync android
npx cap open android      # abre Android Studio; o: cd android && ./gradlew assembleDebug
```

---

## 8. Pruebas automatizadas y calidad

```bash
cd backend-nestjs && npm run lint && npm test          # Jest (pruebas unitarias de servicios, guards, reintentos y deduplicación)
cd frontend && npm run lint && npm run test:ci         # Karma + Chrome headless (componentes, guards, calculadora y atributos)
cd service-python && ruff check . && pytest            # pytest (NLP, limpieza HTML, deduplicación, fallback y métricas)
cd terraform && terraform fmt -check -recursive && terraform validate
```

---

## 9. Pipeline DevSecOps y despliegue en Staging

Archivo: [`.github/workflows/devsecops-ci-cd.yml`](.github/workflows/devsecops-ci-cd.yml).

| Job | Qué hace | Quality Gate (bloquea si…) |
|---|---|---|
| `secrets-scan` | Gitleaks sobre todo el historial git | se detecta un secreto expuesto |
| `sast` | Semgrep (`p/default`, `p/typescript`, `p/python`) | existen hallazgos de seguridad |
| `backend` | `npm ci`, ESLint + Prettier, Jest con cobertura, build, `npm audit` | falla lint/prueba/build o hay vulnerabilidades HIGH/CRITICAL |
| `frontend` | `npm ci`, angular-eslint, Karma headless, build web/PWA, build Android + `cap sync`, `npm audit` | ídem |
| `python` | `pip install`, Ruff (lint + formato), pytest con cobertura (NLP + scraper + métricas), `pip-audit` | ídem |
| `terraform` | `fmt -check`, `init`, `validate`, `plan` de staging | configuración IaC inválida |
| `docker` | **Depende de los 6 anteriores.** `docker compose build`, Trivy en las 3 imágenes, `docker compose up --wait` y `./scripts/smoke-test.sh` | vulnerabilidad HIGH/CRITICAL corregible o falla el flujo E2E |
| `deploy-staging` | **Depende de `docker`.** Despliega versión verificada en `main`/tags `v*` y ejecuta health check + smoke test contra `STAGING_URL` | falla el endpoint `/health` o el smoke test post-despliegue |

---

## 10. Variables de entorno, secretos y limitaciones conocidas

### 10.1. GitHub Actions Variables y Secrets
- **Variables (`vars.*`):** `NODE_VERSION` (`22`), `PYTHON_VERSION` (`3.12`), `TERRAFORM_VERSION` (`1.9.8`); para staging: `RENDER_NLP_SERVICE_ID`, `RENDER_API_SERVICE_ID`, `RENDER_WEB_SERVICE_ID`, `NLP_URL`, `API_URL`, `STAGING_URL`. Sus valores se obtienen de Terraform.
- **Secrets (`secrets.*`):** `JWT_SECRET` y `DB_PASSWORD` opcionales para CI; `RENDER_API_KEY` y `SEED_BAKER_PASSWORD` para staging (ver [staging](docs/staging.md)).
- **Archivos de ejemplo:** [`.env.example`](.env.example), [`backend-nestjs/.env.example`](backend-nestjs/.env.example), [`service-python/.env.example`](service-python/.env.example) y [`terraform/render/variables.tf`](terraform/render/variables.tf).

### 10.2. Limitaciones actuales identificadas y trabajo futuro (hacia Entrega Final)
1. **Caché de referencias en memoria local:** El caché con TTL de `service-python` reside en la memoria del proceso; si se escalan múltiples instancias en el proveedor, cada réplica mantiene su propio caché.
2. **Cobertura de rubros:** Se admiten `general` (tipo de trabajo, cantidad, materiales, plazo y entrega), `cake` (pastelería) y `tattoo` (tatuajes). Los encargos generales usan extracción básica y corrección manual; se cotizan con los costos ingresados por el profesional, sin reglas específicas de otros rubros.
3. **Trabajo para el Módulo 3 (Entrega Final):** Completar la calibración automática de precios e insumos utilizando el histórico acumulado de cotizaciones aceptadas/rechazadas por profesional y ejecutar la evaluación comparativa frente a la línea base no adaptativa.

