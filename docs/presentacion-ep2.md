# Presentación breve EP2: Cotiza

## Problema y avance

Los profesionales que trabajan por encargo reciben mensajes ambiguos y dedican tiempo a aclarar detalles y calcular precios. Cotiza convierte esas solicitudes en pedidos revisables, reúne referencias y ayuda a cotizar con costos reales. La propuesta es multirubro; esta versión incorpora encargos generales con campos editables, además de extracción especializada para pastelería y tatuajes. Los paneles permiten buscar, filtrar y seguir el ciclo del pedido, con cancelación antes de cotizar.

## Arquitectura y fuente

Angular/Ionic/Capacitor se comunica con NestJS. NestJS administra PostgreSQL y consulta FastAPI. Python realiza extracción de entidades y recuperación desde Openverse. Solo términos de catálogo se envían a la fuente externa; el texto completo permanece interno.

## Calidad de datos y persistencia

Se validan enlaces, limpian títulos, normaliza Unicode y se eliminan duplicados sobre todo el lote. Se muestran hasta cuatro referencias, conservando autor, licencia, enlace original, consulta y fecha. Las tasas de calidad se calculan antes de limitar la presentación.

## Evidencia y demostración

Recorrer el guion de `entrega2.md`. Mostrar pruebas de los tres componentes, el benchmark de 21 campos y la integración. Distinguir datos sintéticos de CI de una consulta real a Openverse.

## Adaptación prevista

El formulario y la asistencia se adaptan al rubro y completitud. El profesional conserva edición del cálculo y precio final. La calibración histórica y evaluación comparativa corresponden al Módulo 3.

## Estado del despliegue

La automatización valida el código y despliega el commit aprobado en Render Free, comprueba su SHA, salud y flujo real. Staging público: https://cotiza-ep2-web.onrender.com. El flujo real de Openverse, persistencia, consulta, cotización y aceptación fue comprobado; evidencia en `docs/evidence/staging-2026-10-20/`.
