# ADR 005: Pipeline DevSecOps en GitHub Actions con quality gates bloqueantes

## Estado
Aceptado

## Contexto
La EP1 exige instalación reproducible, linting, pruebas, análisis estático, análisis de
dependencias, detección de secretos, construcción e imágenes, bloqueando ante fallas críticas.

## Decisión
- Jobs paralelos por componente (`backend`, `frontend`, `python`, `terraform`) y de seguridad
  (`secrets-scan` con Gitleaks sobre todo el historial, `sast` con Semgrep).
- El job `docker` depende de **todos** los anteriores: si uno falla, no se construyen imágenes.
- Trivy escanea las 3 imágenes (HIGH/CRITICAL con parche disponible bloquean). No se usa
  `.trivyignore`: las vulnerabilidades se corrigen en origen (imagen runtime sin npm,
  `apk upgrade` en nginx, dependencias actualizadas).
- Prueba de integración: se levanta el stack con Docker Compose y se ejecuta
  `scripts/smoke-test.sh` (cliente → NLP → cotización → aceptación, encargo general, cancelación y rechazo, con controles entre clientes).
- Acciones de terceros fijadas por SHA; `permissions: contents: read`.
- `npm ci` usa lockfiles. Python instala los rangos declarados en `requirements.txt`; `pip-audit` y Trivy verifican las versiones resueltas.

- Terraform valida el módulo Render y hace un plan sin conexión con tres servicios Free.
- El despliegue se habilita para `main` o tags de versión después de la integración. Usa la API de Render con el SHA aprobado y comprueba salud, revisión y recuperación real. CI utiliza una fuente sintética explícita; staging exige Openverse real.

## Consecuencias
- (+) Evidencia verificable de controles que impiden continuar ante errores.
- (−) El pipeline tarda más (≈10 min) por la integración con contenedores.
