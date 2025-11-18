# syntax=docker/dockerfile:1

############################
# Base image
############################
FROM node:20-slim AS base
WORKDIR /app

############################
# Install dependencies
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

# Copy frontend → server/public
COPY --from=build /app/dist ./server/public

# Copy backend → server/dist
COPY --from=build /app/server/dist ./server/dist

COPY package*.json ./

# Google Cloud Run will ALWAYS use port 8080
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/dist/index.js"]
