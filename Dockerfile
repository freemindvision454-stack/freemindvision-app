# syntax=docker/dockerfile:1

############################
# Base image
############################
FROM node:20-slim AS base
WORKDIR /app

############################
# Dependencies install
############################
FROM base AS deps

RUN apt-get update -y && \
    apt-get install --no-install-recommends -y \
        build-essential \
        python3 \
        pkg-config && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

############################
# Build stage
############################
FROM deps AS build
COPY . .
RUN npm run build

############################
# Production image
############################
FROM node:20-slim AS prod
WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy frontend dist (vite / react / next build)
COPY --from=build /app/dist ./server/public

# Copy backend build
COPY --from=build /app/server/dist ./server/dist

# Copy package.json for version/env access
COPY package*.json ./

# PORT for Kubernetes / Alibaba Cloud
ENV PORT=3000
EXPOSE 3000

# Start backend server
CMD ["node", "server/dist/index.js"]