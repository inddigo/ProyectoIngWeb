#!/bin/sh
set -e

# Si no se entrega DATABASE_URL, se arma desde POSTGRES_* codificando usuario y
# contraseña (caracteres como @ # / : romperían la URL si se concatenan tal cual).
if [ -z "$DATABASE_URL" ]; then
  DATABASE_URL=$(node -e "
    const e = encodeURIComponent, v = process.env;
    const host = v.POSTGRES_HOST || 'localhost', port = v.POSTGRES_PORT || '5432';
    console.log('postgresql://' + e(v.POSTGRES_USER) + ':' + e(v.POSTGRES_PASSWORD) + '@' + host + ':' + port + '/' + e(v.POSTGRES_DB) + '?schema=public');
  ")
  export DATABASE_URL
fi

# Aplica migraciones versionadas (prisma/migrations) y carga datos de demo.
node node_modules/prisma/build/index.js migrate deploy
node prisma/seed.js

exec node dist/main.js
