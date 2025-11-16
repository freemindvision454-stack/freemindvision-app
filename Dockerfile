# syntax=docker/dockerfile:1

################################
# Base image
################################
ARG NODE_VERSION=20.18.1
FROM node:${NODE_VERSION}-slim AS base

WORKDIR /app
ENV NODE_ENV=production

################################
# Build stage
################################
FROM base AS build

# Install dependencies needed to build Node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    python3 \
    pkg-config && \
    rm -rf /var/lib/apt/lists/*

# Install ALL dependencies (dev included)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Copy built frontend to server/public
RUN mkdir -p server/public && cp -r dist/* server/public/

################################
# Production stage
################################
FROM base

# Copy app files and built frontend
COPY --from=build /app /app

# Install ONLY production dependencies
RUN npm install --omit=dev

# Expose correct DO port
EXPOSE 3000

# Optional healthcheck
HEALTHCHECK CMD curl -f http://localhost:3000/health || exit 1

# Start backend server
CMD ["node", "server/index.js"]