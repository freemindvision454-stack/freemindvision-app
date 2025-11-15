# Utiliser Node 20 pour la construction
FROM node:20 AS builder

# Définir le dossier de travail
WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./
COPY tsconfig.json ./

# Copier le code source
COPY . .

# Installer les dépendances
RUN npm install

# Builder le frontend (Vite)
RUN npm run build

# Copier le build Vite dans le backend Express
RUN mkdir -p server/public && cp -r dist/* server/public

# Transpiler TypeScript → dist/
RUN npm run build:server

# ----------------------------
# Étape finale
# ----------------------------
FROM node:20 AS runner

WORKDIR /app

# Copier uniquement ce qui est nécessaire
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Démarrer le serveur Node
CMD ["node", "dist/index.js"]