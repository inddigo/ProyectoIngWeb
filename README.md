> **Entrega Final (`v1.0.0-ef`):** desplegada en staging público [cotiza-ep2-web.onrender.com](https://cotiza-ep2-web.onrender.com) (Render Free + PostgreSQL Neon Free, configuración IaC en [`terraform/render/`](terraform/render)). Resumen técnico y evidencias en [docs/entrega-final.md](docs/entrega-final.md) y [docs/staging.md](docs/staging.md).

# Cotiza — Plataforma de cotización inteligente para servicios personalizados

Plataforma para profesionales que trabajan por encargo: talleres, estudios, pastelerías,
organizadores de eventos y freelancers. Convierte solicitudes ambiguas en detalles
claros, referencias visuales con procedencia y cotizaciones adaptadas a los costos e historial
propio del profesional. En esta versión los rubros disponibles son encargos generales (con
campos editables), pastelería y tatuajes. Transforma pedidos escritos en lenguaje natural
(*"quiero una torta vegana para 20 personas con temática de Batman"*, *"un tatuaje de 15 cm
en el antebrazo a color"*) en formularios estructurados mediante NLP (`spaCy` + reglas), obtiene,
limpia, normaliza y deduplica referencias visuales desde la Web (Openverse API), las indexa en
PostgreSQL con metadatos de procedencia y asiste al profesional con una calculadora de costos
y recomendaciones explicables basadas en su historial aceptado (`cost-history-v1`). El cliente
sigue su pedido, puede cancelarlo antes de ser cotizado y acepta o rechaza la cotización. Ambos
paneles incluyen búsqueda por texto o número, filtros de rubro/estado, resumen de pedidos y
actualización manual.

- **Entrega final y evidencias**: [docs/entrega-final.md](docs/entrega-final.md), [reglas adaptativas y privacidad (ADR-007)](docs/ADR/007-recomendaciones-explicables-y-privacidad.md) y [evaluación con usuarios](docs/evaluation/protocolo-usuarios.md)
- **Definición del proyecto**: [docs/proyecto.md](docs/proyecto.md)
- **Arquitectura** (contexto C4, contenedores, despliegue, modelo de datos e índices, flujo, ADR 001–007): [docs/arquitectura.md](docs/arquitectura.md)
- **Ambiente de staging e infraestructura (Terraform)**: [docs/staging.md](docs/staging.md)
- **Prototipo en Figma**: [E1 — prototipo de interfaz](https://www.figma.com/design/u0EsbFF2IfE2B7LOor9WzQ/E1?node-id=3-90)
- **Tablero del proyecto**: [GitHub Projects — IngWeb](https://github.com/users/inddigo/projects/3)

---

## Equipo y distribución de responsabilidades

| Integrante | Usuario Git / GitHub | Responsabilidades principales (trazables en historial Git) |
|---|---|---|
| **Joshua Villavicencio** | `inddigo` | Arquitectura inicial (EP1), base multiplataforma Ionic/Angular/Capacitor, estructura NestJS/FastAPI/Docker, pipeline DevSecOps inicial, configuración de tablero GitHub Projects y gestión de merges/releases. |
| **Fernando Figueroa** | `Ferfishy` | Integración de EP2, propagación de contexto de correlación en NestJS, endurecimiento de imágenes Docker y auditoría de dependencias para Trivy, correcciones de lint y pruebas en el servicio Python. |
| **Germán Oses** | `German-Oses` | Enlace a Figma, mejoras de calidad web/privacidad/contratos en EP2, infraestructura Terraform y despliegue gratuito en Render + Neon, encargos generales, motor adaptativo explicable `cost-history-v1`, controles de privacidad/cuenta, observabilidad/métricas, pruebas de rollback/degradación y cierre CI/CD de la Entrega Final. |

---

## 1. Evolución incremental (EP1 → EP2 → Entrega Final)

1. **Base arquitectónica y DevSecOps (EP1):** Frontend multiplataforma Angular 20 + Ionic 8 + Capacitor 8 (web, PWA y Android), API REST en NestJS 11 con JWT/roles y PostgreSQL 16 (Prisma), servicio Python FastAPI + spaCy, Docker Compose y pipeline DevSecOps en GitHub Actions.
2. **Recuperación web, calidad y staging (EP2):** Limpieza, normalización Unicode `NFKC`, canonización HTTPS, caché TTL (`3600s`) y deduplicación en dos niveles (`service-python/app/services/scraper.py` + `UNIQUE(order_id, image_url)` en PostgreSQL), metadatos de procedencia, reintentos/timeout, `X-Correlation-Id`, métricas en `/api/v1/orders/nlp-metrics` y staging automatizado en Render Free + Neon Free ([ADR-006](docs/ADR/006-recuperacion-web-y-calidad-ep2.md)).
3. **Capacidad adaptativa verificable, privacidad, observabilidad y rollback (Entrega Final):** Migración aditiva `20261022000000_final_adaptation`, perfil profesional de costos (`GET/PUT /api/v1/quotes/profile`), motor explicable `cost-history-v1` (`POST /api/v1/quotes/recommend/:orderId`) con consentimiento opt-in y retiro de historial (`DELETE /api/v1/quotes/history`), gestión y baja de cuenta (`GET/PATCH/DELETE /auth/account`), métricas HTTP y alertas en `/health/metrics`, build automatizado de APK Android debug en CI y verificación de rollback local ([ADR-007](docs/ADR/007-recomendaciones-explicables-y-privacidad.md)).

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
| `GET` | `/health/metrics` | Público | Contadores HTTP, p95, tasa 5xx y alertas básicas en ventana móvil de 60 s |
| `POST` | `/auth/register` | Público | Registro de cliente (`CLIENT`); las cuentas profesionales se aprovisionan de forma controlada |
| `POST` | `/auth/login` | Público | Autenticación; devuelve `access_token` JWT |
| `GET` / `PATCH` / `DELETE` | `/auth/account` | Autenticado | Exportación de datos propios, actualización de nombre y baja de cuenta validando contraseña |
| `POST` | `/api/v1/orders/nlp-structure` | Público | Texto libre → atributos + referencias web limpias + `extraction_meta` (NestJS → FastAPI con retry y fallback) |
| `GET` | `/api/v1/orders/nlp-metrics` | Público | Métricas de calidad de recuperación web y evaluación del benchmark NLP |
| `POST` | `/api/v1/orders` | `CLIENT` | Confirma un pedido y persiste sus `webReferences` deduplicadas con metadatos de procedencia |
| `GET` | `/api/v1/orders/mine` | `CLIENT` | Lista los pedidos del cliente autenticado (incluye `webReferences` y `quote`) |
| `GET` | `/api/v1/orders/web-references` | Autenticado | Busca referencias web indexadas en PostgreSQL (`?q=`, `?domain=`, `?source=`) |
| `PATCH` | `/api/v1/orders/:id/status` | `CLIENT` (dueño) | Acepta (`ACCEPTED_BY_CLIENT`) o rechaza (`REJECTED_BY_CLIENT`) una cotización |
| `PATCH` | `/api/v1/orders/:id/cancel` | `CLIENT` (dueño) | Cancela solo pedidos aún pendientes de cotización, conservando historial |
| `GET` | `/api/v1/orders?status=` | `BAKER` / `ADMIN` | Lista pedidos filtrados por estado |
| `GET` / `PUT` | `/api/v1/quotes/profile` | `BAKER` | Perfil propio de costos (valor hora, fijos, recargo y consentimiento de historial) |
| `DELETE` | `/api/v1/quotes/history` | `BAKER` | Retira historial propio, elimina recomendaciones y desactiva la adaptación |
| `POST` | `/api/v1/quotes/recommend/:orderId` | `BAKER` | Calcula y persiste recomendación explicable (`cost-history-v1`) comparada contra línea base |
| `GET` | `/api/v1/quotes/calculate/:orderId` | `BAKER` | Estimación referencial de precio por reglas según atributos del rubro |
| `POST` | `/api/v1/quotes` | `BAKER` | Crea cotización (recalculando totales en servidor y validando `recommendationId`) en transacción ACID |

### 4.2. API interna — Servicio Especializado Python (`service-python`, puerto `8000`)

Documentación OpenAPI interactiva generada automáticamente por FastAPI en `http://localhost:8000/docs`.

| Método | Ruta | Entrada / Contrato | Respuesta estructurada |
|---|---|---|---|
| `GET` | `/health` | Cabecera opcional `X-Correlation-Id` | `{"status": "ok", "service": "service-python", "external_source": {"provider": "openverse", "status": "ready", "avg_latency_ms": ..., "cache_entries": ...}}` |
| `POST` | `/api/v1/nlp/structure-order` | `{"raw_text": string (5..2000), "domain": "general" \| "cake" \| "tattoo"}` | `{"raw_text", "domain", "entities": {..., "confidence_score"}, "web_references": [{"title", "image_url", "source", "source_url", "license", "creator", "query_used", "retrieved_at"}], "extraction_meta": {"query_used", "raw_count", "valid_count", "invalid_dropped", "duplicates_removed", "cache_hit", "fallback_used", "latency_ms"}}` |
| `GET` | `/api/v1/nlp/metrics` | Sin parámetros | `{"web_retrieval": {"valid_records_rate_pct", "duplicate_rate_pct", "avg_latency_ms", "cache_hit_rate_pct", "fallback_rate_pct", ...}, "nlp_benchmark": {"benchmark_cases": 6, "evaluated_fields": 21, "matched_fields": 21, "entity_extraction_accuracy_pct": 100.0}}` |

---

## 5. Evaluación de la información recuperada y diseño adaptativo

### 5.1. Métricas de evaluación aplicadas
Expuestas en `/api/v1/nlp/metrics` y verificadas en [`service-python/app/tests/test_scraper.py`](service-python/app/tests/test_scraper.py) y [`test_api.py`](service-python/app/tests/test_api.py):
- **Porcentaje de registros válidos (`valid_records_rate_pct`):** proporción de resultados de Openverse que superan validación HTTPS, limpieza y deduplicación (**100 %** en un lote de 12 registros válidos y únicos; **40 %** en el lote de prueba con ruido y duplicados inyectados).
- **Porcentaje de duplicados filtrados (`duplicate_rate_pct`):** proporción de elementos descartados por URL canónica o título repetido (**40 %** en el lote de prueba con duplicados).
- **Tiempo de respuesta (`avg_latency_ms`):** se mide en cada ejecución; no se garantiza una latencia de la fuente externa. La caché se verifica con reloj controlado.
- **Exactitud de extracción de entidades (`entity_extraction_accuracy_pct`):** **100 % (21/21 atributos)** sobre los 6 casos multirubro del conjunto `EVALUATION_BENCHMARK`.

### 5.2. Capacidad adaptativa implementada (`cost-history-v1`)
Implementada en NestJS sobre PostgreSQL con reglas deterministas y explicables ([ADR-007](docs/ADR/007-recomendaciones-explicables-y-privacidad.md) y [docs/entrega-final.md](docs/entrega-final.md)):
- **Funcionamiento:** Parte de los costos reales ingresados (materiales, mano de obra y costos fijos recalculados en servidor) y el perfil propio del profesional. Cuando el profesional habilita explícitamente el uso de historial y cuenta con al menos 3 cotizaciones aceptadas comparables en los últimos 180 días, ajusta el recargo hacia la mediana histórica con un peso acotado (`min(0.5, aceptados/20)`), límite máximo de ±15 puntos y piso en el costo actual.
- **Transparencia y control:** Cada recomendación guarda versión, entradas, resultado y motivos legibles, se invalida si cambian los costos, y el profesional puede editarla, ignorarla o retirar todo su historial (`DELETE /api/v1/quotes/history`).
- **Comparación frente a línea base (`scripts/evaluate-final.cjs`):** Sobre los 8 escenarios sintéticos reproducibles ([`docs/evidence/final-local/adaptation.json`](docs/evidence/final-local/adaptation.json)), el error absoluto medio baja de **$7.537,50 CLP** (línea base sin historial) a **$5.430 CLP** (reglas adaptativas). Estos casos validan el comportamiento del motor y no sustituyen resultados de mercado ni pruebas con usuarios reales.

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

## 8. Pruebas automatizadas, degradación y rollback

```bash
cd backend-nestjs && npm run lint && npm test          # Jest (81 pruebas: servicios, guards, motor adaptativo, privacidad)
cd frontend && npm run lint && npm run test:ci         # Karma + Chrome headless (26 pruebas: componentes, guards, calculadora)
cd service-python && ruff check . && pytest            # pytest (38 pruebas: NLP, limpieza HTML, deduplicación, fallback, métricas)
cd terraform/render && terraform fmt -check -recursive && terraform validate
node scripts/evaluate-final.cjs docs/evidence/final-local/adaptation.json
```

- **Integración local completa:** `python scripts/final-check.py` (45 comprobaciones HTTP de permisos, adaptación, historial y privacidad; evidencia en [`docs/evidence/final-local/integration.json`](docs/evidence/final-local/integration.json)).
- **Degradación controlada:** `python scripts/verify-local-degradation.py` verifica caída y recuperación de Python sin inventar referencias ([`docs/evidence/final-local/degradation.json`](docs/evidence/final-local/degradation.json)).
- **Estrategia de rollback probada:** La migración `20261022000000_final_adaptation` es aditiva; `./scripts/verify-rollback.ps1` demuestra el retorno del backend a la versión estable de EP2 sobre el esquema ampliado y la restauración posterior ([`docs/evidence/final-local/rollback.json`](docs/evidence/final-local/rollback.json)). En Render, ante un fallo de despliegue o salud, se revierte al deploy previo estable desde el historial de despliegues o ejecutando `scripts/deploy-render.py` con el SHA anterior aprobado.

---

## 9. Pipeline DevSecOps y despliegue en Staging

Archivo: [`.github/workflows/devsecops-ci-cd.yml`](.github/workflows/devsecops-ci-cd.yml).

| Job | Qué hace | Quality Gate (bloquea si…) |
|---|---|---|
| `secrets-scan` | Gitleaks sobre todo el historial git | se detecta un secreto expuesto |
| `sast` | Semgrep (`p/default`, `p/typescript`, `p/python`) | existen hallazgos de seguridad |
| `backend` | `npm ci`, ESLint + Prettier, Jest con cobertura, build, `evaluate-final.cjs`, `npm audit --omit=dev` | falla lint/prueba/build o hay vulnerabilidades HIGH/CRITICAL |
| `frontend` | `npm ci`, angular-eslint, Karma headless, build web/PWA, `cap sync` + APK Android debug + `lintDebug`, `npm audit --omit=dev` | ídem |
| `python` | `pip install`, Ruff (lint + formato), pytest con cobertura, tests de deploy/estudio de usuarios, `pip-audit` | ídem |
| `terraform` | `fmt -check`, `init`, `validate`, `plan` offline en `terraform/render` | configuración IaC inválida |
| `docker` | **Depende de los 6 anteriores.** `docker compose build`, Trivy en las 3 imágenes, `docker compose up --wait`, `./scripts/smoke-test.sh` y `scripts/final-check.py` | vulnerabilidad HIGH/CRITICAL corregible o falla el flujo E2E |
| `deploy-staging` | **Depende de `docker`.** Despliega versión verificada en `main`/tags `v*` en Render Free y ejecuta health check + smoke test con Openverse real contra `STAGING_URL` | falla el endpoint `/health`, la revisión desplegada o el smoke test post-despliegue |

---

## 10. Variables de entorno, secretos y limitaciones conocidas

### 10.1. GitHub Actions Variables y Secrets
- **Variables (`vars.*`):** `NODE_VERSION` (`22`), `PYTHON_VERSION` (`3.12`), `TERRAFORM_VERSION` (`1.9.8`); para staging: `RENDER_NLP_SERVICE_ID`, `RENDER_API_SERVICE_ID`, `RENDER_WEB_SERVICE_ID`, `NLP_URL`, `API_URL`, `STAGING_URL`. Sus valores se obtienen de Terraform.
- **Secrets (`secrets.*`):** `JWT_SECRET` y `DB_PASSWORD` opcionales para CI; `RENDER_API_KEY` y `SEED_BAKER_PASSWORD` para staging (ver [staging](docs/staging.md)).
- **Archivos de ejemplo:** [`.env.example`](.env.example), [`backend-nestjs/.env.example`](backend-nestjs/.env.example), [`service-python/.env.example`](service-python/.env.example) y [`terraform/render/variables.tf`](terraform/render/variables.tf).

### 10.2. Limitaciones conocidas y trabajo futuro
1. **Caché de referencias y métricas en memoria por proceso:** El caché con TTL de `service-python` y la ventana móvil de `/health/metrics` residen en memoria por instancia; al escalar horizontalmente requerirían almacenamiento compartido (por ejemplo, Redis/Prometheus).
2. **Cobertura de rubros y motor determinista:** Se admiten `general`, `cake` y `tattoo`. El motor `cost-history-v1` es determinista y transparente (mediana acotada del historial propio), no un modelo predictivo de precios de mercado; pagos, chat, audio y facturación quedan fuera del alcance.
3. **Evaluación con usuarios y prueba en dispositivo físico Android:** El protocolo y script de análisis anónimo ([`docs/evaluation/protocolo-usuarios.md`](docs/evaluation/protocolo-usuarios.md), `scripts/analyze-user-study.py`) y la compilación del APK debug en CI (`cotiza-android-debug`) están listos, pero las observaciones con usuarios reales y la prueba instrumentada en teléfono/emulador físico permanecen abiertas para trabajo futuro / demostración.

