import { sql } from "drizzle-orm";
import { db } from "./db";

/**
 * Migration automatique pour ajouter les nouveaux champs d'inscription
 * S'exécute au démarrage de l'application
 */
export async function runMigrations() {
  try {
    console.log("[MIGRATION] Vérification des colonnes manquantes...");
    
    // Ajouter les nouvelles colonnes si elles n'existent pas
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "phoneNumber" VARCHAR,
      ADD COLUMN IF NOT EXISTS "dateOfBirth" VARCHAR,
      ADD COLUMN IF NOT EXISTS country VARCHAR,
      ADD COLUMN IF NOT EXISTS city VARCHAR,
      ADD COLUMN IF NOT EXISTS gender VARCHAR CHECK (gender IN ('male', 'female'))
    `);
    
    console.log("[MIGRATION] ✅ Migration terminée avec succès");
    
    // Vérifier que les colonnes existent
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('phoneNumber', 'dateOfBirth', 'country', 'city', 'gender')
    `);
    
    console.log(`[MIGRATION] ${result.rows.length}/5 nouvelles colonnes détectées`);
    
  } catch (error) {
    console.error("[MIGRATION] ⚠️ Erreur lors de la migration:", error);
    // Ne pas bloquer le démarrage si la migration échoue
    // (les colonnes existent peut-être déjà)
  }
}
