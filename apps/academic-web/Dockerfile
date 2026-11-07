# syntax=docker/dockerfile:1
FROM node:24.22.1-alpine AS build
ENV PNPM_HOME=/pnpm
ENV npm_config_store_dir=/pnpm/store
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter academic-web...
RUN pnpm --filter academic-web run build

FROM nginxinc/nginx-unprivileged:1.31.7-alpine
COPY apps/academic-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/academic-web/dist /usr/share/nginx/html
EXPOSE 8080
