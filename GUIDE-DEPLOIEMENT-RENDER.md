# 🚀 Guide de Déploiement FreeMind Vision sur Render

## ✅ Prérequis

- ✅ Code sur GitHub : `https://github.com/freemindvision454-stack/freemindvision`
- ✅ Compte Render.com créé
- ✅ Base de données PostgreSQL (on va la créer sur Render)

---

## 📋 ÉTAPE 1 : Créer la Base de Données PostgreSQL

### 1.1 Dans Render Dashboard
1. Cliquez sur **"New +"** en haut
2. Sélectionnez **"PostgreSQL"**
3. Configurez :
   - **Name** : `freemind-vision-db`
   - **Database** : `freemindvision`
   - **User** : `freemindadmin`
   - **Region** : **Frankfurt** (Europe, plus proche de l'Afrique)
   - **Plan** : **Free** (pour commencer)
4. Cliquez sur **"Create Database"**

### 1.2 Récupérer l'URL de connexion
1. Une fois créée, ouvrez votre base de données
2. Cherchez **"Internal Database URL"**
3. **COPIEZ cette URL** - vous en aurez besoin !
   - Format : `postgresql://user:password@host/database`

---

## 📋 ÉTAPE 2 : Créer le Service Web

### 2.1 Créer un nouveau Web Service
1. Cliquez sur **"New +"** → **"Web Service"**
2. Connectez votre compte GitHub si ce n'est pas fait
3. Sélectionnez le repo : **`freemindvision`**
4. Cliquez sur **"Connect"**

### 2.2 Configuration du Service
Configurez les paramètres suivants :

**Informations de base :**
- **Name** : `freemind-vision`
- **Region** : **Frankfurt** (même région que la DB)
- **Branch** : `main`
- **Root Directory** : Laissez vide
- **Runtime** : **Node**

**Build & Deploy :**
- **Build Command** :
  ```bash
  npm install && npm run build
  ```
- **Start Command** :
  ```bash
  node start-prod.js
  ```

**Plan :**
- Choisissez **Starter** ($7/mois) ou **Free** (limité)

---

## 📋 ÉTAPE 3 : Configurer les Variables d'Environnement

Dans la section **"Environment"**, ajoutez ces variables :

### Variables OBLIGATOIRES :

**1. NODE_ENV**
```
NODE_ENV = production
```

**2. PORT**
```
PORT = 5000
```

**3. DATABASE_URL**
```
DATABASE_URL = [COLLEZ_URL_POSTGRES_ICI]
```
⚠️ Utilisez l'URL copiée à l'ÉTAPE 1.2

**4. SESSION_SECRET**
```
SESSION_SECRET = [GÉNÉRE_UN_CODE_ALÉATOIRE_32_CARACTÈRES]
```
💡 Vous pouvez générer un code aléatoire avec ce site : https://randomkeygen.com/

### Variables Stripe (OPTIONNELLES pour commencer) :

**5. STRIPE_SECRET_KEY**
```
STRIPE_SECRET_KEY = sk_test_...
```
(Récupérez-le depuis votre Dashboard Stripe)

**6. VITE_STRIPE_PUBLIC_KEY**
```
VITE_STRIPE_PUBLIC_KEY = pk_test_...
```
(Récupérez-le depuis votre Dashboard Stripe)

---

## 📋 ÉTAPE 4 : Déployer !

### 4.1 Lancer le déploiement
1. Une fois toutes les variables configurées
2. Cliquez sur **"Create Web Service"**
3. Render va automatiquement :
   - Cloner votre code GitHub
   - Installer les dépendances (`npm install`)
   - Builder le projet (`npm run build`)
   - Démarrer le serveur (`node start-prod.js`)

### 4.2 Suivre le déploiement
1. Vous verrez les logs en temps réel
2. Le build prend environ **5-10 minutes**
3. Cherchez ces messages de succès :
   ```
   ✓ Server successfully started on port 5000
   ✓ Environment: production
   ✓ Ready to accept connections
   ```

---

## 📋 ÉTAPE 5 : Initialiser la Base de Données

### 5.1 Accéder au Shell Render
1. Dans votre service web, allez dans l'onglet **"Shell"**
2. Ou utilisez le bouton **"Shell"** en haut à droite

### 5.2 Exécuter les migrations
```bash
npm run db:push
```

Cette commande va créer toutes les tables nécessaires :
- users
- videos
- comments
- likes
- gifts
- transactions
- badges
- referrals
- etc.

---

## ✅ ÉTAPE 6 : Vérifier que tout fonctionne

### 6.1 Tester l'application
1. Render vous donnera une URL : `https://freemind-vision.onrender.com`
2. Ouvrez cette URL dans votre navigateur
3. Vous devriez voir FreeMind Vision ! 🎉

### 6.2 Tester les endpoints
Testez les endpoints principaux :

**Health Check :**
```
https://freemind-vision.onrender.com/health
```
Devrait retourner : `{"status":"ok"}`

**API Health :**
```
https://freemind-vision.onrender.com/api/health
```

---

## 🔧 DÉPANNAGE

### Problème 1 : Le build échoue
**Erreur** : `npm install failed`

**Solution** :
1. Vérifiez que `package.json` existe à la racine
2. Vérifiez les logs pour voir quelle dépendance échoue
3. Peut-être besoin d'ajouter `NODE_VERSION` :
   ```
   NODE_VERSION = 20
   ```

### Problème 2 : Le serveur ne démarre pas
**Erreur** : `Application failed to respond`

**Solutions** :
1. Vérifiez que `start-prod.js` existe
2. Vérifiez les variables d'environnement
3. Vérifiez les logs : cherchez les erreurs

### Problème 3 : Erreur de base de données
**Erreur** : `Connection to database failed`

**Solutions** :
1. Vérifiez que `DATABASE_URL` est correcte
2. Vérifiez que la DB PostgreSQL est bien créée
3. La DB et le Web Service doivent être dans la **même région**

### Problème 4 : Le site est lent
**Cause** : Le plan Free de Render se met en veille après 15 min d'inactivité

**Solutions** :
1. Passez au plan **Starter** ($7/mois) - pas de veille
2. Ou utilisez un service de ping gratuit comme UptimeRobot

---

## 💰 COÛTS MENSUELS

### Configuration Minimale (Gratuit pour tester)
- **PostgreSQL** : Free tier (1GB, 90 jours)
- **Web Service** : Free tier (750h/mois, se met en veille)
- **TOTAL** : $0/mois

### Configuration Recommandée (Production)
- **PostgreSQL** : Starter ($7/mois) - 256MB RAM, 1GB stockage
- **Web Service** : Starter ($7/mois) - 512MB RAM, toujours actif
- **TOTAL** : $14/mois

### Configuration Performante
- **PostgreSQL** : Standard ($20/mois) - 2GB RAM, 10GB stockage
- **Web Service** : Standard ($25/mois) - 2GB RAM, haute performance
- **TOTAL** : $45/mois

---

## 🌐 DOMAINE PERSONNALISÉ

### Ajouter votre propre domaine
1. Dans votre Web Service, allez dans **"Settings"**
2. Section **"Custom Domain"**
3. Cliquez sur **"Add Custom Domain"**
4. Entrez votre domaine : `www.freemindvision.com`
5. Suivez les instructions pour configurer les DNS

---

## 📊 MONITORING

### Render Dashboard
- **Metrics** : CPU, RAM, requêtes/sec
- **Logs** : Logs en temps réel
- **Deploys** : Historique des déploiements

### Activer les Alertes
1. Settings → **Notifications**
2. Configurez des alertes email pour :
   - Échecs de déploiement
   - Erreurs serveur
   - Utilisation élevée CPU/RAM

---

## 🔄 MISES À JOUR AUTOMATIQUES

Render redéploie automatiquement quand vous poussez sur GitHub !

### Comment mettre à jour :
1. Faites vos modifications localement
2. Committez : `git commit -m "Nouvelle feature"`
3. Poussez : `git push origin main`
4. Render détecte le changement et redéploie ! 🚀

---

## ✅ CHECKLIST FINALE

- [ ] Base de données PostgreSQL créée
- [ ] Web Service créé et connecté au repo GitHub
- [ ] Toutes les variables d'environnement configurées
- [ ] Build réussi (vérifier les logs)
- [ ] Serveur démarré (chercher "Ready to accept connections")
- [ ] Migrations DB exécutées (`npm run db:push`)
- [ ] Site accessible via l'URL Render
- [ ] Endpoint /health retourne OK
- [ ] Authentification fonctionne
- [ ] Upload de vidéos fonctionne

---

## 🎉 FÉLICITATIONS !

FreeMind Vision est maintenant déployé sur Render ! 🚀

**URL de votre application** : `https://freemind-vision.onrender.com`

---

## 📞 SUPPORT

Si vous rencontrez des problèmes :
1. Vérifiez les logs Render en temps réel
2. Consultez la documentation Render : https://render.com/docs
3. Community Render : https://community.render.com

Bon déploiement ! 💪
