#!/bin/sh
set -e

# Aplica migraciones versionadas (prisma/migrations) y carga datos de demo.
node node_modules/prisma/build/index.js migrate deploy
node prisma/seed.js

exec node dist/main.js
