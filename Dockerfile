# ----------------------------
# Phase 1 : Build
# ----------------------------
FROM node:18 AS builder

WORKDIR /app

# Copier les fichiers de config
COPY package*.json ./
COPY tsconfig.json ./

# Copier tout le projet
COPY . .

# Installer les dépendances
RUN npm ci

# Build du frontend (Vite)
RUN npm run build

# Copier le build frontend vers le backend
RUN mkdir -p server/public && cp -r dist/* server/public

# Transpiler le backend TypeScript
RUN npm run build:server


# ----------------------------
# Phase 2 : Exécution
# ----------------------------
FROM node:18 AS runner

WORKDIR /app

# Copier uniquement ce qui est nécessaire
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist

# Installer seulement les deps prod
RUN npm ci --omit=dev

# Variables d’environnement
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Lancer le serveur
CMD ["node", "dist/index.js"]
