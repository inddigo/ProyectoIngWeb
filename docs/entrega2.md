# Entrega Parcial 2: preparación y demostración

## Estado verificable

El código incorpora las correcciones de recuperación, privacidad, métricas, contratos y observabilidad. El staging está desplegado en https://cotiza-ep2-web.onrender.com y el flujo completo con datos reales de Openverse fue aprobado. La evidencia está en `docs/evidence/staging-2026-10-20/`; revisar también el pipeline del tag de la release evaluable.

## Evidencia local

Validación actualizada el 21 de octubre de 2026:

- Backend: 54 pruebas Jest aprobadas; lint y compilación NestJS.
- Python: 38 pruebas aprobadas; Ruff y formato. Incluye procesamiento del lote completo, duplicados después del cuarto resultado, caché/expiración, aislamiento de pruebas, privacidad, timeout y recuperación.
- Frontend: 20 pruebas aprobadas; lint y compilación web/PWA.
- Despliegue Render: cuatro pruebas de protección (plan de pago, SHA distinto, destinos HTTP no autorizados y registro de revisión correcta).
- Integración local tras adaptar Render: flujo completo aprobado con fuente sintética, secreto entre servicios y límite de 512 MiB. Memoria observada después del flujo: Python 319 MiB, backend 54 MiB y frontend 13 MiB. No demuestra rendimiento con la CPU de Render ni recuperación externa real.
- Terraform Render: configuración válida y plan sin refresco con tres servicios Free, cero modificaciones y cero destrucciones. No se aplicó ese plan. La configuración GCP anterior es histórica.
- La integración Docker se ejecuta con `docker-compose.ci.yml`: es una fuente sintética y se identifica como tal. La evidencia definitiva se encuentra en la ejecución de GitHub Actions de la versión evaluable.

## Correspondencia con la pauta EP2

1. Continuidad EP1: README, arquitectura, ADR-006 y correcciones versionadas. Contrastar con el feedback docente original y actualizar el tablero del equipo.
2. Fuente: Openverse API, caché TTL, procedencia y uso de términos de catálogo. Las licencias y autores desconocidos se indican como no informados; no se inventan permisos.
3. Preparación: validación HTTPS, limpieza HTML/Unicode, deduplicación del lote completo y actualización por expiración de caché.
4. Python/NestJS: contratos validados, límites de tiempo, un reintento, degradación controlada y pruebas. Swagger NestJS en `/api/docs`, FastAPI en `/docs`.
5. Persistencia: migración versionada, fecha, autor, licencia, consulta, enlace original, índices y unicidad por pedido/imagen.
6. Consulta: filtros de dominio, texto y fuente; los clientes acceden solo a referencias de sus pedidos.
7. Evaluación: tasa de válidos sobre todo el lote, duplicados y latencia; benchmark NLP de 21 campos. El 100 % del pequeño benchmark no representa exactitud general.
8. Integración: flujo fuente/Python/NestJS/PostgreSQL/frontend. CI es determinista; el staging público también se comprobó con Openverse real.
9. Encargos generales: formulario editable, referencias de catálogo, cálculo con costos del profesional y validación de atributos. Los paneles tienen búsqueda, filtros, conteos y actualización; cancelación protegida frente a cambios concurrentes.
10. Diseño adaptativo: especificación preliminar en `proyecto.md`, con variables, decisión, control humano y evaluación futura. No se exige el motor final en esta etapa.
11. Pipeline/observabilidad: pruebas, seguridad, Terraform, logs correlacionados, salud y métricas; el despliegue falla ante configuración ausente o falta de recuperación real.
12. Documentación: README, arquitectura, ADR, APIs, staging, esta guía y presentación breve.

## Preparar la entrega evaluable

- Repositorio: https://github.com/inddigo/ProyectoIngWeb
- Cambios EP2: https://github.com/inddigo/ProyectoIngWeb/pull/14
- Tablero: https://github.com/users/inddigo/projects/3
- Prototipo: https://www.figma.com/design/u0EsbFF2IfE2B7LOor9WzQ/E1?node-id=3-90
- Nombre propuesto de versión: `v0.2.1-ep2`.
- Staging: https://cotiza-ep2-web.onrender.com. Operación y caducidad de la credencial CI: [staging.md](staging.md).

Publicar el tag/release sobre el SHA corregido, con sus pruebas aprobadas y evidencia de staging. Un borrador no es todavía una entrega publicada. No etiquetar el antiguo `main` que solo contiene EP1.

## Guion de demostración funcional

1. Abrir el frontend del staging y su `/health`; mostrar los tres componentes y el SHA evaluado.
2. Elegir Encargos generales y escribir: «Necesito 2 repisas de madera para el 2026-12-20 a domicilio». Revisar tipo de trabajo, cantidad, materiales, plazo y entrega, confianza y referencias con autor/licencia/enlace original. Repetir con pastelería o tatuajes para mostrar el cambio de campos.
3. Mostrar `fallback_used=false`, consulta de catálogo y cantidad válida/retornada. Si falla Openverse, explicar el estado degradado y reintentar; no presentarlo como recuperación exitosa.
4. Confirmar el pedido, recargar el panel y demostrar que las referencias proceden de PostgreSQL.
5. Buscar y filtrar el pedido en el panel profesional; cotizar con costos propios y aceptar o rechazar como cliente. Crear otro pedido y cancelarlo antes de cotizar; verificar que queda en el historial y ya no admite cotización.
6. Abrir métricas y explicar el denominador de validez, duplicados y la limitación del benchmark.
7. Mostrar el pipeline y sus artefactos; ejecutar un caso de indisponibilidad y la continuación manual.

## Trazabilidad de participación

El historial ya registra aportes de Ferfishy, Joshua/Joshua Villavicencio y German-Oses. Ejemplos: `968e353` (ajustes Python), `fa9b1a0` (integración de documentación) y `8ed5df2` (enlace al prototipo). El equipo debe explicar sus aportes reales durante la demostración; esta guía no asigna trabajo ni participación no acreditados.

## Publicación de la versión evaluable

La versión se publica como `v0.2.1-ep2` desde el commit corregido de la rama `ep2-integracion-web`. El tag identifica el código evaluable; no es necesario cambiar el antiguo `main` para que el tag sea válido. La PR #14 conserva la revisión y permite integrar después esa misma versión.

El pipeline del tag debe aprobar todas las etapas, incluido el despliegue y `ep2-staging-evidence`. La release publicada incluye los enlaces al staging, ejecución aprobada, tablero y Figma. El historial y los aportes del equipo se deben explicar durante la demostración.

Los servicios ya están creados y las variables/secretos de Actions están configurados en el repositorio con autorización del titular. La credencial CI vence el 27 de octubre de 2026 a las 21:42 (Chile continental); revisar `staging.md` para su renovación. Las cuentas de demostración están en un archivo privado local, excluido de Git.
