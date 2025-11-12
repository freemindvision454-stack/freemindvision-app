# 🚀 Guide de Déploiement Fly.io - FreeMind Vision

Ce guide vous accompagne pas à pas pour déployer FreeMind Vision sur **Fly.io** avec **Cloudinary** pour le stockage de médias et **Supabase** pour la base de données.

---

## 📋 Prérequis

### 1️⃣ Compte Fly.io
- Créez un compte sur https://fly.io/app/sign-up
- Free tier disponible : 3 shared-cpu VMs, 160GB bandwidth/mois

### 2️⃣ Installation de flyctl (CLI)
```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### 3️⃣ Authentification
```bash
fly auth login
```

### 4️⃣ Compte Cloudinary
- Créez un compte sur https://cloudinary.com/users/register_free
- Free tier : 25 GB stockage, 25 GB bandwidth/mois
- Notez vos credentials (Dashboard → API Keys) :
  - **Cloud Name**
  - **API Key**
  - **API Secret**

### 5️⃣ Base de Données Supabase
- Vous avez déjà votre projet Supabase : `umulfmngekjummrmhbja`
- Connection string format : `postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:6543/postgres`

---

## 🛠️ Étape 1 : Préparer le projet

### Vérifier les fichiers nécessaires

✅ **Dockerfile** - Créé automatiquement  
✅ **fly.toml** - Créé automatiquement  
✅ **.dockerignore** - Créé automatiquement

### Modifier le nom de l'app (optionnel)

Éditez `fly.toml` ligne 4 :
```toml
app = "freemindvision"  # Changez si le nom est déjà pris
```

---

## 🚀 Étape 2 : Créer l'application Fly.io

### Initialiser l'app

```bash
fly apps create freemindvision --org personal
```

**OU** si le nom est pris :
```bash
fly apps create freemindvision-prod --org personal
```

### Vérifier l'app créée
```bash
fly apps list
```

---

## 🔐 Étape 3 : Configurer les variables d'environnement

### 3.1 Variables publiques (fly.toml)

Déjà configurées dans `fly.toml` :
- `PORT=8080`
- `NODE_ENV=production`
- `MIGRATIONS_AUTO_RUN=true`

### 3.2 Secrets (encrypted)

**Base de données Supabase** :
```bash
fly secrets set DATABASE_URL="postgresql://postgres.umulfmngekjummrmhbja:VOTRE_MOT_DE_PASSE@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
```

**Session Secret** :
```bash
fly secrets set SESSION_SECRET="$(openssl rand -hex 32)"
```

**Cloudinary Credentials** :
```bash
fly secrets set CLOUDINARY_CLOUD_NAME="votre_cloud_name"
fly secrets set CLOUDINARY_API_KEY="votre_api_key"
fly secrets set CLOUDINARY_API_SECRET="votre_api_secret"
```

**Stripe (optionnel, pour les paiements)** :
```bash
fly secrets set STRIPE_SECRET_KEY="sk_live_..."
fly secrets set VITE_STRIPE_PUBLIC_KEY="pk_live_..."
```

### 3.3 Vérifier les secrets
```bash
fly secrets list
```

---

## 📦 Étape 4 : Premier déploiement

### Déployer l'application

```bash
fly deploy
```

**Ce qui se passe** :
1. ✅ Build de l'image Docker (multi-stage build)
2. ✅ Installation des dépendances Node.js
3. ✅ Build du frontend (Vite)
4. ✅ Build du backend (esbuild)
5. ✅ Déploiement sur Fly.io
6. ✅ Exécution automatique des migrations (MIGRATIONS_AUTO_RUN=true)
7. ✅ Démarrage du serveur Express

### Temps estimé
- **Premier déploiement** : 3-5 minutes
- **Déploiements suivants** : 1-2 minutes

---

## ✅ Étape 5 : Vérifier le déploiement

### Ouvrir l'application
```bash
fly open
```

### Vérifier les logs
```bash
fly logs
```

**Logs attendus** :
```
[DATABASE] 🔗 SSL/TLS enabled for cloud deployment
[MIGRATION] 🔧 Démarrage de la migration automatique
[MIGRATION] ✅ Migrations complétées !
[DATABASE] Connection successful
[CLOUDINARY] ✅ Configured successfully with cloud: votre_cloud_name
[SERVER] 🚀 Server started on port 8080
```

### Vérifier le statut
```bash
fly status
```

### Tester l'API
```bash
curl https://votre-app.fly.dev/health
```

Réponse attendue :
```json
{"status":"ok"}
```

---

## 🔄 Étape 6 : Déploiements ultérieurs

### Déployer les nouvelles versions
```bash
# Après avoir fait des changements de code
git add .
git commit -m "Update features"
fly deploy
```

### Déployer avec options
```bash
# Force rebuild (clear cache)
fly deploy --no-cache

# Remote build only (plus rapide)
fly deploy --remote-only

# Spécifier une région différente
fly deploy --region cdg
```

---

## 📊 Monitoring & Gestion

### Voir les logs en temps réel
```bash
fly logs --tail
```

### Voir les métriques
```bash
fly dashboard
```

### SSH dans le container
```bash
fly ssh console
```

### Redémarrer l'app
```bash
fly apps restart freemindvision
```

### Scaler l'application
```bash
# Augmenter la mémoire à 512 MB
fly scale memory 512

# Augmenter à 2 instances
fly scale count 2

# Retour à 1 instance
fly scale count 1
```

---

## 🌍 Étape 7 : Ajouter un domaine personnalisé (optionnel)

### Vérifier les domaines actuels
```bash
fly certs list
```

### Ajouter votre domaine
```bash
fly certs add freemindvision.com
```

### Configurer DNS

Ajoutez ces enregistrements DNS chez votre registrar :

**Pour domaine apex (freemindvision.com)** :
```
Type: A
Name: @
Value: [IP fournie par Fly.io]
```

**Pour www** :
```
Type: CNAME
Name: www
Value: freemindvision.fly.dev
```

### Vérifier le certificat SSL
```bash
fly certs show freemindvision.com
```

---

## 🔧 Dépannage

### Problème : Build échoue

**Solution 1** : Clear cache
```bash
fly deploy --no-cache
```

**Solution 2** : Augmenter la mémoire de build
Éditez `fly.toml` :
```toml
[build]
  [build.args]
    NODE_OPTIONS = "--max-old-space-size=4096"
```

### Problème : Migrations échouent

**Vérifier DATABASE_URL** :
```bash
fly ssh console
echo $DATABASE_URL
```

**Forcer les migrations** :
```bash
fly ssh console
npm run db:push
```

### Problème : Out of Memory

**Augmenter la mémoire** :
```bash
fly scale memory 512
```

**OU** ajouter swap :
```toml
[swap_size_mb]
  swap_size_mb = 512
```

### Problème : Cloudinary uploads échouent

**Vérifier les secrets** :
```bash
fly secrets list
```

**Re-set les credentials** :
```bash
fly secrets set CLOUDINARY_CLOUD_NAME="votre_cloud_name"
fly secrets set CLOUDINARY_API_KEY="votre_api_key"
fly secrets set CLOUDINARY_API_SECRET="votre_api_secret"
```

### Problème : App ne démarre pas

**Voir les logs détaillés** :
```bash
fly logs --tail
```

**Redémarrer** :
```bash
fly apps restart
```

---

## 💰 Coûts & Pricing

### Free Tier (suffisant pour démarrer)
- ✅ 3 shared-cpu-1x VMs (256MB RAM chacune)
- ✅ 160 GB bandwidth/mois
- ✅ Unlimited inbound data transfer
- ✅ Automatic SSL certificates
- ✅ 3 GB persistent volumes

### Si vous dépassez le free tier
- **shared-cpu-1x** : $1.94/mois (~2$/mois)
- **Bandwidth** : $0.02/GB après 160GB
- **Persistent Volume** : $0.15/GB/mois

### Estimation mensuelle pour FreeMind Vision (production)
- **1 instance always-on** : ~$2/mois
- **Bandwidth** (300GB) : ~$3/mois
- **Total** : ~$5/mois 🎉

---

## 📚 Ressources

### Documentation officielle
- **Fly.io Docs** : https://fly.io/docs/
- **Cloudinary Docs** : https://cloudinary.com/documentation
- **Supabase Docs** : https://supabase.com/docs

### Support
- **Fly.io Community** : https://community.fly.io
- **Cloudinary Support** : https://support.cloudinary.com

### Commandes utiles
```bash
# Voir toutes les apps
fly apps list

# Supprimer une app
fly apps destroy freemindvision

# Voir les régions disponibles
fly platform regions

# Créer une app dans une région spécifique
fly apps create --region cdg  # Paris

# Migrer vers une autre région
fly scale count 0
fly scale count 1 --region lhr  # London
```

---

## 🎯 Checklist finale

Avant de mettre en production :

- [ ] ✅ Tous les secrets sont configurés
- [ ] ✅ DATABASE_URL pointe vers Supabase production
- [ ] ✅ Cloudinary credentials sont valides
- [ ] ✅ Migrations s'exécutent correctement
- [ ] ✅ L'app répond sur https://votre-app.fly.dev
- [ ] ✅ Upload de vidéos fonctionne (teste avec Cloudinary)
- [ ] ✅ Inscription/connexion fonctionnent
- [ ] ✅ Logs ne montrent pas d'erreurs critiques
- [ ] ✅ Performance acceptable (test de charge)
- [ ] ✅ Monitoring configuré (fly dashboard)

---

## 🎉 Félicitations !

Votre application **FreeMind Vision** est maintenant déployée sur **Fly.io** ! 🚀

**URL de production** : `https://freemindvision.fly.dev`

Pour tout problème, vérifiez d'abord les logs : `fly logs --tail`

**Bon déploiement !** ✨
