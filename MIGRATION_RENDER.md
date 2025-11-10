# 🔧 Migration Base de Données Render

## Nouveaux Champs à Ajouter

Cette migration ajoute 5 nouveaux champs à la table `users` :
- `phoneNumber` (VARCHAR, nullable)
- `dateOfBirth` (VARCHAR, nullable)
- `country` (VARCHAR, nullable)
- `city` (VARCHAR, nullable)
- `gender` (VARCHAR, nullable - valeurs: 'male' ou 'female')

## Option 1 : Via Dashboard Render (Recommandé)

1. Allez sur https://dashboard.render.com
2. Cliquez sur **freemind-db** (votre base de données)
3. Cliquez sur **"PSQL Command"** en haut à droite
4. Cela ouvrira un terminal PostgreSQL
5. Copiez-collez cette commande SQL :

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "phoneNumber" VARCHAR,
ADD COLUMN IF NOT EXISTS "dateOfBirth" VARCHAR,
ADD COLUMN IF NOT EXISTS country VARCHAR,
ADD COLUMN IF NOT EXISTS city VARCHAR,
ADD COLUMN IF NOT EXISTS gender VARCHAR CHECK (gender IN ('male', 'female'));
```

6. Appuyez sur Entrée
7. Vous devriez voir : `ALTER TABLE` (succès ✅)

## Option 2 : Via Drizzle Push (depuis Replit)

Dans le Shell Replit, exécutez :

```bash
DATABASE_URL="postgresql://freemind_db_xra8_user:MOT_DE_PASSE@dpg-d48cec7g127c73c1g980-a.oregon-postgres.render.com:5432/freemind_db_xra8" npm run db:push --force
```

(Remplacez MOT_DE_PASSE par le mot de passe réel de votre DB Render)

## Vérification

Après la migration, testez l'inscription sur :
https://freemindvision-app-2.onrender.com/signup

Tous les champs devraient être présents :
- ✅ Téléphone
- ✅ Date de naissance
- ✅ Pays
- ✅ Ville
- ✅ Genre
