import { z } from "zod";

// Password validation: min 12 characters, mixed charset
const passwordSchema = z
  .string()
  .min(12, "Le mot de passe doit contenir au moins 12 caractères")
  .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
  .regex(/[^a-zA-Z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial");

// Register schema
export const registerSchema = z.object({
  email: z
    .string()
    .email("Email invalide")
    .toLowerCase()
    .trim(),
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z
    .string()
    .min(1, "Le prénom est requis")
    .max(50, "Le prénom est trop long")
    .trim(),
  lastName: z
    .string()
    .min(1, "Le nom est requis")
    .max(50, "Le nom est trop long")
    .trim(),
  phoneNumber: z
    .string()
    .min(1, "Le numéro de téléphone est requis")
    .regex(/^[0-9+\s-()]+$/, "Numéro de téléphone invalide")
    .trim(),
  dateOfBirth: z
    .string()
    .min(1, "La date de naissance est requise")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),
  country: z
    .string()
    .min(1, "Le pays est requis")
    .max(100, "Le nom du pays est trop long")
    .trim(),
  city: z
    .string()
    .min(1, "La ville est requise")
    .max(100, "Le nom de la ville est trop long")
    .trim(),
  gender: z
    .enum(["male", "female"], {
      errorMap: () => ({ message: "Veuillez sélectionner votre genre" }),
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Login schema
export const loginSchema = z.object({
  email: z
    .string()
    .email("Email invalide")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, "Le mot de passe est requis"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Session user type (no password!)
export type SessionUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  bio: string | null;
  isCreator: boolean;
  creditBalance: number;
  totalEarnings: number;
  currency: string;
  referralCode: string | null;
  authProvider: "local" | "replit";
};
