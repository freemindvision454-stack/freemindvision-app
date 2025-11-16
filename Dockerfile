# syntax=docker/dockerfile:1

################################
# Base image
################################
FROM node:20-slim AS base
WORKDIR /app


################################
# Dependencies Stage
################################
FROM base AS deps

# Install tools for native modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
        build-essential \
        python3 \
        pkg-config && \
    rm -rf /var/lib/apt/lists/*

# Copy package.json files
COPY package*.json ./

# Install ALL dependencies (dev + prod)
RUN npm install


################################
# Build Stage
################################
FROM deps AS build

# Copy the full project
COPY . .

# Build (Vite + backend build)
RUN npm run build


################################
# Production Stage
################################
FROM node:20-slim AS prod
WORKDIR /app

ENV NODE_ENV=production

# Copy ONLY what is needed in production
COPY --from=build /app/dist ./dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server/dist/index.js"]