-- Migration: Ajouter les 5 nouveaux champs d'inscription
-- Date: 2025-11-10
-- Description: Ajoute phone_number, date_of_birth, country, city, gender à la table users

-- Ajouter les nouvelles colonnes si elles n'existent pas
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "phone_number" varchar,
ADD COLUMN IF NOT EXISTS "date_of_birth" date,
ADD COLUMN IF NOT EXISTS "country" varchar,
ADD COLUMN IF NOT EXISTS "city" varchar,
ADD COLUMN IF NOT EXISTS "gender" varchar;

-- Ajouter le constraint CHECK pour gender (si la colonne vient d'être créée)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_gender_check'
  ) THEN
    ALTER TABLE "users" 
    ADD CONSTRAINT "users_gender_check" CHECK (gender IN ('male', 'female') OR gender IS NULL);
  END IF;
END $$;
