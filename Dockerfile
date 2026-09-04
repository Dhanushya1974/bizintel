# syntax=docker/dockerfile:1
# Frontend: TanStack Start (SSR). Built with the Nitro "node-server" preset so the
# output is a plain Node server we can run in this container.

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
ENV CI=true
ENV SERVER_PRESET=node-server
ENV NITRO_PRESET=node-server

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY . .
# Baked into the client bundle at build time; point it at the backend service.
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/.output ./.output
EXPOSE 3000
USER node
CMD ["node", ".output/server/index.mjs"]
