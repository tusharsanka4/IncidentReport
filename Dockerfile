FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY tsconfig.json tsconfig.build.json ./
COPY services ./services
COPY database ./database
RUN npm run build:runtime

FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node services/web/public ./services/web/public
COPY --chown=node:node database/migrations ./database/migrations
COPY --chown=node:node sample-data ./sample-data
COPY --chown=node:node deploy/container-entrypoint.cjs ./deploy/container-entrypoint.cjs
USER node
EXPOSE 3000 3001
ENTRYPOINT ["node", "deploy/container-entrypoint.cjs"]
CMD ["dist/services/api/src/index.js"]
