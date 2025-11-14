syntax=docker/dockerfile:1

-----------------------------

Base image

-----------------------------

ARG NODE_VERSION=20.18.1 FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js/Express" WORKDIR /app

Set production environment

ENV NODE_ENV=production ENV PORT=8080

-----------------------------

Build stage

-----------------------------

FROM base AS build

Install build dependencies

RUN apt-get update -qq && 
apt-get install --no-install-recommends -y 
build-essential 
node-gyp 
pkg-config 
python-is-python3 && 
rm -rf /var/lib/apt/lists/*

Copy package files

COPY package.json package-lock.json ./

Install dependencies

RUN npm ci --include=dev

Copy all application source

COPY . .

Build TypeScript backend

RUN npm run build

Build Vite frontend

RUN npx vite build

Move frontend build to server/public

RUN mkdir -p server/public && cp -r dist/* server/public

-----------------------------

Runtime stage

-----------------------------

FROM base AS runtime

Install only runtime dependencies

RUN apt-get update -qq && 
apt-get install --no-install-recommends -y 
ca-certificates && 
rm -rf /var/lib/apt/lists/*

Copy compiled application from build

COPY --from=build /app /app

Expose port

EXPOSE 8080

Healthcheck

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 
CMD node -e "require('http').get('http://localhost:8080', res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

Start server

CMD ["node", "dist/index.js"]
