#!/bin/sh
npx prisma db push --accept-data-loss
node dist/main.js
