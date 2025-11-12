# 🔐 Configuration des Secrets Fly.io

## Si vous avez accès à un terminal/CLI

```bash
# 1. Base de données Supabase
fly secrets set DATABASE_URL="postgresql://postgres.umulfmngekjummrmhbja:FreeMind2025Visio@aws-0-eu-west-1.pooler.supabase.com:6543/postgres" --app freemindvision

# 2. Session Secret (générez automatiquement)
fly secrets set SESSION_SECRET="$(openssl rand -hex 32)" --app freemindvision

# 3. Cloudinary (remplacez par VOS valeurs)
fly secrets set CLOUDINARY_CLOUD_NAME="VOTRE_CLOUD_NAME" --app freemindvision
fly secrets set CLOUDINARY_API_KEY="VOTRE_API_KEY" --app freemindvision
fly secrets set CLOUDINARY_API_SECRET="VOTRE_API_SECRET" --app freemindvision
```

## Comment obtenir vos credentials Cloudinary ?

1. Allez sur https://cloudinary.com/users/register_free
2. Créez un compte GRATUIT
3. Après connexion, allez dans **Dashboard**
4. Vous verrez :
   - **Cloud Name** (ex: dcabcd1234)
   - **API Key** (ex: 123456789012345)
   - **API Secret** (cliquez sur "Reveal" pour le voir)

## Vérifier que les secrets sont configurés

```bash
fly secrets list --app freemindvision
```

Vous devriez voir :
- DATABASE_URL
- SESSION_SECRET
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

## Générer un SESSION_SECRET sans CLI

Si vous n'avez pas `openssl`, utilisez ce générateur :
https://generate-random.org/encryption-key-generator?count=1&bytes=32&cipher=aes-256-cbc&string=&password=

Copiez la clé générée et utilisez-la comme SESSION_SECRET.
