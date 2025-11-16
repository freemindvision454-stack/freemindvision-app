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

RUN npm install

############################
# Build frontend + backend
############################
FROM deps AS build

COPY . .

# build Vite + compile TypeScript backend
RUN npm run build

############################
# Production image
############################
FROM node:20-slim AS prod
WORKDIR /app

ENV NODE_ENV=production

# Copy only what is needed
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist       # Vite build
COPY --from=build /app/server/dist ./server/dist
COPY package*.json ./

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
