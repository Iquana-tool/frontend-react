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

# Pre-compress the static assets so nginx can serve them with `gzip_static` instead of
# compressing on every request. Compressing at build time is free at runtime and lets us
# use level 9 without putting that cost on the request path.
#
# The .wasm files barely compress — they are already compressed internally — so the win
# there is small; it is the JavaScript and CSS this matters for. The wasm instead relies on
# the long-lived cache header below, which is what makes the quantification route cheap on
# every load after the first.
#
# `gzip -c` with a redirect rather than `-k`, because this runs under busybox gzip in the
# alpine builder and `-c` is the form that is portable across both.
RUN find build -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' \
    -o -name '*.json' -o -name '*.wasm' \) -size +1k \
    -exec sh -c 'gzip -9 -c "$1" > "$1.gz"' _ {} \;

# ============== Stage 2: Production (minimal image) ==============
FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html

# Remove default nginx static content
RUN rm -rf ./*

# Copy built assets from builder (vite.config.mjs keeps CRA's `build/` outDir)
COPY --from=builder /app/build .

# Minimal nginx config for SPA: listen on 3000, fallback to index.html.
#
# `gzip_static on` serves the .gz files built in stage 1 and is the important line: the
# stock nginx.conf leaves gzip commented out, so without this every asset goes over the
# wire uncompressed. `gzip on` is the fallback for anything that has no pre-built .gz.
RUN echo 'server { \
    listen 3000; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    gzip_static on; \
    gzip on; \
    gzip_comp_level 6; \
    gzip_min_length 1024; \
    gzip_vary on; \
    gzip_proxied any; \
    gzip_types text/plain text/css application/javascript application/json image/svg+xml application/wasm; \
    location / { try_files $uri $uri/ /index.html; } \
    location /assets/ { add_header Cache-Control "public, max-age=31536000"; } \
  }' > /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
