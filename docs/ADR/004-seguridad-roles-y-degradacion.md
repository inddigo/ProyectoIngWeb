# ADR 004: Autorización por roles y degradación controlada del servicio NLP

## Estado
Aceptado

## Contexto
Clientes y profesionales comparten la API. En la versión inicial cualquier visitante podía
listar todos los pedidos y aceptar cotizaciones ajenas. Además, el servicio Python puede fallar.

## Decisión
- JWT (`passport-jwt`) con roles `CLIENT`, `BAKER`, `ADMIN`. El registro público solo permite
  `CLIENT` o `BAKER`.
- El cliente solo ve y decide sobre **sus** pedidos (`GET /orders/mine`,
  `PATCH /orders/:id/status` valida dueño y que el estado sea `QUOTED`).
- Solo `BAKER` lista pedidos y crea cotizaciones; no se puede cotizar dos veces (409).
- `POST /orders/nlp-structure` es público para que el cliente explore antes de registrarse.
- Si FastAPI no responde o el contrato es inválido, NestJS devuelve una respuesta degradada
  (`fallback: true`) y el cliente completa los campos manualmente. `/health` informa el estado.
- `JWT_SECRET` es obligatorio en producción (mín. 32 caracteres); la app no inicia sin él.

## Consecuencias
- (+) Mínimo privilegio en la API y continuidad del flujo ante fallas del NLP.
- (−) El cliente debe crear una cuenta para confirmar un pedido (el borrador se conserva).
