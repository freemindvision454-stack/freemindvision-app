import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - enhanced for creator platform
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  bio: text("bio"),
  isCreator: boolean("is_creator").default(false).notNull(),
  creditBalance: integer("credit_balance").default(0).notNull(), // YimiCoins balance
  totalEarnings: real("total_earnings").default(0).notNull(), // Total earnings in USD
  currency: varchar("currency").default("USD").notNull(), // Preferred currency (FCFA, USD, EUR, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Videos table
export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(), // URL or path to video file
  thumbnailUrl: text("thumbnail_url"), // Custom or auto-generated thumbnail
  duration: integer("duration"), // Duration in seconds
  views: integer("views").default(0).notNull(),
  likes: integer("likes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Video = typeof videos.$inferSelect;
export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  views: true,
  likes: true,
  createdAt: true,
});
export type InsertVideo = z.infer<typeof insertVideoSchema>;

// Comments table
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});
export type InsertComment = z.infer<typeof insertCommentSchema>;

// Likes table (many-to-many relationship)
export const likes = pgTable("likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Like = typeof likes.$inferSelect;

// Gift types (predefined virtual gifts)
export const giftTypes = pgTable("gift_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  iconName: varchar("icon_name", { length: 50 }).notNull(), // Icon identifier from lucide-react
  creditCost: integer("credit_cost").notNull(), // Cost in YimiCoins
  usdValue: real("usd_value").notNull(), // Real money value in USD
  color: varchar("color", { length: 50 }), // Color for the gift icon
});

export type GiftType = typeof giftTypes.$inferSelect;

// Gifts sent by users to creators
export const gifts = pgTable("gifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  giftTypeId: varchar("gift_type_id").notNull().references(() => giftTypes.id),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: varchar("video_id").references(() => videos.id, { onDelete: "set null" }), // Optional: gift sent during video
  quantity: integer("quantity").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Gift = typeof gifts.$inferSelect;
export const insertGiftSchema = createInsertSchema(gifts).omit({
  id: true,
  createdAt: true,
});
export type InsertGift = z.infer<typeof insertGiftSchema>;

// Credit packages (for purchasing YimiCoins)
export const creditPackages = pgTable("credit_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  credits: integer("credits").notNull(), // Number of YimiCoins
  priceUsd: real("price_usd").notNull(), // Price in USD
  bonus: integer("bonus").default(0).notNull(), // Bonus credits
  isPopular: boolean("is_popular").default(false).notNull(),
});

export type CreditPackage = typeof creditPackages.$inferSelect;

// Transactions (credit purchases and earnings)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'purchase', 'gift_received', 'withdrawal'
  amount: real("amount").notNull(), // Amount in USD
  credits: integer("credits"), // Credits involved (for purchases)
  description: text("description"),
  status: varchar("status", { length: 50 }).default("completed").notNull(), // 'pending', 'completed', 'failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos),
  comments: many(comments),
  likes: many(likes),
  sentGifts: many(gifts, { relationName: "sender" }),
  receivedGifts: many(gifts, { relationName: "recipient" }),
  transactions: many(transactions),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  creator: one(users, {
    fields: [videos.creatorId],
    references: [users.id],
  }),
  comments: many(comments),
  likes: many(likes),
  gifts: many(gifts),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  video: one(videos, {
    fields: [comments.videoId],
    references: [videos.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  video: one(videos, {
    fields: [likes.videoId],
    references: [videos.id],
  }),
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
}));

export const giftsRelations = relations(gifts, ({ one }) => ({
  giftType: one(giftTypes, {
    fields: [gifts.giftTypeId],
    references: [giftTypes.id],
  }),
  sender: one(users, {
    fields: [gifts.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  recipient: one(users, {
    fields: [gifts.recipientId],
    references: [users.id],
    relationName: "recipient",
  }),
  video: one(videos, {
    fields: [gifts.videoId],
    references: [videos.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));
