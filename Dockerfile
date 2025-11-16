# syntax=docker/dockerfile:1

############################
# Base image
############################
FROM node:20-slim AS base
WORKDIR /app

############################
# Dependencies stage
############################
FROM base AS deps

RUN apt-get update -y && \
    apt-get install --no-install-recommends -y \
        build-essential \
        python3 \
        pkg-config && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# installer proprement : npm ci
RUN npm ci

############################
# Build stage
############################
FROM deps AS build

COPY . .

# Build Vite (frontend) + build serveur
RUN npm run build

############################
# Production image
############################
FROM node:20-slim AS prod
WORKDIR /app

ENV NODE_ENV=production

# Copie node_modules de deps
COPY --from=deps /app/node_modules ./node_modules

# Build frontend → server/public
COPY --from=build /app/dist ./server/public

# Build backend → server/dist
COPY --from=build /app/server/dist ./server/dist

COPY package*.json ./

# DigitalOcean utilisera PORT automatiquement
ENV PORT=8080
EXPOSE 8080

# Lancer le serveur backend
CMD ["node", "server/dist/index.js"]