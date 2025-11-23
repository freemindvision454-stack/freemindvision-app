# syntax=docker/dockerfile:1

############################
# Base image
############################
FROM node:20-slim AS deps
WORKDIR /app

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
RUN mkdir -p /app/server && cd /app/server && npm install || true

# Install client deps
RUN mkdir -p /app/client && cd /app/client && npm install || true

############################
# Build stage
############################
FROM node:20-slim AS build
WORKDIR /app

# Copy full project
COPY . .

# Copy deps
COPY --from=deps /app/node_modules ./node_modules

# Build backend
RUN cd server && npm run build || true

# Build frontend
RUN cd client && npm run build || true

############################
# Production image
############################
FROM node:20-slim AS prod
WORKDIR /app

ENV NODE_ENV=production

# Copy global node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy backend built files
COPY --from=build /app/server/dist ./server/dist

# Copy frontend build output
COPY --from=build /app/client/dist ./server/dist/public

# Copy package files
COPY package*.json ./

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
