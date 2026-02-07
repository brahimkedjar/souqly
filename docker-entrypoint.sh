#!/bin/sh
set -e

cd /app/apps/api

# Run DB migrations (safe for production)
if [ -f prisma/schema.prisma ]; then
  npx prisma migrate deploy
fi

node dist/main
