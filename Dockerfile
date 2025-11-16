# syntax=docker/dockerfile:1

################################
# Base image
################################
FROM node:20.18.1-slim AS base
WORKDIR /app

################################
# Install dependencies
################################
FROM base AS deps

# Install tools required for native modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    python3 \
    pkg-config && \
    rm -rf /var/lib/apt/lists/*

# Install ALL dependencies (dev included) for building
COPY package*.json ./
RUN npm install

################################
# Build stage
################################
FROM deps AS build

# Copy full project
COPY . .

# Build frontend + backend
RUN npm run build

################################
# Production stage
################################
FROM base AS prod

ENV NODE_ENV=production

# Copy only build result + node_modules
COPY --from=build /app /app

# Install only production dependencies
RUN npm install --omit=dev

# Expose port for DigitalOcean
EXPOSE 3000

# Healthcheck (optional)
HEALTHCHECK CMD curl -f http://localhost:3000/health || exit 1

# Start server (compiled TypeScript)
CMD ["node", "server/dist/index.js"]