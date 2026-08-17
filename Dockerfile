# ============== Stage 1: Install + build (Bun) ==============
# Install and build run in the same stage on purpose. Vite 8 builds through
# rolldown, which resolves a platform- and libc-specific native binding at
# install time; installing on one image and building on another risks pulling in
# a binding that does not match the builder. One stage, one platform, no copy.
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Accept build arguments. These are baked into the bundle at build time — a
# static nginx image cannot pick them up later from the environment.
ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ARG PUBLIC_URL

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_URL=$VITE_WS_URL
# Path prefix the app is served under behind the reverse proxy; becomes Vite's
# `base`. Read only by vite.config.mjs, never exposed to client code.
ENV PUBLIC_URL=$PUBLIC_URL

# Copy manifest and lockfile first so the install layer caches independently of
# source changes. bun.lock is the lockfile of record; package-lock.json is stale
# and deliberately not used.
COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

# Copy source and build
COPY . .

RUN bun run build

# ============== Stage 2: Production (minimal image) ==============
FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html

# Remove default nginx static content
RUN rm -rf ./*

# Copy built assets from builder (vite.config.mjs keeps CRA's `build/` outDir)
COPY --from=builder /app/build .

# Minimal nginx config for SPA: listen on 3000, fallback to index.html
RUN echo 'server { \
    listen 3000; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { try_files $uri $uri/ /index.html; } \
    location /assets/ { add_header Cache-Control "public, max-age=31536000"; } \
  }' > /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
