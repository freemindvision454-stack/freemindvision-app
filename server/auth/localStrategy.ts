import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "../storage";
import type { SessionUser } from "../../shared/authSchema"; // Chemin corrigé

export function setupLocalStrategy() {
  // Configure Passport local strategy for email/password authentication
  passport.use(
    "local",
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email: string, password: string, done: (error: any, user?: any, options?: any) => void) => {
        try {
          console.log(`🔐 Tentative de connexion locale pour: ${email}`);
          
          // Find user by email
          const user = await storage.findUserByEmail(email);
          
          if (!user) {
            console.log(`❌ Utilisateur non trouvé: ${email}`);
            return done(null, false, { message: "Email ou mot de passe incorrect" });
          }
          
          // Verify password
          const isValid = await storage.verifyPassword(user.id, password);
          
          if (!isValid) {
            console.log(`❌ Mot de passe incorrect pour: ${email}`);
            return done(null, false, { message: "Email ou mot de passe incorrect" });
          }
          
          // Return session user (without password!)
          const sessionUser: SessionUser = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
            bio: user.bio,
            isCreator: user.isCreator,
            creditBalance: user.creditBalance.toString(),
            totalEarnings: user.totalEarnings.toString(),
            currency: user.currency,
            referralCode: user.referralCode,
            authProvider: "local",
            isVerified: user.isVerified,
            isAdmin: user.isAdmin,
          };
          
          console.log(`✅ Connexion réussie pour: ${email}`);
          return done(null, sessionUser);
        } catch (error) {
          console.error("❌ Erreur stratégie locale:", error);
          console.error("📧 Email tenté:", email);
          return done(error);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user: any, done: (err: any, user?: any) => void) => {
    try {
      console.log(`💾 Serialisation utilisateur: ${user.id}`);
      done(null, user);
    } catch (error) {
      console.error("❌ Erreur sérialisation:", error);
      done(error);
    }
  });

  // Deserialize user from session
  passport.deserializeUser(async (user: any, done: (err: any, user?: any) => void) => {
    try {
      if (!user || !user.id) {
        console.log("❌ Aucun utilisateur à désérialiser");
        return done(null, false);
      }
      
      console.log(`🔄 Désérialisation utilisateur: ${user.id}`);
      
      // Récupérer les données fraîches de la base
      const freshUser = await storage.getUser(user.id);
      if (!freshUser) {
        console.log(`❌ Utilisateur non trouvé en base: ${user.id}`);
        return done(null, false);
      }
      
      // Recréer l'objet session avec données fraîches
      const sessionUser: SessionUser = {
        id: freshUser.id,
        email: freshUser.email,
        firstName: freshUser.firstName,
        lastName: freshUser.lastName,
        profileImageUrl: freshUser.profileImageUrl,
        bio: freshUser.bio,
        isCreator: freshUser.isCreator,
        creditBalance: freshUser.creditBalance.toString(),
        totalEarnings: freshUser.totalEarnings.toString(),
        currency: freshUser.currency,
        referralCode: freshUser.referralCode,
        authProvider: "local",
        isVerified: freshUser.isVerified,
        isAdmin: freshUser.isAdmin,
      };
      
      done(null, sessionUser);
    } catch (error) {
      console.error("❌ Erreur désérialisation:", error);
      done(error);
    }
  });

  console.log("✅ Stratégie d'authentification locale configurée avec succès");
}
