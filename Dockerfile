# syntax=docker/dockerfile:1

############################
# 1 — Base deps
############################
FROM node:20-slim AS deps
WORKDIR /app

# Install build dependencies
RUN apt-get update -y && \
    apt-get install --no-install-recommends -y \
        python3 \
        build-essential && \
    rm -rf /var/lib/apt/lists/*

# Copy only package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm install --workspaces --include-workspace-root

############################
# 2 — Build stage
############################
FROM node:20-slim AS build
WORKDIR /app

# Copy everything
COPY . .

# Copy installed deps
COPY --from=deps /app/node_modules ./node_modules

# Build backend
RUN npm --workspace server run build

# Build frontend
RUN npm --workspace client run build

############################
# 3 — Production image
############################
FROM node:20-slim AS prod
WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy backend build
COPY --from=build /app/server/dist ./server/dist

# Copy frontend build to backend public folder
COPY --from=build /app/client/dist ./server/dist/public

# Copy root package files
COPY package*.json ./

EXPOSE 3000

CMD ["node", "server/dist/index.js"]