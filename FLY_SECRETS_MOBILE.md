# 🔐 Secrets à Ajouter sur Fly.io (MOBILE)

## Comment ajouter les secrets sur mobile :

1. Ouvrez votre app : **freemindvision-app**
2. Cliquez sur **"Configuration"** (onglet en bas)
3. Cherchez **"Secrets"** ou **"Environment Variables"**
4. Cliquez **"+ Add Secret"** ou **"+ New"**

---

## LES 5 SECRETS À AJOUTER :

### ✅ SECRET 1 : DATABASE_URL

**Nom** :
```
DATABASE_URL
```

**Valeur** :
```
postgresql://postgres.umulfmngekjummrmhbja:FreeMind2025Visio@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
```

---

### ✅ SECRET 2 : SESSION_SECRET

**Nom** :
```
SESSION_SECRET
```

**Valeur** : Allez sur ce lien et copiez la clé générée :
👉 **https://generate-random.org/encryption-key-generator?count=1&bytes=32**

Exemple de valeur générée :
```
a3f8d9e2c1b7a6f5e4d3c2b1a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0
```

---

### ✅ SECRET 3 : CLOUDINARY_CLOUD_NAME

**AVANT D'AJOUTER CE SECRET** :
1. Allez sur https://cloudinary.com/users/register_free
2. Créez un compte GRATUIT
3. Après connexion, vous verrez votre **Dashboard**
4. Notez votre **Cloud Name** (exemple: `dcabcd1234`)

**Nom** :
```
CLOUDINARY_CLOUD_NAME
```

**Valeur** :
```
(Votre Cloud Name depuis Cloudinary Dashboard)
```

---

### ✅ SECRET 4 : CLOUDINARY_API_KEY

Sur le même Dashboard Cloudinary :

**Nom** :
```
CLOUDINARY_API_KEY
```

**Valeur** :
```
(Votre API Key depuis Cloudinary Dashboard)
```

Exemple : `123456789012345`

---

### ✅ SECRET 5 : CLOUDINARY_API_SECRET

Sur le Dashboard Cloudinary, cliquez sur **"Reveal"** pour voir l'API Secret :

**Nom** :
```
CLOUDINARY_API_SECRET
```

**Valeur** :
```
(Votre API Secret depuis Cloudinary Dashboard)
```

Exemple : `abc123xyz456def789ghi012jkl345`

---

## ⚠️ IMPORTANT : Après avoir ajouté TOUS les secrets

1. ✅ Vérifiez que les **5 secrets** sont bien affichés dans la liste
2. ✅ L'application va **redémarrer automatiquement**
3. ✅ Attendez 2-3 minutes
4. ✅ Vérifiez les logs (onglet "Logs & Errors")

---

## 🎯 Logs attendus APRÈS l'ajout des secrets :

✅ Logs VERTS que vous devez voir :
```
[CLOUDINARY] ✅ Configured successfully
[DATABASE] Connection successful
[MIGRATION] ✅ Migrations complétées !
[SERVER] 🚀 Server started on port 8080
```

❌ Si vous voyez toujours des erreurs :
- Vérifiez qu'il n'y a **pas d'espaces** avant/après les valeurs
- Vérifiez que vous avez bien copié **TOUTES les valeurs complètes**
- Redémarrez manuellement : Overview → Menu (3 points) → Restart

---

## 💡 ASTUCE : Comment obtenir vos credentials Cloudinary

1. **Inscription** : https://cloudinary.com/users/register_free
2. **Connexion** : https://cloudinary.com/console
3. **Dashboard** : Vous verrez immédiatement vos 3 credentials
   - Cloud Name (en haut à gauche)
   - API Key (au centre)
   - API Secret (cliquez "Reveal" pour le voir)

---

## 📞 VÉRIFICATION FINALE

Une fois tous les secrets ajoutés :

1. Allez dans **"Overview"**
2. Cherchez l'URL de votre app (ex: `https://freemindvision-app.fly.dev`)
3. Ouvrez-la dans votre navigateur
4. Vous devriez voir la **page d'accueil** FreeMind Vision !

**Si ça fonctionne** = 🎉 **DÉPLOIEMENT RÉUSSI !**
