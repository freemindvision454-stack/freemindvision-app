import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "../storage";
import type { SessionUser } from "@shared/authSchemas";

export function setupLocalStrategy() {
  // Configure Passport local strategy for email/password authentication
  passport.use(
    "local",
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          // Find user by email
          const user = await storage.findUserByEmail(email);
          
          if (!user) {
            return done(null, false, { message: "Email ou mot de passe incorrect" });
          }
          
          // Verify password
          const isValid = await storage.verifyPassword(user, password);
          
          if (!isValid) {
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
            creditBalance: user.creditBalance,
            totalEarnings: user.totalEarnings,
            currency: user.currency,
            referralCode: user.referralCode,
            authProvider: "local",
          };
          
          return done(null, sessionUser);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  // Deserialize user from session
  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });
}
