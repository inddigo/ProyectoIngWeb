# Cotiza · Entrega Parcial 2

Aplicación para convertir pedidos de pastelería y tatuajes en datos editables, recuperar referencias visuales reales y completar la cotización entre cliente y profesional.

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
- Extracción NLP por rubro, contratos validados y degradación controlada.
- Openverse real: validación, limpieza, deduplicación, procedencia, autor, licencia y métricas.
- PostgreSQL persistente en Neon, con índices y control de acceso por propietario.
- Tres servicios Render Free creados con Terraform y comunicación autenticada hacia Python.
- Pipeline con pruebas, seguridad, escaneo Docker, integración y despliegue del SHA aprobado.

## Validación

32 pruebas backend, 33 Python, 15 frontend y cuatro pruebas del despliegue. Flujo real comprobado: recuperación, pedido persistido, consulta, cotización y aceptación. Consultar el pipeline del tag y su artefacto `ep2-staging-evidence` para la evidencia de esta versión exacta.

## Operación

Los servicios gratuitos pueden dormir y tardar en arrancar; las cuotas se comparten con otros servicios del workspace. La credencial CI autorizada vence el 27 de octubre de 2026 a las 21:42 (Chile continental): renovar `RENDER_API_KEY` para despliegues posteriores. Esto no detiene los servicios publicados. Openverse es externo y puede fallar; la interfaz informa ese estado sin inventar imágenes.
