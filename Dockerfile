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

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
        build-essential \
        python3 \
        pkg-config && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install


################################
# Build Stage
################################
FROM deps AS build
COPY . .
RUN npm run build


################################
# Production Stage
################################
FROM node:20-slim AS prod
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000
CMD ["node", "server/dist/index.js"]