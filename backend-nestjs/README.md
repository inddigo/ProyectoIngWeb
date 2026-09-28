# Backend NestJS

API REST orquestadora. Ver el [README principal](../README.md) para ejecución, endpoints y variables.

```bash
cp .env.example .env
npm ci && npx prisma generate
npx prisma migrate deploy && npm run prisma:seed
npm run start:dev      # http://localhost:3000
npm run lint && npm test
```

Nueva migración tras cambiar `prisma/schema.prisma`: `npx prisma migrate dev --name <cambio>`.
