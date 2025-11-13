# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20.18.1
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Node.js/Express"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules (including node-gyp for bcrypt)
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

# Build frontend with Vite only
RUN npx vite build

# Copy build output to where server/vite.ts expects it
# Vite builds to dist/public, but server/vite.ts looks in server/public
RUN mkdir -p server/public && cp -r dist/public/* server/public/
# Keep all dependencies for production (tsx + vite needed by server)
# Note: server/vite.ts requires vite package even in production

# Final stage for app image
FROM base

# Install runtime dependencies (PostgreSQL client for migrations)
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy built application from build stage (with pruned dependencies)
COPY --from=build /app /app

# Expose port 8080 (Fly.io default)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server with tsx (handles TypeScript natively)
CMD [ "npx", "tsx", "server/index.ts" ]
