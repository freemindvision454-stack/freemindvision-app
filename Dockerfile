# syntax=docker/dockerfile:1

############################
# Base image
############################
FROM node:20-slim AS base
WORKDIR /app

############################
# Dependencies Stage
############################
FROM base AS deps

# Install tools
RUN apt-get update -y && \
    apt-get install --no-install-recommends -y \
        build-essential \
        python3 \
        pkg-config && \
    rm -rf /var/lib/apt/lists/*

# Copy whole project first to ensure folder structure exists
COPY . .

# Install root deps
RUN npm install || true

# Install backend deps
WORKDIR /app/server
RUN npm install || true

# Install frontend deps
WORKDIR /app/client
RUN npm install || true

############################
# Build stage
############################
FROM base AS build
COPY --from=deps /app /app

# Build backend
WORKDIR /app/server
RUN npm run build

# Build frontend
WORKDIR /app/client
RUN npm run build

############################
# Production stage
############################
FROM node:20-slim AS prod
WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules

# Copy backend build
COPY --from=build /app/server/dist ./server/dist

# Copy frontend build into backend public folder
COPY --from=build /app/client/dist ./server/dist/public

# Copy package.json
COPY package*.json ./

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
