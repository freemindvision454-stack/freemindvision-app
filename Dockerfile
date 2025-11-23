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

# Install build dependencies
RUN apt-get update -y && \
    apt-get install --no-install-recommends -y \
        build-essential \
        python3 \
        pkg-config && \
    rm -rf /var/lib/apt/lists/*

# Copy package manifests
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install root deps
RUN npm install

# Install server deps
WORKDIR /app/server
RUN npm install

# Install client deps
WORKDIR /app/client
RUN npm install

############################
# Build stage
############################
FROM base AS build

# Copy everything
COPY . .

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules

# Build backend
WORKDIR /app/server
RUN npm run build

# Build frontend
WORKDIR /app/client
RUN npm run build

############################
# Production image
############################
FROM node:20-slim AS prod
WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules

# Copy built backend
COPY --from=build /app/server/dist ./server/dist

# Copy built frontend
COPY --from=build /app/client/dist ./server/dist/public

# Copy root packages
COPY package*.json ./

# Expose port
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server/dist/index.js"]
