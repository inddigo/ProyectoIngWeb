# ADR 002: NestJS como orquestador y Prisma con migraciones versionadas

## Estado
Aceptado

## Contexto
Se necesita un backend que concentre autenticación, reglas del ciclo de vida del pedido,
persistencia y la comunicación con el servicio de NLP. Los atributos de un pedido cambian según
el rubro (pastel ≠ tatuaje).

## Decisión
- **NestJS 11** organizado en módulos (`auth`, `users`, `orders`, `quotes`, `nlp`, `health`,
  `prisma`) con validación global de DTOs (`ValidationPipe` con `whitelist` y
  `forbidNonWhitelisted`).
- **PostgreSQL 16 + Prisma** con **migraciones versionadas** (`prisma/migrations`) aplicadas con
  `prisma migrate deploy` al iniciar el contenedor (no `db push`).
- Los atributos específicos del rubro se guardan en una columna **JSONB** (`orders.attributes`);
  las columnas comunes (estado, cliente, confianza) son relacionales.

## Consecuencias
- (+) Agregar un rubro no requiere migrar el esquema.
- (+) Cambios de esquema trazables y reproducibles en CI y staging.
- (−) Los atributos JSON no tienen restricciones a nivel de base de datos; se validan en el
  servicio Python y en la interfaz.
