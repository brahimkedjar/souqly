#!/bin/sh
set -e

cd /app/apps/api

# Run DB migrations (safe for production)
if [ -f prisma/schema.prisma ]; then
  npx prisma migrate deploy
fi

if [ -f dist/main.js ]; then
  node dist/main.js
elif [ -f dist/src/main.js ]; then
  node dist/src/main.js
else
  echo "Cannot find compiled entrypoint in dist/" >&2
  ls -la dist || true
  exit 1
fi
