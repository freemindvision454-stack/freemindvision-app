# syntax = docker/dockerfile:1

ARG NODE_VERSION=20.18.1
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Node.js/Express"

WORKDIR /app

# Set production environment and PORT
ENV NODE_ENV="production"
ENV PORT="8080"

# ------------------------------
# Build stage
# ------------------------------
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
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy application code
COPY . .

# Compile TypeScript → JavaScript
RUN npm run build

# Build frontend with Vite
RUN npx vite build

# Copy Vite build to server/public
RUN mkdir -p server/public && cp -r dist/* server/public

# ------------------------------
# Final Stage (Runtime)
# ------------------------------
FROM base

# Install only runtime dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=build /app /app

# Expose port 8080
EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
  CMD node -e "require('http').get('http://localhost:${PORT}/')" || exit 1

# Start server (compiled JS)
CMD ["node", "dist/index.js"]
