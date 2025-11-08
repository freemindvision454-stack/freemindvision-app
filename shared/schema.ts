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
  stripeCustomerId: varchar("stripe_customer_id"), // Stripe customer ID for payments
  stripeConnectId: varchar("stripe_connect_id"), // Stripe Connect ID for creator payouts
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

// Follows table (follower/following relationships)
export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("follows_follower_idx").on(table.followerId),
  index("follows_following_idx").on(table.followingId),
]);

export type Follow = typeof follows.$inferSelect;

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'like', 'comment', 'follow', 'gift'
  actorId: varchar("actor_id").references(() => users.id, { onDelete: "cascade" }), // User who triggered the notification
  videoId: varchar("video_id").references(() => videos.id, { onDelete: "cascade" }), // Related video (for likes/comments)
  commentId: varchar("comment_id").references(() => comments.id, { onDelete: "cascade" }), // Related comment
  message: text("message").notNull(), // Notification message
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("notifications_user_idx").on(table.userId),
  index("notifications_created_at_idx").on(table.createdAt),
]);

export type Notification = typeof notifications.$inferSelect;
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Messages table (private messages between users)
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("messages_sender_idx").on(table.senderId),
  index("messages_recipient_idx").on(table.recipientId),
  index("messages_created_at_idx").on(table.createdAt),
]);

export type Message = typeof messages.$inferSelect;
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  createdAt: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;

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
  paymentMethod: varchar("payment_method", { length: 50 }), // 'stripe', 'orange_money', 'mtn_money', 'wave', 'paypal'
  paymentProvider: varchar("payment_provider", { length: 100 }), // Provider-specific transaction ID
  description: text("description"),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // 'pending', 'completed', 'failed', 'cancelled'
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
  following: many(follows, { relationName: "follower" }),
  followers: many(follows, { relationName: "following" }),
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

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

// Stock/Share Price History - Tracks the value of FreeMind Vision shares over time
export const sharePriceHistory = pgTable("share_price_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  priceUsd: real("price_usd").notNull(), // Price per share in USD
  platformValue: real("platform_value").notNull(), // Total platform valuation
  totalShares: integer("total_shares").notNull(), // Total shares issued
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("share_price_created_at_idx").on(table.createdAt),
]);

export type SharePriceHistory = typeof sharePriceHistory.$inferSelect;

// Shares owned by users - Represents ownership stakes in FreeMind Vision
export const shares = pgTable("shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(), // Number of shares owned
  purchasePrice: real("purchase_price").notNull(), // Price paid per share in USD
  totalCost: real("total_cost").notNull(), // Total amount paid
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
}, (table) => [
  index("shares_user_idx").on(table.userId),
]);

export type Share = typeof shares.$inferSelect;
export const insertShareSchema = createInsertSchema(shares).omit({
  id: true,
  purchasedAt: true,
});
export type InsertShare = z.infer<typeof insertShareSchema>;

// Share Transactions - Purchases and sales of shares
export const shareTransactions = pgTable("share_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'purchase' or 'sale'
  quantity: integer("quantity").notNull(), // Number of shares
  pricePerShare: real("price_per_share").notNull(), // Price per share in USD
  totalAmount: real("total_amount").notNull(), // Total transaction amount
  status: varchar("status", { length: 50 }).default("pending").notNull(), // 'pending', 'completed', 'failed'
  stripePaymentIntentId: varchar("stripe_payment_intent_id"), // Stripe payment reference
  paymentMethod: varchar("payment_method", { length: 50 }), // Payment method used
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("share_transactions_user_idx").on(table.userId),
  index("share_transactions_status_idx").on(table.status),
]);

export type ShareTransaction = typeof shareTransactions.$inferSelect;
export const insertShareTransactionSchema = createInsertSchema(shareTransactions).omit({
  id: true,
  createdAt: true,
});
export type InsertShareTransaction = z.infer<typeof insertShareTransactionSchema>;

// Relations for shares
export const sharesRelations = relations(shares, ({ one }) => ({
  user: one(users, {
    fields: [shares.userId],
    references: [users.id],
  }),
}));

export const shareTransactionsRelations = relations(shareTransactions, ({ one }) => ({
  user: one(users, {
    fields: [shareTransactions.userId],
    references: [users.id],
  }),
}));
