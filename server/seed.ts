// Database seeding script for initial gift types and credit packages
import { db } from "./db";
import { giftTypes, creditPackages } from "@shared/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  // Seed Gift Types
  const gifts = [
    {
      name: "Heart",
      iconName: "Heart",
      creditCost: 10,
      usdValue: 0.10,
      color: "#e91e63",
    },
    {
      name: "Star",
      iconName: "Star",
      creditCost: 25,
      usdValue: 0.25,
      color: "#ffd700",
    },
    {
      name: "Crown",
      iconName: "Crown",
      creditCost: 50,
      usdValue: 0.50,
      color: "#9c27b0",
    },
    {
      name: "Diamond",
      iconName: "Gem",
      creditCost: 100,
      usdValue: 1.00,
      color: "#00bcd4",
    },
    {
      name: "Lightning",
      iconName: "Zap",
      creditCost: 200,
      usdValue: 2.00,
      color: "#ff9800",
    },
    {
      name: "Trophy",
      iconName: "Trophy",
      creditCost: 500,
      usdValue: 5.00,
      color: "#ff5722",
    },
  ];

  try {
    // Clear existing gift types
    await db.delete(giftTypes);

    // Insert new gift types
    for (const gift of gifts) {
      await db.insert(giftTypes).values(gift);
    }

    console.log(`✓ Inserted ${gifts.length} gift types`);
  } catch (error) {
    console.error("Error seeding gift types:", error);
  }

  // Seed Credit Packages
  const packages = [
    {
      name: "Starter Pack",
      credits: 100,
      priceUsd: 0.99,
      bonus: 0,
      isPopular: false,
    },
    {
      name: "Popular Pack",
      credits: 500,
      priceUsd: 4.99,
      bonus: 50,
      isPopular: true,
    },
    {
      name: "Value Pack",
      credits: 1000,
      priceUsd: 9.99,
      bonus: 150,
      isPopular: false,
    },
    {
      name: "Premium Pack",
      credits: 2500,
      priceUsd: 19.99,
      bonus: 500,
      isPopular: false,
    },
    {
      name: "Ultimate Pack",
      credits: 5000,
      priceUsd: 39.99,
      bonus: 1500,
      isPopular: false,
    },
    {
      name: "Creator's Choice",
      credits: 10000,
      priceUsd: 74.99,
      bonus: 4000,
      isPopular: false,
    },
  ];

  try {
    // Clear existing credit packages
    await db.delete(creditPackages);

    // Insert new credit packages
    for (const pkg of packages) {
      await db.insert(creditPackages).values(pkg);
    }

    console.log(`✓ Inserted ${packages.length} credit packages`);
  } catch (error) {
    console.error("Error seeding credit packages:", error);
  }

  console.log("🎉 Seeding completed!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Fatal error during seeding:", error);
  process.exit(1);
});
