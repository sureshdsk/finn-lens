FROM node:20-slim AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

FROM base AS dev

CMD ["pnpm", "dev", "--host", "0.0.0.0"]

FROM base AS build

RUN pnpm build

FROM caddy:alpine AS prod

COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
