# ADR 004: Autorización por roles y degradación controlada del servicio NLP

## Estado
Aceptado

## Contexto
Clientes y profesionales comparten la API. En la versión inicial cualquier visitante podía
listar todos los pedidos y aceptar cotizaciones ajenas. Además, el servicio Python puede fallar.

## Decisión
- JWT (`passport-jwt`, algoritmo HS256) con roles `CLIENT`, `BAKER`, `ADMIN`. El registro público solo permite
  `CLIENT`. La cuenta profesional se aprovisiona con el despliegue: registrarse como `BAKER`
  daría acceso a los pedidos de todo el negocio. El rol vigente se consulta en la base de datos
  en cada solicitud autenticada; un token antiguo no conserva privilegios retirados.
- El cliente solo ve y decide sobre **sus** pedidos (`GET /orders/mine`,
  `PATCH /orders/:id/status` valida dueño y que el estado sea `QUOTED`).
- Solo `BAKER` lista pedidos y crea cotizaciones; no se puede cotizar dos veces (409).
- `POST /orders/nlp-structure` es público para que el cliente explore antes de registrarse.
- Si FastAPI no responde o el contrato es inválido, NestJS devuelve una respuesta degradada
  (`fallback: true`) y el cliente completa los campos manualmente. `/health` informa el estado.
- `JWT_SECRET` es obligatorio en producción (mín. 32 caracteres); la app no inicia sin él.
- El login admite diez intentos por cuenta/minuto; se normaliza el email y no se confía
  en cabeceras de IP del visitante. Hay presupuestos por instancia de 60 solicitudes/minuto
  para autenticación, 300 para la API y 30 para estructuración NLP. Se devuelve 429 y `Retry-After`.
- El cuerpo JSON está limitado a 32 KiB. Las contraseñas se limitan a 72 **bytes**, por bcrypt;
  en Render no se permite iniciar el seed con contraseñas de demostración ausentes o débiles.
- La web usa CSP sin scripts inline ni `eval`, impide embeberla en otros sitios y deshabilita
  cámara, micrófono y ubicación. Las respuestas de la API no se cachean. El cliente solo
  envía su token al origen de la API configurada, nunca a referencias externas.
- Android usa el staging HTTPS y no permite tráfico sin cifrar ni contenido mixto.

## Consecuencias
- (+) Mínimo privilegio en la API y continuidad del flujo ante fallas del NLP.
- (−) El cliente debe crear una cuenta para confirmar un pedido (el borrador se conserva).
- (−) Los límites en memoria se reinician con el proceso y se comparten entre visitantes.
  Son apropiados para la instancia única de demostración; al añadir réplicas se requiere
  almacenamiento compartido y una política de proxies explícita.
- Las pruebas y los escáneres reducen riesgos conocidos; no constituyen una garantía de
  ausencia absoluta de vulnerabilidades. El JWT dura un día y se almacena en el dispositivo;
  se debe cerrar sesión en equipos compartidos.

## Dependencias al 21 de octubre de 2026

`npm audit --omit=dev` no reporta alertas en backend ni frontend; el backend tampoco
reporta alertas al incluir desarrollo. Las herramientas del frontend conservan una
alerta raíz sin parche disponible, `braces` (GHSA-vfj7-8cjw-p6xm), propagada a doce
dependencias de compilación, pruebas y servidor local. No se incluyen en la imagen
publicada, que contiene solo Nginx y archivos estáticos. Se deben usar patrones de
archivos del repositorio, sin aceptar patrones de terceros, y mantener el servidor
de desarrollo limitado a localhost. Revisar de nuevo antes de actualizar estas herramientas.
