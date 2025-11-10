-- Migration pour FreeMind Vision
-- Ajout des nouveaux champs d'inscription
-- Date: 2025-11-10

-- Ajouter les 5 nouveaux champs à la table users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "phoneNumber" VARCHAR,
ADD COLUMN IF NOT EXISTS "dateOfBirth" VARCHAR,
ADD COLUMN IF NOT EXISTS country VARCHAR,
ADD COLUMN IF NOT EXISTS city VARCHAR,
ADD COLUMN IF NOT EXISTS gender VARCHAR CHECK (gender IN ('male', 'female'));

-- Vérifier que les colonnes ont été ajoutées
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('phoneNumber', 'dateOfBirth', 'country', 'city', 'gender');
