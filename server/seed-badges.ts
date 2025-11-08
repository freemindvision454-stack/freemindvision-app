import { db } from "./db";
import { badgeTypes } from "@shared/schema";

const badgesToSeed = [
  {
    name: "Premier Pas",
    description: "Publier votre première vidéo",
    iconName: "Video",
    color: "#94a3b8",
    category: "videos",
    requirement: 1,
    tier: "bronze",
    order: 1,
  },
  {
    name: "Créateur Actif",
    description: "Publier 10 vidéos",
    iconName: "VideoIcon",
    color: "#94a3b8",
    category: "videos",
    requirement: 10,
    tier: "bronze",
    order: 2,
  },
  {
    name: "Créateur Pro",
    description: "Publier 50 vidéos",
    iconName: "Video",
    color: "#c0c0c0",
    category: "videos",
    requirement: 50,
    tier: "silver",
    order: 3,
  },
  {
    name: "100 Vues",
    description: "Atteindre 100 vues au total",
    iconName: "Eye",
    color: "#94a3b8",
    category: "views",
    requirement: 100,
    tier: "bronze",
    order: 10,
  },
  {
    name: "1K Vues",
    description: "Atteindre 1 000 vues au total",
    iconName: "Eye",
    color: "#c0c0c0",
    category: "views",
    requirement: 1000,
    tier: "silver",
    order: 11,
  },
  {
    name: "10K Vues",
    description: "Atteindre 10 000 vues au total",
    iconName: "Eye",
    color: "#ffd700",
    category: "views",
    requirement: 10000,
    tier: "gold",
    order: 12,
  },
  {
    name: "100K Vues",
    description: "Atteindre 100 000 vues au total",
    iconName: "Eye",
    color: "#e5e4e2",
    category: "views",
    requirement: 100000,
    tier: "platinum",
    order: 13,
  },
  {
    name: "Première Appréciation",
    description: "Recevoir 10 likes au total",
    iconName: "Heart",
    color: "#94a3b8",
    category: "likes",
    requirement: 10,
    tier: "bronze",
    order: 20,
  },
  {
    name: "Aimé",
    description: "Recevoir 100 likes au total",
    iconName: "Heart",
    color: "#c0c0c0",
    category: "likes",
    requirement: 100,
    tier: "silver",
    order: 21,
  },
  {
    name: "Très Aimé",
    description: "Recevoir 1 000 likes au total",
    iconName: "Heart",
    color: "#ffd700",
    category: "likes",
    requirement: 1000,
    tier: "gold",
    order: 22,
  },
  {
    name: "Superstar",
    description: "Recevoir 10 000 likes au total",
    iconName: "Heart",
    color: "#e5e4e2",
    category: "likes",
    requirement: 10000,
    tier: "platinum",
    order: 23,
  },
  {
    name: "Premiers Followers",
    description: "Avoir 10 followers",
    iconName: "Users",
    color: "#94a3b8",
    category: "followers",
    requirement: 10,
    tier: "bronze",
    order: 30,
  },
  {
    name: "Influenceur",
    description: "Avoir 100 followers",
    iconName: "Users",
    color: "#c0c0c0",
    category: "followers",
    requirement: 100,
    tier: "silver",
    order: 31,
  },
  {
    name: "Star Montante",
    description: "Avoir 1 000 followers",
    iconName: "Users",
    color: "#ffd700",
    category: "followers",
    requirement: 1000,
    tier: "gold",
    order: 32,
  },
  {
    name: "Célébrité",
    description: "Avoir 10 000 followers",
    iconName: "Users",
    color: "#e5e4e2",
    category: "followers",
    requirement: 10000,
    tier: "platinum",
    order: 33,
  },
  {
    name: "Premiers Gains",
    description: "Gagner 10$ en total",
    iconName: "DollarSign",
    color: "#94a3b8",
    category: "earnings",
    requirement: 10,
    tier: "bronze",
    order: 40,
  },
  {
    name: "Entrepreneur",
    description: "Gagner 100$ en total",
    iconName: "DollarSign",
    color: "#c0c0c0",
    category: "earnings",
    requirement: 100,
    tier: "silver",
    order: 41,
  },
  {
    name: "Business Pro",
    description: "Gagner 1 000$ en total",
    iconName: "DollarSign",
    color: "#ffd700",
    category: "earnings",
    requirement: 1000,
    tier: "gold",
    order: 42,
  },
  {
    name: "Millionnaire",
    description: "Gagner 10 000$ en total",
    iconName: "DollarSign",
    color: "#e5e4e2",
    category: "earnings",
    requirement: 10000,
    tier: "platinum",
    order: 43,
  },
];

async function seedBadges() {
  console.log("Starting badge seeding...");
  
  try {
    for (const badge of badgesToSeed) {
      await db.insert(badgeTypes).values(badge).onConflictDoNothing();
      console.log(`✓ Seeded badge: ${badge.name}`);
    }
    
    console.log("Badge seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding badges:", error);
    process.exit(1);
  }
}

seedBadges();
