# ----------------------------
# Phase 1 : Build
# ----------------------------
FROM node:18 AS builder

# Dossier de travail
WORKDIR /app

# Copier seulement les fichiers nécessaires à l'installation
COPY package*.json ./
COPY tsconfig.json ./

# Copier tout le projet
COPY . .

# Installer dépendances complètes (dev + prod)
RUN npm ci

# Build FRONTEND (si tu as un client Vite)
RUN npm run build || echo "Pas de build frontend (Vite)"

# Déplacer le frontend buildé vers server/public si existe
RUN mkdir -p server/public && if [ -d "dist" ]; then cp -r dist/* server/public; fi

# Build BACKEND (TypeScript -> JavaScript)
RUN npm run build:server

# ----------------------------
# Phase 2 : Run / Exécution
# ----------------------------
FROM node:18 AS runner

# Set working directory
WORKDIR /app

# Copier les fichiers nécessaires
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server ./server

# Installer uniquement les dépendances de production
RUN npm ci --omit=dev

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=8080

# Exposer le port
EXPOSE 8080

# Démarrer l'API (backend)
CMD ["node", "server/dist/index.js"]
