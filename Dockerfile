# syntax = docker/dockerfile:1

ARG NODE_VERSION=20.18.1
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Node.js/Express"

WORKDIR /app

# Set production environment and PORT
ENV NODE_ENV="production"
ENV PORT="8080"

# Throw-away build stage
FROM base as build

# Install build dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    node-gyp \
    pkg-config \
    python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Install node modules
COPY package-lock.json package.json ./
RUN npm ci --include=dev

# Copy application code
COPY . .

# Build frontend with Vite
RUN npx vite build

# Copy Vite build to server/public
RUN mkdir -p server/public && cp -r dist/public/* server/public/

# Final stage
FROM base

# Install runtime dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=build /app /app

# Expose port 8080
EXPOSE 8080

# Health check with longer start period
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server with tsx
CMD [ "npx", "tsx", "server/index.ts" ]
