# 🚂 Guide de Déploiement sur Railway - FreeMind Vision

## Pourquoi Railway plutôt que Vercel ?

✅ **Railway est PARFAIT pour FreeMind Vision** :
- Supporte les uploads de vidéos
- Sessions utilisateur persistantes
- WebSockets pour notifications en temps réel
- Base de données intégrée possible
- Apps full-stack Node.js/Express

---

## ⚡ Déploiement sur Railway (5 minutes)

### Étape 1 : Créer un Compte Railway

1. Allez sur **https://railway.app**
2. Cliquez sur **"Login"**
3. Choisissez **"Login with GitHub"**
4. Autorisez Railway

### Étape 2 : Créer un Nouveau Projet

1. Cliquez sur **"New Project"**
2. Sélectionnez **"Deploy from GitHub repo"**
3. Si demandé, autorisez Railway à accéder à vos repos
4. Sélectionnez **"freemind-vision"** (ou votre nom de repo)

### Étape 3 : Configuration Automatique

Railway va détecter automatiquement :
- ✅ Node.js 20
- ✅ Build command : `npm run build`
- ✅ Start command : `npm run start`

**Ne changez rien**, Railway fait tout automatiquement !

### Étape 4 : Variables d'Environnement

1. Dans Railway, cliquez sur votre projet
2. Allez dans **"Variables"**
3. Ajoutez les variables suivantes :

**OBLIGATOIRES :**

```
NODE_ENV=production
DATABASE_URL=[Votre URL Neon - copiez depuis Replit Secrets]
SESSION_SECRET=[Générez un secret aléatoire - 32+ caractères]
```

**⚠️ Important:** Ne configurez PAS `PORT` - Railway la configure automatiquement !

**OPTIONNELLES (pour toutes les fonctionnalités) :**

```
STRIPE_SECRET_KEY=[Votre clé Stripe]
VITE_STRIPE_PUBLIC_KEY=[Votre clé publique Stripe]
ISSUER_URL=[URL Replit Auth]
CLIENT_ID=[Client ID Replit Auth]
CLIENT_SECRET=[Client Secret Replit Auth]
```

### Étape 5 : Déployer

1. Railway commence à déployer **automatiquement**
2. Attendez 2-3 minutes
3. Une fois le build terminé, cliquez sur **"Generate Domain"**
4. Railway vous donne une URL : **https://votre-app.up.railway.app**

**✅ TERMINÉ ! Votre application est en ligne !**

---

## 📊 Avantages de Railway

✅ **Gratuit pour commencer** : $5 de crédit gratuit/mois
✅ **Support Node.js complet** : Serveur Express qui tourne 24/7
✅ **Base de données** : PostgreSQL inclus si besoin
✅ **SSL automatique** : HTTPS configuré automatiquement
✅ **Monitoring** : Logs et métriques en temps réel
✅ **Custom domains** : Ajoutez votre propre domaine

⚠️ **Note sur les uploads** : Le stockage Railway est éphémère. Pour uploads vidéo permanents, configurez Cloudflare R2 ou AWS S3 (voir section ci-dessous).

---

## 💰 Coûts Railway

**Plan Gratuit** :
- $5 de crédit/mois
- Parfait pour tester
- ~500 heures de runtime

**Plan Hobby** ($5/mois) :
- $5 de crédit + $5 supplémentaires
- Bon pour petites audiences

**Plan Pro** ($20/mois) :
- $20 de crédit inclus
- Pour production

**💡 Astuce** : Commencez gratuit, upgradez quand nécessaire !

---

## 🔧 Configuration Uploads Vidéo (IMPORTANT)

**⚠️ ATTENTION : Les uploads sur Railway sont ÉPHÉMÈRES**

Le stockage Railway est temporaire. Les vidéos uploadées seront perdues lors du redémarrage du serveur.

**Pour stockage permanent, vous DEVEZ configurer un service cloud :**

### Option 1 : Cloudflare R2 (Recommandé - Gratuit)

**Avantages** :
- ✅ Gratuit jusqu'à 10GB de stockage
- ✅ API compatible S3
- ✅ Rapide et fiable

**Configuration** :
1. Créez un compte sur https://cloudflare.com
2. Allez dans "R2 Object Storage"
3. Créez un bucket "freemind-videos"
4. Obtenez vos clés API (Access Key + Secret Key)
5. Ajoutez dans Railway Variables :
   ```
   R2_ENDPOINT=https://[YOUR-ACCOUNT-ID].r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=[Votre Access Key]
   R2_SECRET_ACCESS_KEY=[Votre Secret Key]
   R2_BUCKET_NAME=freemind-videos
   ```

### Option 2 : AWS S3 (Payant mais éprouvé)

**Configuration** :
1. Créez un compte AWS
2. Créez un bucket S3
3. Ajoutez dans Railway Variables :
   ```
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=[Votre Key]
   AWS_SECRET_ACCESS_KEY=[Votre Secret]
   AWS_S3_BUCKET=freemind-videos
   ```

**💡 Pour commencer :**
- Testez l'app avec vidéos de test
- Configurez le stockage cloud avant d'inviter des vrais utilisateurs
- Je peux vous aider à modifier le code pour utiliser R2/S3

---

## ✅ Checklist Finale

Avant de lancer :

- [ ] Application déployée sur Railway
- [ ] Domaine généré et accessible
- [ ] Variables d'environnement configurées
- [ ] Base de données connectée
- [ ] Uploads de vidéos testés
- [ ] Authentification fonctionne
- [ ] Paiements Stripe testés (si configurés)

**🎉 Félicitations ! FreeMind Vision est en ligne !**
