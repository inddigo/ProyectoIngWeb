# Cotiza — Plataforma de cotización inteligente para servicios personalizados

Plataforma SaaS multirubro que transforma pedidos escritos en lenguaje natural
(*"quiero una torta vegana para 20 personas con temática de Batman"*, *"un tatuaje de 15 cm
en el antebrazo a color"*) en formularios estructurados mediante NLP, busca referencias
visuales en la Web y permite al profesional cotizar con una calculadora de costos. El cliente
sigue su pedido y acepta o rechaza la cotización.

- **Definición del proyecto** (problema, usuarios, objetivos, alcance, fuente web, capacidad adaptativa): [docs/proyecto.md](docs/proyecto.md)
- **Arquitectura** (contexto, contenedores, despliegue, modelo de datos, flujo, ADR): [docs/arquitectura.md](docs/arquitectura.md)
- **Ambiente de staging**: [docs/staging.md](docs/staging.md)
- **Prototipo en Figma**: _pendiente — reemplazar por el enlace del equipo_ `https://www.figma.com/...`

## Arquitectura

```
 Navegador / PWA ──► nginx + Angular/Ionic ──┐
 App Android (Capacitor) ────────────────────┼──► NestJS (API REST, JWT) ──► PostgreSQL 16
                                             │            │
                                             │            └──► FastAPI + spaCy (NLP) ──► Openverse API
```

| Componente | Carpeta | Tecnología |
|---|---|---|
| Frontend multiplataforma | [`frontend/`](frontend) | Angular 20, Ionic 8, Capacitor 8 (Android), Service Worker (PWA) |
| Backend orquestador | [`backend-nestjs/`](backend-nestjs) | NestJS 11, Prisma 6, passport-jwt, class-validator |
| Servicio NLP + Web | [`service-python/`](service-python) | Python 3.12, FastAPI, spaCy `es_core_news_md`, httpx |
| Base de datos | — | PostgreSQL 16 (migraciones Prisma) |
| Infraestructura | [`terraform/`](terraform), [`docker-compose.yml`](docker-compose.yml) | Docker, Terraform (Google Cloud Run + Cloud SQL) |
| CI/CD | [`.github/workflows/`](.github/workflows/devsecops-ci-cd.yml) | GitHub Actions |

## Ejecución con Docker Compose (recomendado)

Requisitos: Docker Desktop 4.x (Compose v2).

```bash
cp .env.example .env        # opcional: define POSTGRES_PASSWORD y JWT_SECRET
docker compose up --build -d
docker compose ps           # los 4 servicios deben quedar "healthy"
./scripts/smoke-test.sh     # recorre el flujo completo de extremo a extremo
```

| Servicio | URL |
|---|---|
| Frontend (web/PWA) | http://localhost:8080 |
| API NestJS | http://localhost:3000 (`GET /health`) |
| Servicio NLP | http://localhost:8000 (`GET /health`, docs en `/docs`) |
| PostgreSQL | `localhost:5432` |

Al iniciar, el backend aplica las migraciones (`prisma migrate deploy`) y crea usuarios de
demostración definidos en [`backend-nestjs/prisma/seed.js`](backend-nestjs/prisma/seed.js)
(un profesional y un cliente). Para desactivarlos: `SEED_DEMO_DATA=false`.

> Si tenías un volumen de una versión anterior (creado con `prisma db push`), el nuevo compose
> usa el volumen `pgdata`. Para limpiar todo: `docker compose down -v`.

## Desarrollo local sin Docker

Requisitos: Node.js 22, Python 3.12, PostgreSQL 16.

```bash
# Servicio Python
cd service-python && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt && uvicorn app.main:app --reload --port 8000

# Backend (otra terminal)
cd backend-nestjs && cp .env.example .env && npm ci
npx prisma migrate deploy && npm run prisma:seed && npm run start:dev

# Frontend (otra terminal) -> http://localhost:4200
cd frontend && npm ci && npm start
```

### Android (Capacitor)

```bash
cd frontend
npm run cap:sync          # ng build --configuration android + npx cap sync android
npx cap open android      # abre Android Studio; o: cd android && ./gradlew assembleDebug
```

El build Android usa `src/environments/environment.android.ts` (`http://10.0.2.2:3000`, el host
visto desde el emulador). Para un dispositivo físico, cambiar a la IP LAN o a la URL de staging.

## API principal

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/health` | público | Estado de NestJS, PostgreSQL y servicio Python |
| POST | `/auth/register` | público | Registro (`CLIENT` o `BAKER`) |
| POST | `/auth/login` | público | Devuelve JWT |
| POST | `/api/v1/orders/nlp-structure` | público | Texto libre → atributos (NestJS → FastAPI) |
| POST | `/api/v1/orders` | CLIENT | Confirma un pedido |
| GET | `/api/v1/orders/mine` | CLIENT | Pedidos del cliente |
| PATCH | `/api/v1/orders/:id/status` | CLIENT (dueño) | Acepta/rechaza una cotización |
| GET | `/api/v1/orders?status=` | BAKER | Lista pedidos por estado |
| GET | `/api/v1/quotes/calculate/:orderId` | BAKER | Estimación por reglas |
| POST | `/api/v1/quotes` | BAKER | Envía cotización (transacción: cotización + estado) |

## Pruebas y calidad

```bash
cd backend-nestjs && npm run lint && npm test          # Jest (21 pruebas)
cd frontend && npm run lint && npm run test:ci         # Karma + Chrome headless (15 pruebas)
cd service-python && ruff check . && pytest            # pytest (14 pruebas)
cd terraform && terraform fmt -check -recursive && terraform validate
```

## Pipeline DevSecOps

Archivo: [`.github/workflows/devsecops-ci-cd.yml`](.github/workflows/devsecops-ci-cd.yml).
Se ejecuta en `push`/`pull_request` a `main` y `develop`, y en tags `v*`.

| Job | Qué hace | Bloquea si… |
|---|---|---|
| `secrets-scan` | Gitleaks sobre todo el historial git | se detecta un secreto |
| `sast` | Semgrep (`p/default`, `p/typescript`, `p/python`) | hay hallazgos |
| `backend` | `npm ci`, ESLint + Prettier, Jest con cobertura, build, `npm audit` | falla lint/prueba/build o hay vulnerabilidades HIGH+ |
| `frontend` | `npm ci`, angular-eslint, Karma headless, build web/PWA, build Android + `cap sync`, `npm audit` (runtime) | ídem |
| `python` | `pip install`, Ruff (lint + formato), pytest con cobertura, `pip-audit` | ídem |
| `terraform` | `fmt -check`, `init`, `validate`, `plan` de staging | configuración inválida |
| `docker` | **Depende de todos los anteriores.** `docker compose build`, Trivy en las 3 imágenes, `docker compose up --wait` y `scripts/smoke-test.sh` | vulnerabilidad HIGH/CRITICAL corregible o falla la integración |

Las acciones de terceros están fijadas por SHA y el token del workflow tiene solo `contents: read`.

## Variables y secretos

**GitHub Actions Variables** (Settings → Secrets and variables → Actions → *Variables*), no sensibles, todas con valor por defecto:

| Variable | Defecto | Uso |
|---|---|---|
| `NODE_VERSION` | `22` | Jobs de Node |
| `PYTHON_VERSION` | `3.12` | Job de Python |
| `TERRAFORM_VERSION` | `1.9.8` | Job de Terraform |
| `GCP_PROJECT_ID` | `cotiza-staging` | `terraform plan` |

**GitHub Actions Secrets** (*Secrets*), sensibles:

| Secreto | Uso |
|---|---|
| `JWT_SECRET` | Firma de JWT en la prueba de integración y en Terraform (`TF_VAR_jwt_secret`) |
| `DB_PASSWORD` | Contraseña de PostgreSQL en integración y Terraform (`TF_VAR_db_password`) |
| `GCP_ACCESS_TOKEN` | Opcional: token para `terraform plan` contra GCP real |

**Variables de entorno de ejecución** (ver `.env.example` de cada carpeta):

| Variable | Servicio | Descripción |
|---|---|---|
| `DATABASE_URL` | backend | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | backend | Obligatoria en producción (≥ 32 caracteres) |
| `PYTHON_SERVICE_URL` | backend | URL del servicio NLP |
| `CORS_ORIGINS` | backend | Orígenes permitidos (web dev, Ionic, Capacitor) |
| `SEED_DEMO_DATA` | backend | `true`/`false` para usuarios de demo |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | postgres | Credenciales de la base |
| `OPENVERSE_URL` | python | Endpoint de búsqueda de imágenes |

Los archivos `.env`, `*.tfvars` y estados de Terraform están excluidos en `.gitignore`.
