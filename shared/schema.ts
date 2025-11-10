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
  numeric,
  uniqueIndex,
  date,
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
  password: varchar("password"), // Hashed password for email/password authentication (null for OAuth users)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phoneNumber: varchar("phone_number"), // Phone number for contact
  dateOfBirth: date("date_of_birth"), // Date of birth
  country: varchar("country"), // Country of residence
  city: varchar("city"), // City of residence
  gender: varchar("gender"), // Gender: "male" or "female"
  profileImageUrl: varchar("profile_image_url"),
  bio: text("bio"),
  isCreator: boolean("is_creator").default(false).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(), // Verified badge status
  isMonetized: boolean("is_monetized").default(false).notNull(), // Monetization enabled (auto at 7000 followers)
  isAdmin: boolean("is_admin").default(false).notNull(), // Admin privileges for administrative tasks
  followerCount: integer("follower_count").default(0).notNull(), // Total followers count
  creditBalance: integer("credit_balance").default(0).notNull(), // YimiCoins balance
  totalEarnings: numeric("total_earnings", { precision: 12, scale: 2 }).default("0").notNull(), // Total earnings in USD
  viewEarnings: numeric("view_earnings", { precision: 12, scale: 2 }).default("0").notNull(), // Earnings from views (0.1 FCFA per view)
  currency: varchar("currency").default("USD").notNull(), // Preferred currency (FCFA, USD, EUR, etc.)
  stripeCustomerId: varchar("stripe_customer_id"), // Stripe customer ID for payments
  stripeConnectId: varchar("stripe_connect_id"), // Stripe Connect ID for creator payouts
  referralCode: varchar("referral_code", { length: 20 }), // Unique referral code for this user (generated on first login)
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
  favorites: integer("favorites").default(0).notNull(), // Bookmark/save count
  shareCount: integer("share_count").default(0).notNull(), // Share count
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Video = typeof videos.$inferSelect;
export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  views: true,
  likes: true,
  favorites: true,
  shareCount: true,
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
}, (table) => [
  index("likes_video_idx").on(table.videoId),
  index("likes_user_idx").on(table.userId),
  uniqueIndex("likes_user_video_unique_idx").on(table.userId, table.videoId),
]);

export type Like = typeof likes.$inferSelect;

// Favorites table (bookmarks) - TikTok-style save for later
export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("favorites_video_idx").on(table.videoId),
  index("favorites_user_idx").on(table.userId),
  uniqueIndex("favorites_user_video_unique_idx").on(table.userId, table.videoId),
]);

export type Favorite = typeof favorites.$inferSelect;

// Video Shares table - Track when users share videos
export const videoShares = pgTable("video_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  shareMethod: varchar("share_method", { length: 50 }), // 'copy_link', 'native_share', 'twitter', 'facebook', etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("video_shares_video_idx").on(table.videoId),
  index("video_shares_user_idx").on(table.userId),
]);

export type VideoShare = typeof videoShares.$inferSelect;

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
  content: text("content"), // Optional for media messages
  messageType: varchar("message_type", { length: 20 }).default("text").notNull(), // 'text', 'image', 'video', 'audio'
  mediaUrl: text("media_url"), // URL to image/video/audio file
  mediaThumbnail: text("media_thumbnail"), // Thumbnail for video
  mediaDuration: integer("media_duration"), // Duration in seconds for audio/video
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
  usdValue: numeric("usd_value", { precision: 10, scale: 2 }).notNull(), // Real money value in USD
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
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(), // Price in USD
  bonus: integer("bonus").default(0).notNull(), // Bonus credits
  isPopular: boolean("is_popular").default(false).notNull(),
});

export type CreditPackage = typeof creditPackages.$inferSelect;

// Transactions (credit purchases and earnings)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'purchase', 'gift_received', 'withdrawal'
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), // Amount in USD
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
  favorites: many(favorites),
  videoShares: many(videoShares),
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
  favorites: many(favorites),
  shares: many(videoShares),
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

export const favoritesRelations = relations(favorites, ({ one }) => ({
  video: one(videos, {
    fields: [favorites.videoId],
    references: [videos.id],
  }),
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
}));

export const videoSharesRelations = relations(videoShares, ({ one }) => ({
  video: one(videos, {
    fields: [videoShares.videoId],
    references: [videos.id],
  }),
  user: one(users, {
    fields: [videoShares.userId],
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
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(), // Price per share in USD
  platformValue: numeric("platform_value", { precision: 15, scale: 2 }).notNull(), // Total platform valuation
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
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }).notNull(), // Price paid per share in USD
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull(), // Total amount paid
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
  pricePerShare: numeric("price_per_share", { precision: 10, scale: 2 }).notNull(), // Price per share in USD
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(), // Total transaction amount
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

// Badge Types - Predefined badges users can earn
export const badgeTypes = pgTable("badge_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  iconName: varchar("icon_name", { length: 50 }).notNull(), // Icon from lucide-react
  color: varchar("color", { length: 50 }).notNull(), // Badge color
  category: varchar("category", { length: 50 }).notNull(), // 'views', 'likes', 'followers', 'earnings', 'videos'
  requirement: integer("requirement").notNull(), // Threshold to earn (e.g., 1000 views, 100 followers)
  tier: varchar("tier", { length: 20 }).notNull(), // 'bronze', 'silver', 'gold', 'platinum', 'diamond'
  order: integer("order").default(0).notNull(), // Display order
});

export type BadgeType = typeof badgeTypes.$inferSelect;

// User Badges - Badges earned by users
export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeTypeId: varchar("badge_type_id").notNull().references(() => badgeTypes.id, { onDelete: "cascade" }),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
}, (table) => [
  index("user_badges_user_idx").on(table.userId),
  index("user_badges_badge_type_idx").on(table.badgeTypeId),
]);

export type UserBadge = typeof userBadges.$inferSelect;
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  earnedAt: true,
});
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;

// Referral System - Track who referred whom
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id, { onDelete: "cascade" }), // User who referred
  referredId: varchar("referred_id").notNull().references(() => users.id, { onDelete: "cascade" }), // User who was referred
  referralCode: varchar("referral_code", { length: 20 }).notNull(), // Code used
  bonusAwarded: integer("bonus_awarded").default(0).notNull(), // Bonus YimiCoins awarded to referrer
  status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'completed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("referrals_referrer_idx").on(table.referrerId),
  index("referrals_referred_idx").on(table.referredId),
  index("referrals_code_idx").on(table.referralCode),
]);

export type Referral = typeof referrals.$inferSelect;
export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});
export type InsertReferral = z.infer<typeof insertReferralSchema>;

// Subscription Plans - Premium tiers (Basic, Pro, Enterprise)
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(), // 'Basic', 'Pro', 'Enterprise'
  description: text("description").notNull(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(), // Monthly price in USD
  priceFcfa: numeric("price_fcfa", { precision: 12, scale: 2 }).notNull(), // Monthly price in FCFA
  stripePriceId: varchar("stripe_price_id"), // Stripe Price ID for subscriptions
  features: text("features").array().notNull(), // List of features
  maxVideos: integer("max_videos"), // Max videos per month (null = unlimited)
  maxStorage: integer("max_storage"), // Max storage in GB (null = unlimited)
  adFree: boolean("ad_free").default(false).notNull(), // No ads for this tier
  prioritySupport: boolean("priority_support").default(false).notNull(),
  analyticsAccess: boolean("analytics_access").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  order: integer("order").default(0).notNull(), // Display order
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
});
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

// User Subscriptions - Active subscriptions for users
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id, { onDelete: "cascade" }),
  stripeSubscriptionId: varchar("stripe_subscription_id").unique(), // Stripe Subscription ID
  status: varchar("status", { length: 20 }).default("active").notNull(), // 'active', 'canceled', 'expired', 'past_due'
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("user_subscriptions_user_idx").on(table.userId),
  index("user_subscriptions_plan_idx").on(table.planId),
  index("user_subscriptions_status_idx").on(table.status),
]);

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

// Verified Badge Purchases - Paid verification for VIP/brands
export const verifiedBadgePurchases = pgTable("verified_badge_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(), // Price paid in USD
  priceFcfa: numeric("price_fcfa", { precision: 12, scale: 2 }).notNull(), // Price paid in FCFA
  stripePaymentIntentId: varchar("stripe_payment_intent_id"), // Stripe Payment Intent ID
  status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'approved', 'rejected'
  submittedDocuments: text("submitted_documents").array(), // URLs to verification documents
  rejectionReason: text("rejection_reason"), // Admin rejection reason
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by"), // Admin user ID who approved
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("verified_badge_purchases_user_idx").on(table.userId),
  index("verified_badge_purchases_status_idx").on(table.status),
]);

export type VerifiedBadgePurchase = typeof verifiedBadgePurchases.$inferSelect;
export const insertVerifiedBadgePurchaseSchema = createInsertSchema(verifiedBadgePurchases).omit({
  id: true,
  createdAt: true,
});
export type InsertVerifiedBadgePurchase = z.infer<typeof insertVerifiedBadgePurchaseSchema>;

// Monetization Settings - Global platform monetization configuration (single row)
export const monetizationSettings = pgTable("monetization_settings", {
  id: varchar("id").primaryKey().default("platform_settings"), // Single row with fixed ID
  minFollowersForMonetization: integer("min_followers_monetization").default(7000).notNull(), // Auto-enable monetization at this threshold
  pricePerViewFcfa: numeric("price_per_view_fcfa", { precision: 10, scale: 4 }).default("0.1").notNull(), // 0.1 FCFA per view
  pricePerViewUsd: numeric("price_per_view_usd", { precision: 10, scale: 6 }).default("0.00015").notNull(), // ~0.1 FCFA in USD
  verifiedBadgePriceUsd: numeric("verified_badge_price_usd", { precision: 10, scale: 2 }).default("100").notNull(), // $100 for verified badge
  verifiedBadgePriceFcfa: numeric("verified_badge_price_fcfa", { precision: 12, scale: 2 }).default("65500").notNull(), // ~$100 in FCFA
  autoWithdrawThresholdUsd: numeric("auto_withdraw_threshold_usd", { precision: 10, scale: 2 }).default("50").notNull(), // Min amount for withdrawal
  platformCommissionPercent: integer("platform_commission_percent").default(40).notNull(), // Platform takes 40% from gifts
  creatorSharePercent: integer("creator_share_percent").default(60).notNull(), // Creators get 60% from gifts
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MonetizationSetting = typeof monetizationSettings.$inferSelect;
export const insertMonetizationSettingSchema = createInsertSchema(monetizationSettings).omit({
  id: true,
  updatedAt: true,
});
export type InsertMonetizationSetting = z.infer<typeof insertMonetizationSettingSchema>;

// Video View Earnings - Track earnings from video views (0.1 FCFA per view)
export const videoViewEarnings = pgTable("video_view_earnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  totalViews: integer("total_views").default(0).notNull(), // Total monetized views
  earningsFcfa: numeric("earnings_fcfa", { precision: 12, scale: 2 }).default("0").notNull(), // Total earnings in FCFA (totalViews * 0.1)
  earningsUsd: numeric("earnings_usd", { precision: 12, scale: 2 }).default("0").notNull(), // Total earnings in USD (converted)
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("video_view_earnings_video_idx").on(table.videoId),
  index("video_view_earnings_creator_idx").on(table.creatorId),
  uniqueIndex("video_view_earnings_video_unique_idx").on(table.videoId),
]);

export type VideoViewEarning = typeof videoViewEarnings.$inferSelect;
export const insertVideoViewEarningSchema = createInsertSchema(videoViewEarnings).omit({
  id: true,
  createdAt: true,
  lastCalculatedAt: true,
});
export type InsertVideoViewEarning = z.infer<typeof insertVideoViewEarningSchema>;
