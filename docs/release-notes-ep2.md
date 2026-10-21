# Cotiza · Entrega Parcial 2

Plataforma para ordenar pedidos personalizados y cotizar trabajos por encargo según costos reales. Esta versión admite encargos generales con campos editables, además de pastelería y tatuajes con extracción especializada.

- Web: https://cotiza-ep2-web.onrender.com
- Salud: https://cotiza-ep2-web.onrender.com/health
- API documentada: https://cotiza-ep2-web.onrender.com/api/docs
- Guía de entrega: `docs/entrega2.md`
- Presentación: `docs/presentacion-ep2.md`
- Evidencia inicial real: `docs/evidence/staging-2026-10-20/`
- Tablero: https://github.com/users/inddigo/projects/3
- Prototipo: https://www.figma.com/design/u0EsbFF2IfE2B7LOor9WzQ/E1?node-id=3-90

## Incluye

- Nueva presentación visual de Cotiza, formulario guiado, ejemplo editable, acceso y paneles con diseño adaptable.
- Encargos generales: tipo de trabajo, cantidad, materiales, plazo y entrega editables; cotización con costos del profesional.
- Búsqueda, filtros, conteos reales, actualización de paneles y cancelación con historial y control de concurrencia.
- Registro público sin privilegios profesionales, permisos vigentes desde PostgreSQL, límites de intentos, protección de sesión y política de seguridad del navegador. Android configurado para HTTPS.
- Extracción NLP por rubro, contratos validados y degradación controlada.
- Openverse real: validación, limpieza, deduplicación, procedencia, autor, licencia y métricas.
- PostgreSQL persistente en Neon, con índices y control de acceso por propietario.
- Tres servicios Render Free creados con Terraform y comunicación autenticada hacia Python.
- Pipeline con pruebas, seguridad, escaneo Docker, integración y despliegue del SHA aprobado.

## Validación

54 pruebas backend, 38 Python, 20 frontend y cuatro pruebas del despliegue. Flujo real comprobado: recuperación, pedido persistido, consulta, cotización y aceptación. Consultar el pipeline del tag y su artefacto `ep2-staging-evidence` para la evidencia de esta versión exacta.

## Operación

Auditoría de dependencias de producción sin alertas. Las herramientas locales del frontend mantienen una alerta de `braces` sin parche publicado, fuera de la imagen desplegada; alcance y mitigación en `docs/ADR/004-seguridad-roles-y-degradacion.md`. Las comprobaciones no equivalen a una garantía de seguridad absoluta.

Los servicios gratuitos pueden dormir y tardar en arrancar; las cuotas se comparten con otros servicios del workspace. La credencial CI autorizada vence el 27 de octubre de 2026 a las 21:42 (Chile continental): renovar `RENDER_API_KEY` para despliegues posteriores. Esto no detiene los servicios publicados. Openverse es externo y puede fallar; la interfaz informa ese estado sin inventar imágenes.
