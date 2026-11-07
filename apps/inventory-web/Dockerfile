# syntax=docker/dockerfile:1
FROM node:26.12.1-alpine AS build
ENV PNPM_HOME=/pnpm
ENV npm_config_store_dir=/pnpm/store
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter inventory-web...
RUN pnpm --filter inventory-web run build

FROM nginxinc/nginx-unprivileged:1.30.5-alpine
COPY apps/inventory-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/inventory-web/dist /usr/share/nginx/html
EXPOSE 8080
