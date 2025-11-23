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

# Copy root and server dependencies
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install root + server + client dependencies
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

############################
# Build stage
############################
FROM deps AS build
COPY . .

# Build backend
RUN cd server && npm run build

# Build frontend
RUN cd client && npm run build

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

# Copy backend built files
COPY --from=build /app/server/dist ./server/dist

# Copy frontend build output → served by backend
COPY --from=build /app/client/dist ./server/dist/public

# Copy package files
COPY package*.json ./

# Expose port
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server/dist/index.js"]