import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { sql } from "drizzle-orm";

/**
 * Migration automatique SÛRE utilisant Drizzle Migrator + Advisory Lock
 * 
 * Sécurité garantie par :
 * - Journal de migrations (__drizzle_migrations) qui évite les réapplications
 * - Variable d'environnement MIGRATIONS_AUTO_RUN pour contrôler l'exécution
 * - Postgres advisory lock pour éviter les exécutions concurrentes
 * - Transactions automatiques pour garantir l'intégrité
 * - Logging détaillé pour diagnostic
 * 
 * Workflow :
 * 1. Vérifie MIGRATIONS_AUTO_RUN=true (sinon skip)
 * 2. Acquiert un advisory lock (bloque les exécutions concurrentes)
 * 3. Exécute les migrations via Drizzle Migrator
 * 4. Libère le lock
 */
export async function runMigrations() {
  let migrationClient: ReturnType<typeof postgres> | null = null;
  let lockAcquired = false;
  
  try {
    // Vérifier si les migrations automatiques sont activées
    const autoRunEnabled = process.env.MIGRATIONS_AUTO_RUN === 'true';
    
    if (!autoRunEnabled) {
      console.log("[MIGRATION] ⏭️  MIGRATIONS_AUTO_RUN non activé - migration ignorée");
      console.log("[MIGRATION] 💡 Pour activer : MIGRATIONS_AUTO_RUN=true");
      return;
    }
    
    console.log("[MIGRATION] 🔧 Démarrage de la migration automatique sécurisée...");
    
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL not configured");
    }
    
    // Force SSL/TLS by replacing any existing sslmode parameter
    const isLocalhost = process.env.DATABASE_URL.includes('localhost');
    let migrationConnectionString = process.env.DATABASE_URL;
    
    if (!isLocalhost) {
      // Remove any existing sslmode (including sslmode=disable)
      migrationConnectionString = migrationConnectionString.replace(/[?&]sslmode=[^&]*/g, '');
      // Add sslmode=require
      const separator = migrationConnectionString.includes('?') ? '&' : '?';
      migrationConnectionString = `${migrationConnectionString}${separator}sslmode=require`;
      console.log('[MIGRATION] 🔒 Forced SSL/TLS mode for migrations');
    }
    
    // Créer une connexion dédiée pour les migrations
    migrationClient = postgres(migrationConnectionString, {
      max: 1,
      ssl: isLocalhost ? false : 'require',
    });
    
    // Acquérir un advisory lock pour éviter les exécutions concurrentes
    // Lock ID : 123456789 (arbitraire mais unique pour cette application)
    console.log("[MIGRATION] 🔒 Acquisition du verrou de migration...");
    const lockResult = await migrationClient`SELECT pg_try_advisory_lock(123456789) as acquired`;
    lockAcquired = lockResult[0]?.acquired || false;
    
    if (!lockAcquired) {
      console.log("[MIGRATION] ⏳ Une autre instance exécute déjà les migrations - en attente...");
      // Attendre que l'autre instance termine (avec timeout de 30s)
      let attempts = 0;
      while (!lockAcquired && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryResult = await migrationClient`SELECT pg_try_advisory_lock(123456789) as acquired`;
        lockAcquired = retryResult[0]?.acquired || false;
        attempts++;
      }
      
      if (!lockAcquired) {
        throw new Error("Timeout attendant l'acquisition du verrou de migration");
      }
    }
    
    console.log("[MIGRATION] ✅ Verrou acquis");
    console.log("[MIGRATION] 📊 Exécution des migrations...");
    
    const migrationDb = drizzle(migrationClient);
    
    // Drizzle Migrator gère automatiquement :
    // - La table __drizzle_migrations pour suivre les migrations appliquées
    // - Les transactions pour garantir l'intégrité
    // - L'idempotence (peut être réexécuté sans risque)
    // - Les dépendances entre tables
    await migrate(migrationDb, { migrationsFolder: "./migrations" });
    
    console.log("[MIGRATION] ✅ Toutes les migrations ont été appliquées avec succès !");
    
    // Vérifier le schéma résultant
    const tableCount = await migrationClient`
      SELECT count(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != '__drizzle_migrations'
    `;
    
    console.log(`[MIGRATION] 📈 ${tableCount[0]?.count || 0} tables applicatives détectées`);
    
  } catch (error: any) {
    console.error("[MIGRATION] ❌ ERREUR CRITIQUE lors de la migration !");
    console.error("[MIGRATION] Message:", error.message);
    
    if (error.stack) {
      console.error("[MIGRATION] Stack:", error.stack);
    }
    
    // Bloquer le démarrage si les migrations échouent
    // Évite de servir l'application avec un schéma incomplet/cassé
    throw new Error(
      `Migration failed: ${error.message}. ` +
      `L'application ne peut pas démarrer sans un schéma de base de données valide.`
    );
  } finally {
    // Libérer le verrou ET fermer la connexion
    if (migrationClient) {
      if (lockAcquired) {
        try {
          await migrationClient`SELECT pg_advisory_unlock(123456789)`;
          console.log("[MIGRATION] 🔓 Verrou libéré");
        } catch (unlockError) {
          console.error("[MIGRATION] ⚠️ Erreur lors de la libération du verrou:", unlockError);
        }
      }
      
      await migrationClient.end();
      console.log("[MIGRATION] 🔌 Connexion de migration fermée");
    }
  }
}
