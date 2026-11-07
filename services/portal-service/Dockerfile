# syntax=docker/dockerfile:1
FROM node:26.12.1-alpine AS build
ENV PNPM_HOME=/pnpm
ENV npm_config_store_dir=/pnpm/store
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter portal-service...
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm --filter portal-service prisma:generate \
    && pnpm --filter portal-service... run build
RUN pnpm --filter portal-service deploy --prod --legacy /out

FROM node:26.12.1-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/ ./
USER node
EXPOSE 3600
CMD ["node", "dist/src/main.js"]
