# Arquitectura

Los diagramas usan [Mermaid](https://mermaid.js.org/) y GitHub los renderiza directamente.

## 1. Diagrama de contexto (C4 nivel 1)

```mermaid
flowchart LR
    cliente(["👤 Cliente final<br/>describe su pedido en texto libre"])
    prof(["👩‍🍳 Profesional<br/>pastelero, tatuador, ..."])
    sistema["<b>Cotiza</b><br/>Plataforma de cotización inteligente<br/>para servicios personalizados"]
    openverse[("Openverse API<br/>imágenes CC")]

    cliente -- "Pedido en lenguaje natural,<br/>acepta/rechaza cotización" --> sistema
    prof -- "Revisa pedidos estructurados,<br/>calcula costos y cotiza" --> sistema
    sistema -- "Busca referencias visuales (HTTPS)" --> openverse
```

## 2. Diagrama de contenedores (C4 nivel 2)

```mermaid
flowchart TB
    subgraph dispositivos["Dispositivos"]
        web["Navegador / PWA"]
        android["App Android<br/>(Capacitor)"]
    end

    subgraph plataforma["Plataforma (Docker Compose / Cloud Run)"]
        fe["<b>Frontend</b><br/>Angular 20 + Ionic 8<br/>servido por nginx :8080<br/>proxy /api /auth /health"]
        be["<b>Backend orquestador</b><br/>NestJS 11 :3000<br/>Auth JWT · Pedidos · Cotizaciones · Salud"]
        py["<b>Servicio NLP</b><br/>FastAPI + spaCy :8000<br/>Extracción por rubro · Referencias web"]
        db[("<b>PostgreSQL 16</b><br/>Prisma ORM<br/>atributos en JSONB")]
    end

    ext[("Openverse API")]

    web -- "HTTPS (mismo origen)" --> fe
    android -- "HTTPS REST + JWT" --> be
    fe -- "REST JSON + JWT" --> be
    be -- "REST JSON<br/>POST /api/v1/nlp/structure-order" --> py
    be -- "SQL (Prisma)" --> db
    py -- "HTTPS" --> ext
```

### Responsabilidades

| Contenedor | Responsabilidad | Tecnología |
|---|---|---|
| Frontend | UI multiplataforma, formularios reactivos, guards por rol, interceptores de auth/errores, estado con Signals, PWA | Angular, Ionic, Capacitor, nginx |
| Backend | API REST, validación DTO, autenticación y autorización, ciclo de vida del pedido, cliente HTTP hacia NLP con degradación, migraciones | NestJS, Prisma, passport-jwt |
| Servicio NLP | Extracción de entidades por rubro, cálculo de confianza, obtención de referencias web con caché | FastAPI, spaCy `es_core_news_md`, httpx |
| Base de datos | Usuarios, pedidos, referencias web, cotizaciones | PostgreSQL 16 |

## 3. Flujo principal entre componentes

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente
    participant FE as Angular/Ionic
    participant BE as NestJS
    participant PY as FastAPI (NLP)
    participant OV as Openverse
    participant DB as PostgreSQL
    actor P as Profesional

    C->>FE: "Torta vegana para 20 personas temática Batman"
    FE->>BE: POST /api/v1/orders/nlp-structure {rawText, domain}
    BE->>BE: ValidationPipe (DTO)
    BE->>PY: POST /api/v1/nlp/structure-order {raw_text, domain}
    PY->>PY: spaCy + reglas → entidades + confianza
    PY->>OV: GET /v1/images?q=batman cake
    OV-->>PY: imágenes CC
    PY-->>BE: {entities, web_references}
    BE-->>FE: formulario estructurado
    C->>FE: corrige y confirma (requiere sesión CLIENT)
    FE->>BE: POST /api/v1/orders (JWT)
    BE->>DB: INSERT order (CONFIRMED_BY_CLIENT) + web_references
    P->>FE: abre panel "Por cotizar"
    FE->>BE: GET /api/v1/orders?status=CONFIRMED_BY_CLIENT (JWT BAKER)
    P->>FE: calculadora de costos → precio final
    FE->>BE: POST /api/v1/quotes
    BE->>DB: TX: INSERT quote + UPDATE order QUOTED
    C->>FE: acepta la cotización
    FE->>BE: PATCH /api/v1/orders/:id/status {ACCEPTED_BY_CLIENT}
    BE->>DB: UPDATE order (solo dueño, solo si QUOTED)
```

Si FastAPI no responde, NestJS responde con `fallback: true` y el cliente completa los campos
manualmente; `/health` reporta `pythonService: down` sin marcar la API como caída.

## 4. Modelo de datos inicial

```mermaid
erDiagram
    users ||--o{ orders : "realiza"
    orders ||--o{ web_references : "tiene"
    orders ||--o| quotes : "recibe"

    users {
        uuid id PK
        text email UK
        text password "hash bcrypt"
        text name
        enum role "CLIENT | BAKER | ADMIN"
        timestamp created_at
    }
    orders {
        uuid id PK
        uuid client_id FK
        text domain "cake | tattoo"
        text raw_text
        enum status "CONFIRMED_BY_CLIENT → QUOTED → ACCEPTED/REJECTED"
        jsonb attributes "atributos del rubro"
        text image_url
        float confidence_score
        timestamp created_at
    }
    web_references {
        uuid id PK
        uuid order_id FK
        text title
        text image_url
        text source
    }
    quotes {
        uuid id PK
        uuid order_id FK,UK
        decimal estimated_price
        text details
        jsonb breakdown "insumos, mano de obra, margen"
    }
```

Migración inicial: `backend-nestjs/prisma/migrations/20260928000000_init/migration.sql`.

### Ciclo de vida del pedido

```mermaid
stateDiagram-v2
    [*] --> CONFIRMED_BY_CLIENT: cliente confirma formulario
    CONFIRMED_BY_CLIENT --> QUOTED: profesional envía cotización
    QUOTED --> ACCEPTED_BY_CLIENT: cliente acepta
    QUOTED --> REJECTED_BY_CLIENT: cliente rechaza
    ACCEPTED_BY_CLIENT --> [*]
    REJECTED_BY_CLIENT --> [*]
```

## 5. Diagrama de despliegue preliminar (staging en Google Cloud)

```mermaid
flowchart TB
    gh["GitHub Actions<br/>CI/CD"] -- "docker push" --> ar[("Artifact Registry")]
    usuario(["Usuarios web / PWA / Android"])

    subgraph gcp["Google Cloud · proyecto staging · us-central1"]
        subgraph run["Cloud Run"]
            web["cotiza-staging-web<br/>nginx + Angular<br/>público"]
            api["cotiza-staging-api<br/>NestJS<br/>público"]
            nlp["cotiza-staging-nlp<br/>FastAPI<br/>ingress interno, invocable solo por api"]
        end
        sql[("Cloud SQL<br/>PostgreSQL 16<br/>db-f1-micro")]
        sm["Secret Manager<br/>JWT_SECRET · DATABASE_URL"]
    end

    usuario --> web
    usuario --> api
    api --> nlp
    api -- "Cloud SQL connector (/cloudsql)" --> sql
    api -. "lee secretos (cuenta de servicio dedicada)" .-> sm
    ar -. imágenes .-> run
```

Definido en [`terraform/`](../terraform). Ver [staging.md](staging.md).

## 6. Decisiones arquitectónicas (ADR)

| # | Decisión |
|---|---|
| [001](ADR/001-python-fastapi-nlp.md) | Python + FastAPI + spaCy para NLP como microservicio |
| [002](ADR/002-nestjs-orquestador-prisma.md) | NestJS como orquestador; Prisma con migraciones; atributos en JSONB |
| [003](ADR/003-frontend-ionic-capacitor.md) | Angular + Ionic standalone + Capacitor para web, PWA y Android |
| [004](ADR/004-seguridad-roles-y-degradacion.md) | Autorización por roles y degradación controlada del NLP |
| [005](ADR/005-pipeline-devsecops.md) | Pipeline DevSecOps con quality gates bloqueantes |
