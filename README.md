# Servicio Adaptativo de Cotización Técnica para Pastelería Personalizada

Aplicación web y móvil adaptativa desarrollada para estandarizar la comunicación técnica entre clientes y pasteleros mediante Procesamiento de Lenguaje Natural (NLP) y referencias dinámicas obtenidas de la web.

## Arquitectura del Sistema

```
[ Frontend Multiplataforma ] ---> [ Backend Orquestador NestJS ] ---> [ PostgreSQL 16 ]
(Angular 18 + Ionic 8)                    |
                                          v
                              [ Servicio Python FastAPI ]
                              (NLP & Web Scraper)
```

- **Frontend Multiplataforma**: Angular 18 (Standalone Components & Signals), Ionic 8 y Capacitor para empaquetado Web, PWA y Android.
- **Backend Orquestador**: NestJS con Node.js, Prisma ORM y observabilidad centralizada.
- **Servicio Especializado NLP**: FastAPI en Python 3.12 con soporte de extracción de entidades (porciones, restricciones veganas/sin gluten, temáticas) y recuperación de imágenes web.
- **Persistencia**: PostgreSQL 16.
- **DevSecOps e Infraestructura**: Docker Compose, Terraform (IaC Staging) y GitHub Actions CI/CD Pipeline.

## Instrucciones de Instalación y Ejecución Local

### Prerrequisitos
- Node.js v22 LTS
- Python 3.12+
- Docker Desktop / Docker Compose
- Terraform >= 1.8.0

### Ejecución con Docker Compose
```bash
docker compose up --build
```

El sistema iniciará los siguientes servicios:
- **Frontend Angular**: `http://localhost:80`
- **Backend NestJS**: `http://localhost:3000`
- **Servicio Python NLP**: `http://localhost:8000`
- **PostgreSQL**: `localhost:5432`

## Endpoints de Salud (Observabilidad)
- NestJS & Python Status: `GET http://localhost:3000/health`
- Python Service Status: `GET http://localhost:8000/health`

## Enlace al Prototipo en Figma
- [Prototipo de Interfaz en Figma](https://figma.com)
