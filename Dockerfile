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
COPY server/package*.json ./server/

RUN npm install

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

# Copy backend compiled files
COPY --from=build /app/server/dist ./server/dist

# Copy frontend build (public static files)
COPY --from=build /app/server/dist/public ./server/dist/public

# Copy package files
COPY package*.json ./

# Expose port for Kubernetes
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server/dist/index.js"]