# Arquitectura

Los diagramas usan [Mermaid](https://mermaid.js.org/) y GitHub los renderiza directamente.

## 1. Diagrama de contexto (C4 nivel 1)

```mermaid
flowchart LR
    cliente(["👤 Cliente final<br/>describe su pedido en texto libre"])
    prof(["👩‍🍳 Profesional<br/>trabajos por encargo"])
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

    subgraph plataforma["Plataforma (Docker Compose / Render Free + Neon)"]
        fe["<b>Frontend</b><br/>Angular 20 + Ionic 8<br/>servido por nginx :8080<br/>proxy /api /auth /health"]
        be["<b>Backend orquestador</b><br/>NestJS 11 :3000<br/>Auth JWT · Pedidos · Cotizaciones · Salud"]
        py["<b>Servicio NLP</b><br/>FastAPI + spaCy :8000<br/>Extracción por rubro · Referencias web"]
        db[("<b>PostgreSQL 16</b><br/>Prisma ORM<br/>atributos en JSONB")]
    end

    ext[("Openverse API")]

    web -- "HTTPS (mismo origen)" --> fe
    android -- "HTTPS REST + JWT" --> fe
    fe -- "REST JSON + JWT" --> be
    be -- "REST JSON<br/>POST /api/v1/nlp/structure-order<br/>X-Service-Token" --> py
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

    C->>FE: "Necesito 2 repisas de madera para el 2026-12-20 a domicilio"
    FE->>BE: POST /api/v1/orders/nlp-structure {rawText, domain}
    BE->>BE: ValidationPipe (DTO) + X-Correlation-Id
    BE->>PY: POST /api/v1/nlp/structure-order (retry=1, timeout=10s)
    PY->>PY: spaCy + reglas → entidades + confianza
    PY->>OV: GET /v1/images?q=wood furniture design (User-Agent + TTL cache)
    OV-->>PY: lote crudo de imágenes CC
    PY->>PY: Validación HTTPS + limpieza HTML/Unicode + deduplicación
    PY-->>BE: {entities, web_references, extraction_meta}
    BE-->>FE: formulario estructurado + métricas de extracción
    C->>FE: corrige y confirma (requiere sesión CLIENT)
    FE->>BE: POST /api/v1/orders (JWT)
    BE->>DB: INSERT order (CONFIRMED_BY_CLIENT) + web_references (deduplicadas)
    P->>FE: abre panel "Por cotizar"
    FE->>BE: GET /api/v1/orders (JWT BAKER), búsqueda y filtros locales
    P->>FE: calculadora de costos → precio final
    FE->>BE: POST /api/v1/quotes
    BE->>DB: TX: transición condicional a QUOTED + INSERT quote
    C->>FE: acepta la cotización
    FE->>BE: PATCH /api/v1/orders/:id/status {ACCEPTED_BY_CLIENT}
    BE->>DB: UPDATE order (solo dueño, solo si QUOTED)
```

Si FastAPI no responde tras el reintento acotado, NestJS responde con `fallback: true` y el cliente completa los campos
manualmente; `/health` reporta `pythonService: down` y las latencias de diagnóstico (`dbLatencyMs`, `nlpLatencyMs`) sin marcar la API como caída.

## 4. Modelo de datos e indexación (EP1 + EP2)

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
        text domain "general | cake | tattoo"
        text raw_text
        enum status "CONFIRMED_BY_CLIENT → QUOTED → ACCEPTED/REJECTED; CANCELLED"
        jsonb attributes "atributos del rubro"
        text image_url
        float confidence_score
        timestamp created_at
    }
    web_references {
        uuid id PK
        uuid order_id FK
        text title
        text image_url "UK (order_id, image_url)"
        text source "IDX"
        text source_url
        text license
        text creator
        text query_used "IDX"
        timestamp retrieved_at
        timestamp created_at
    }
    quotes {
        uuid id PK
        uuid order_id FK,UK
        decimal estimated_price
        text details
        jsonb breakdown "insumos, mano de obra, margen"
    }
```

Migraciones versionadas:
- `backend-nestjs/prisma/migrations/20260928000000_init/migration.sql` (EP1).
- `backend-nestjs/prisma/migrations/20261018000000_ep2_web_references_metadata/migration.sql` (EP2: metadatos de procedencia, restricción única compuesta e índices de consulta).

- `backend-nestjs/prisma/migrations/20261021000000_cancel_orders/migration.sql` (cancelación conservando historial).

### Ciclo de vida del pedido

```mermaid
stateDiagram-v2
    [*] --> CONFIRMED_BY_CLIENT: cliente confirma formulario
    CONFIRMED_BY_CLIENT --> CANCELLED_BY_CLIENT: cliente cancela antes de cotizar
    CANCELLED_BY_CLIENT --> [*]
    CONFIRMED_BY_CLIENT --> QUOTED: profesional envía cotización
    QUOTED --> ACCEPTED_BY_CLIENT: cliente acepta
    QUOTED --> REJECTED_BY_CLIENT: cliente rechaza
    ACCEPTED_BY_CLIENT --> [*]
    REJECTED_BY_CLIENT --> [*]
```

## 5. Despliegue vigente: Render Free y Neon

```mermaid
flowchart TB
    gh["GitHub Actions<br/>pruebas, escáneres e integración"]
    usuario(["Web / PWA / Android"])
    subgraph render["Render Free · Virginia · My Workspace"]
        web["cotiza-ep2-web<br/>Angular + nginx"]
        api["cotiza-ep2-api<br/>NestJS"]
        nlp["cotiza-ep2-nlp<br/>FastAPI + spaCy"]
    end
    db[("Neon Free · PostgreSQL 16")]
    ov[("Openverse API")]
    gh -- "API de despliegue: SHA aprobado" --> render
    usuario -- "HTTPS" --> web
    web -- "HTTPS REST + JWT" --> api
    api -- "HTTPS + X-Service-Token" --> nlp
    api -- "PostgreSQL TLS" --> db
    nlp -- "HTTPS, consulta de catálogo" --> ov
```

Los tres servicios son públicos por las restricciones del plan gratuito; Python exige
un secreto compartido salvo en `/health`. Los secretos residen en Render y en GitHub
Actions, nunca en el frontend. Render reconstruye el commit aprobado; el pipeline
comprueba el SHA publicado y el flujo real antes de dar el despliegue por válido.

Configuración activa: [`terraform/render/`](../terraform/render). Google Cloud fue
descartado; los recursos Terraform de la raíz y sus scripts se conservan como históricos.
Cuotas, suspensión y caducidad de credenciales: [staging.md](staging.md).

## 6. Decisiones arquitectónicas (ADR)

| # | Decisión |
|---|---|
| [001](ADR/001-python-fastapi-nlp.md) | Python + FastAPI + spaCy para NLP como microservicio |
| [002](ADR/002-nestjs-orquestador-prisma.md) | NestJS como orquestador; Prisma con migraciones; atributos en JSONB |
| [003](ADR/003-frontend-ionic-capacitor.md) | Angular + Ionic standalone + Capacitor para web, PWA y Android |
| [004](ADR/004-seguridad-roles-y-degradacion.md) | Autorización por roles y degradación controlada del NLP |
| [005](ADR/005-pipeline-devsecops.md) | Pipeline DevSecOps con quality gates bloqueantes |
| [006](ADR/006-recuperacion-web-y-calidad-ep2.md) | Pipeline de recuperación, limpieza, deduplicación, indexación y métricas web (EP2) |

