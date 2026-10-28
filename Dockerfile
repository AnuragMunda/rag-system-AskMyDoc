FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile \
      --store-dir=/pnpm/store \
      --child-concurrency=1 \
      --network-concurrency=4

FROM deps AS build

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN pnpm build

# Reuse the same install and remove dev dependencies in place. This avoids a
# second full pnpm install (which can exhaust memory on small Docker VMs).
FROM build AS prod-deps

RUN pnpm prune --prod

FROM base AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node package.json ./

RUN mkdir -p /app/storage/documents && chown node:node /app/storage /app/storage/documents

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
