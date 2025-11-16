# syntax=docker/dockerfile:1

###############################
# Base image
###############################
ARG NODE_VERSION=20.18.1
FROM node:${NODE_VERSION}-slim AS base

WORKDIR /app
ENV NODE_ENV=production

###############################
# Build stage
###############################
FROM base AS build

# Install system deps required to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    python3 \
    pkg-config && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies (dev included for Vite build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npx vite build

# Move built frontend to server/public
RUN mkdir -p server/public && cp -r dist/public/* server/public/

###############################
# Production image
###############################
FROM base

# Copy app including built frontend
COPY --from=build /app /app

# Install only production dependencies
RUN npm ci --omit=dev

EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => process.exit(r.statusCode===200?0:1))"

# Start server
CMD ["node", "server/index.js"]
