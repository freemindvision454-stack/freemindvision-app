# ----------------------------
# Phase 1 : Build
# ----------------------------
FROM node:18 AS builder

WORKDIR /app

# Copier les fichiers de config
COPY package.json package-lock.json ./
COPY tsconfig.json ./

# Copier tout le projet
COPY . .

# Installer les dépendances
RUN npm ci

# Build du frontend
RUN npm run build

# Copier le build frontend vers le backend
RUN mkdir -p server/public && cp -r dist/* server/public/

# Build du backend
RUN npm run build:server


# ----------------------------
# Phase 2 : Run
# ----------------------------
FROM node:18 AS runner

WORKDIR /app

# Copier uniquement ce qui est nécessaire
COPY --from=builder /app/package.json package.json
COPY --from=builder /app/package-lock.json package-lock.json
COPY --from=builder /app/server ./server

# Installer uniquement prod deps
RUN npm ci --omit=dev

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/dist/index.js"]
