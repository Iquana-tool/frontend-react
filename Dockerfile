# ============== Stage 1: Dependencies (Bun for fast install) ==============
FROM oven/bun:1-alpine AS deps
WORKDIR /app

# Accept build arguments
ARG REACT_APP_API_BASE_URL
ARG REACT_APP_WS_URL
ARG PUBLIC_URL

# Set as environment variables for build (PUBLIC_URL overrides package.json "homepage")
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
ENV PUBLIC_URL=$PUBLIC_URL

# Copy package files
COPY package*.json ./

RUN bun install

# ============== Stage 2: Build (Node required for react-scripts/webpack) ==============
FROM node:20-alpine AS builder
WORKDIR /app

# Build args
ARG REACT_APP_API_BASE_URL
ARG REACT_APP_WS_URL
ARG PUBLIC_URL
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
ENV PUBLIC_URL=$PUBLIC_URL
ENV NODE_ENV=production

# Copy dependencies from Bun stage (no reinstall)
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./

# Copy source and build
COPY . .

# Build app for production with env vars
RUN npm run build

# ============== Stage 3: Production (minimal image) ==============
FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html

# Remove default nginx static content
RUN rm -rf ./*

# Copy built assets from builder
COPY --from=builder /app/build .

# Minimal nginx config for SPA: listen on 3000, fallback to index.html
RUN echo 'server { \
    listen 3000; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { try_files $uri $uri/ /index.html; } \
    location /static/ { add_header Cache-Control "public, max-age=31536000"; } \
  }' > /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
