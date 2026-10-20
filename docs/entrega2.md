# Entrega Parcial 2: preparación y demostración

## Estado verificable

El código incorpora las correcciones de recuperación, privacidad, métricas, contratos y observabilidad. El despliegue cloud está automatizado pero **pendiente de ejecutar**, porque el equipo aún no tiene proyecto GCP con facturación ni servidor. No presentar esta preparación como cumplimiento total del requisito de staging.

## Evidencia local

Validación realizada el 20 de octubre de 2026:

- Backend: 32 pruebas Jest aprobadas; lint y compilación NestJS.
- Python: 32 pruebas aprobadas; Ruff y formato. Incluye procesamiento del lote completo, duplicados después del cuarto resultado, caché/expiración, aislamiento de pruebas, privacidad, timeout y recuperación.
- Frontend: 15 pruebas aprobadas; lint y compilación web/PWA.
- Terraform: configuración válida y plan sin refresco con 24 recursos nuevos, cero modificaciones y cero destrucciones. No se aplicó ese plan.
- La integración Docker se ejecuta con `docker-compose.ci.yml`: es una fuente sintética y se identifica como tal. La evidencia definitiva se encuentra en la ejecución de GitHub Actions de la versión evaluable.

## Correspondencia con la pauta EP2

1. Continuidad EP1: README, arquitectura, ADR-006 y correcciones versionadas. Contrastar con el feedback docente original y actualizar el tablero del equipo.
2. Fuente: Openverse API, caché TTL, procedencia y uso de términos de catálogo. Las licencias y autores desconocidos se indican como no informados; no se inventan permisos.
3. Preparación: validación HTTPS, limpieza HTML/Unicode, deduplicación del lote completo y actualización por expiración de caché.
4. Python/NestJS: contratos validados, límites de tiempo, un reintento, degradación controlada y pruebas. Swagger NestJS en `/api/docs`, FastAPI en `/docs`.
5. Persistencia: migración versionada, fecha, autor, licencia, consulta, enlace original, índices y unicidad por pedido/imagen.
6. Consulta: filtros de dominio, texto y fuente; los clientes acceden solo a referencias de sus pedidos.
7. Evaluación: tasa de válidos sobre todo el lote, duplicados y latencia; benchmark NLP de 21 campos. El 100 % del pequeño benchmark no representa exactitud general.
8. Integración: flujo fuente/Python/NestJS/PostgreSQL/frontend. CI es determinista; la demostración externa real queda pendiente del despliegue.
9. Diseño adaptativo: especificación preliminar en `proyecto.md`, con variables, decisión, control humano y evaluación futura. No se exige el motor final en esta etapa.
10. Pipeline/observabilidad: pruebas, seguridad, Terraform, logs correlacionados, salud y métricas; el despliegue falla ante configuración ausente o falta de recuperación real.
11. Documentación: README, arquitectura, ADR, APIs, staging, esta guía y presentación breve.

## Preparar la entrega evaluable

- Repositorio: https://github.com/inddigo/ProyectoIngWeb
- Cambios EP2: https://github.com/inddigo/ProyectoIngWeb/pull/14
- Tablero: https://github.com/users/inddigo/projects/3
- Prototipo: https://www.figma.com/design/u0EsbFF2IfE2B7LOor9WzQ/E1?node-id=3-90
- Nombre propuesto de versión: `v0.2.0-ep2`.
- Staging: pendiente de habilitar la cuenta y completar [staging.md](staging.md). La URL válida quedará en el resumen del workflow.

Publicar el tag/release sobre el SHA corregido, con sus pruebas aprobadas y evidencia de staging. Un borrador no es todavía una entrega publicada. No etiquetar el antiguo `main` que solo contiene EP1.

## Guion de demostración funcional

1. Abrir el frontend del staging y su `/health`; mostrar los tres componentes y el SHA evaluado.
2. Introducir una torta de chocolate para 20 personas con temática de cumpleaños. Mostrar campos editables, confianza y referencias con autor/licencia/enlace original.
3. Mostrar `fallback_used=false`, consulta de catálogo y cantidad válida/retornada. Si falla Openverse, explicar el estado degradado y reintentar; no presentarlo como recuperación exitosa.
4. Confirmar el pedido, recargar el panel y demostrar que las referencias proceden de PostgreSQL.
5. Cotizar como profesional y aceptar como cliente.
6. Abrir métricas y explicar el denominador de validez, duplicados y la limitación del benchmark.
7. Mostrar el pipeline y sus artefactos; ejecutar un caso de indisponibilidad y la continuación manual.

## Trazabilidad de participación

El historial ya registra aportes de Ferfishy, Joshua/Joshua Villavicencio y German-Oses. Ejemplos: `968e353` (ajustes Python), `fa9b1a0` (integración de documentación) y `8ed5df2` (enlace al prototipo). El equipo debe explicar sus aportes reales durante la demostración; esta guía no asigna trabajo ni participación no acreditados.

## Secuencia que realiza el equipo para publicar

1. Revisar las correcciones locales y subir la rama `ep2-integracion-web` (`git push origin ep2-integracion-web`). Las correcciones finales del pipeline y de dependencias deben incluirse; el primer commit de esta revisión no contiene esos últimos ajustes.
2. Esperar que la ejecución nueva de la PR #14 apruebe todos los controles de CI. No reutilizar la ejecución anterior fallida ni una ejecución de EP1.
3. Habilitar el proyecto cloud siguiendo `staging.md`, configurar el ambiente `staging` y revisar los recursos/costos.
4. Integrar la PR en `main` y comprobar el despliegue automático, su URL, SHA y el artefacto `ep2-staging-evidence` con recuperación real.
5. En GitHub, ir a Releases > Draft a new release. Crear `v0.2.0-ep2` sobre el commit corregido de `main`, incluir el enlace al staging y a la ejecución aprobada. Publicar solo cuando esa versión funcione.
6. Entregar el enlace de la release, repositorio, staging, tablero y Figma junto con la presentación y participación del equipo. No hace falta subir un ZIP adicional salvo indicación docente.

Estas instrucciones no sustituyen la configuración cloud ni una demostración real.
