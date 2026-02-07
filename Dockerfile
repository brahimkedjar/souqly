# syntax=docker/dockerfile:1
FROM node:20-bullseye AS builder
WORKDIR /app

# Install deps (workspaces)
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

# Copy source
COPY packages/shared packages/shared
COPY apps/api apps/api

# Build shared + api
RUN npm run -w packages/shared build
RUN npm run -w apps/api prisma:generate
RUN npm run -w apps/api build

FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy runtime files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh \
  && mkdir -p /app/apps/api/uploads

EXPOSE 3000
CMD ["/app/docker-entrypoint.sh"]
