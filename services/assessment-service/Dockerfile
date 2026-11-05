# syntax=docker/dockerfile:1
FROM node:24.22.1-alpine AS build
ENV PNPM_HOME=/pnpm
ENV npm_config_store_dir=/pnpm/store
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter assessment-service...
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm --filter assessment-service prisma:generate \
    && pnpm --filter assessment-service... run build
RUN pnpm --filter assessment-service deploy --prod --legacy /out

FROM node:24.22.1-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/ ./
USER node
EXPOSE 4000
CMD ["node", "dist/src/main.js"]
