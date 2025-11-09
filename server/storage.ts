// Storage implementation with PostgreSQL - references javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  videos,
  comments,
  likes,
  favorites,
  videoShares,
  follows,
  notifications,
  messages,
  giftTypes,
  gifts,
  creditPackages,
  transactions,
  shares,
  shareTransactions,
  sharePriceHistory,
  badgeTypes,
  userBadges,
  referrals,
  type User,
  type UpsertUser,
  type Video,
  type InsertVideo,
  type Comment,
  type InsertComment,
  type Like,
  type Favorite,
  type VideoShare,
  type Follow,
  type Notification,
  type InsertNotification,
  type Message,
  type InsertMessage,
  type Gift,
  type InsertGift,
  type GiftType,
  type CreditPackage,
  type Transaction,
  type InsertTransaction,
  type Share,
  type InsertShare,
  type ShareTransaction,
  type InsertShareTransaction,
  type SharePriceHistory,
  type BadgeType,
  type UserBadge,
  type InsertUserBadge,
  type Referral,
  type InsertReferral,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (Replit Auth required)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;

  // Video operations
  createVideo(video: InsertVideo): Promise<Video>;
  getVideo(id: string): Promise<Video | undefined>;
  getVideos(limit?: number): Promise<Video[]>;
  getVideosByCreator(creatorId: string): Promise<Video[]>;
  incrementVideoViews(videoId: string): Promise<void>;

  // Comment operations
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByVideo(videoId: string): Promise<Comment[]>;

  // Like operations
  likeVideo(userId: string, videoId: string): Promise<Like>;
  unlikeVideo(userId: string, videoId: string): Promise<void>;
  isVideoLiked(userId: string, videoId: string): Promise<boolean>;

  // Favorite operations (TikTok-style bookmarks)
  favoriteVideo(userId: string, videoId: string): Promise<Favorite>;
  unfavoriteVideo(userId: string, videoId: string): Promise<void>;
  isVideoFavorited(userId: string, videoId: string): Promise<boolean>;
  getFavoritesByUser(userId: string): Promise<Video[]>;

  // Video share operations (tracking)
  shareVideo(userId: string, videoId: string, shareMethod?: string): Promise<VideoShare>;
  getShareCount(videoId: string): Promise<number>;

  // Follow operations
  followUser(followerId: string, followingId: string): Promise<Follow>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  getFollowingVideos(userId: string, limit?: number): Promise<Video[]>;

  // Gift operations
  getGiftTypes(): Promise<GiftType[]>;
  sendGift(gift: InsertGift): Promise<Gift>;
  getGiftsByRecipient(recipientId: string): Promise<Gift[]>;

  // Credit operations
  getCreditPackages(): Promise<CreditPackage[]>;
  updateUserCredits(userId: string, amount: number): Promise<void>;
  updateUserEarnings(userId: string, amount: number): Promise<void>;

  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUser(userId: string): Promise<Transaction[]>;
  updateTransactionStatus(paymentProviderId: string, status: string): Promise<void>;

  // Dashboard operations
  getDashboardStats(userId: string): Promise<any>;
  getCreatorVideosWithStats(userId: string): Promise<any[]>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationsCount(userId: string): Promise<number>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  // Message operations
  sendMessage(message: InsertMessage): Promise<Message>;
  getConversations(userId: string): Promise<any[]>;
  getMessages(userId: string, otherUserId: string, limit?: number): Promise<Message[]>;
  markMessagesAsRead(recipientId: string, senderId: string): Promise<void>;
  getUnreadMessagesCount(userId: string): Promise<number>;

  // Share operations
  getCurrentSharePrice(): Promise<SharePriceHistory | undefined>;
  getUserShares(userId: string): Promise<Share[]>;
  getTotalUserShares(userId: string): Promise<number>;
  createShare(share: InsertShare): Promise<Share>;
  createShareTransaction(transaction: InsertShareTransaction): Promise<ShareTransaction>;
  updateShareTransactionStatus(transactionId: string, status: string, stripePaymentIntentId?: string): Promise<void>;
  getSharePriceHistory(limit?: number): Promise<SharePriceHistory[]>;
  getShareStats(): Promise<{ currentPrice: number; totalShares: number; platformValue: number; totalInvestors: number }>;
  getUserShareTransactions(userId: string): Promise<ShareTransaction[]>;

  // Badge operations
  getAllBadgeTypes(): Promise<BadgeType[]>;
  getUserBadges(userId: string): Promise<(UserBadge & { badgeType: BadgeType })[]>;
  awardBadge(userId: string, badgeTypeId: string): Promise<UserBadge>;
  checkAndAwardBadges(userId: string): Promise<UserBadge[]>;
  hasBadge(userId: string, badgeTypeId: string): Promise<boolean>;

  // Referral operations
  getUserReferralCode(userId: string): Promise<string>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralsByReferrer(referrerId: string): Promise<Referral[]>;
  getReferralStats(userId: string): Promise<{ totalReferrals: number; totalBonus: number; pendingReferrals: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Video operations
  async createVideo(videoData: InsertVideo): Promise<Video> {
    const [video] = await db.insert(videos).values(videoData).returning();
    return video;
  }

  async getVideo(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async getVideos(limit: number = 50): Promise<Video[]> {
    return await db
      .select()
      .from(videos)
      .orderBy(desc(videos.createdAt))
      .limit(limit);
  }

  async getVideosByCreator(creatorId: string): Promise<Video[]> {
    return await db
      .select()
      .from(videos)
      .where(eq(videos.creatorId, creatorId))
      .orderBy(desc(videos.createdAt));
  }

  async incrementVideoViews(videoId: string): Promise<void> {
    await db
      .update(videos)
      .set({ views: sql`${videos.views} + 1` })
      .where(eq(videos.id, videoId));
  }

  // Comment operations
  async createComment(commentData: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(commentData).returning();
    return comment;
  }

  async getCommentsByVideo(videoId: string): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.videoId, videoId))
      .orderBy(desc(comments.createdAt));
  }

  // Like operations
  async likeVideo(userId: string, videoId: string): Promise<Like> {
    // Check if already liked
    const existing = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new like
    const [like] = await db.insert(likes).values({ userId, videoId }).returning();

    // Increment video likes count
    await db
      .update(videos)
      .set({ likes: sql`${videos.likes} + 1` })
      .where(eq(videos.id, videoId));

    return like;
  }

  async unlikeVideo(userId: string, videoId: string): Promise<void> {
    // Delete and check if anything was actually removed
    const deleted = await db
      .delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)))
      .returning();

    // Only decrement if a like was actually removed
    if (deleted.length > 0) {
      await db
        .update(videos)
        .set({ likes: sql`GREATEST(${videos.likes} - 1, 0)` })
        .where(eq(videos.id, videoId));
    }
  }

  async isVideoLiked(userId: string, videoId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)))
      .limit(1);

    return result.length > 0;
  }

  // Favorite operations (TikTok-style bookmarks)
  async favoriteVideo(userId: string, videoId: string): Promise<Favorite> {
    // Check if already favorited (idempotent)
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.videoId, videoId)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new favorite
    const [favorite] = await db.insert(favorites).values({ userId, videoId }).returning();

    // Increment video favorites count
    await db
      .update(videos)
      .set({ favorites: sql`${videos.favorites} + 1` })
      .where(eq(videos.id, videoId));

    return favorite;
  }

  async unfavoriteVideo(userId: string, videoId: string): Promise<void> {
    // Delete and check if anything was actually removed
    const deleted = await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.videoId, videoId)))
      .returning();

    // Only decrement if a favorite was actually removed
    if (deleted.length > 0) {
      await db
        .update(videos)
        .set({ favorites: sql`GREATEST(${videos.favorites} - 1, 0)` })
        .where(eq(videos.id, videoId));
    }
  }

  async isVideoFavorited(userId: string, videoId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.videoId, videoId)))
      .limit(1);

    return result.length > 0;
  }

  async getFavoritesByUser(userId: string): Promise<Video[]> {
    // Join favorites with videos to get full video objects
    const favoriteVideos = await db
      .select({
        id: videos.id,
        creatorId: videos.creatorId,
        title: videos.title,
        description: videos.description,
        videoUrl: videos.videoUrl,
        thumbnailUrl: videos.thumbnailUrl,
        duration: videos.duration,
        views: videos.views,
        likes: videos.likes,
        favorites: videos.favorites,
        shareCount: videos.shareCount,
        createdAt: videos.createdAt,
      })
      .from(favorites)
      .innerJoin(videos, eq(favorites.videoId, videos.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));

    return favoriteVideos;
  }

  // Video share operations (tracking)
  async shareVideo(userId: string, videoId: string, shareMethod: string = "direct"): Promise<VideoShare> {
    // Create new share record (allows multiple shares per user)
    const [share] = await db
      .insert(videoShares)
      .values({ userId, videoId, shareMethod })
      .returning();

    // Increment video share count
    await db
      .update(videos)
      .set({ shareCount: sql`${videos.shareCount} + 1` })
      .where(eq(videos.id, videoId));

    return share;
  }

  async getShareCount(videoId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(videoShares)
      .where(eq(videoShares.videoId, videoId));

    return result[0]?.count || 0;
  }

  // Follow operations
  async followUser(followerId: string, followingId: string): Promise<Follow> {
    // Check if already following or trying to follow self
    if (followerId === followingId) {
      throw new Error("Cannot follow yourself");
    }

    const existing = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new follow (database unique constraint prevents duplicates)
    const [follow] = await db.insert(follows).values({ followerId, followingId }).returning();
    return follow;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1);

    return result.length > 0;
  }

  async getFollowerCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(follows)
      .where(eq(follows.followingId, userId));

    return result[0]?.count || 0;
  }

  async getFollowingCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(follows)
      .where(eq(follows.followerId, userId));

    return result[0]?.count || 0;
  }

  async getFollowingVideos(userId: string, limit: number = 50): Promise<Video[]> {
    // Get IDs of users that the current user is following
    const followingUsers = await db
      .select({ id: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));

    if (followingUsers.length === 0) {
      return [];
    }

    const followingIds = followingUsers.map(f => f.id);

    // Get videos from followed creators using inArray
    return await db
      .select()
      .from(videos)
      .where(inArray(videos.creatorId, followingIds))
      .orderBy(desc(videos.createdAt))
      .limit(limit);
  }

  // Gift operations
  async getGiftTypes(): Promise<GiftType[]> {
    return await db.select().from(giftTypes);
  }

  async sendGift(giftData: InsertGift): Promise<Gift> {
    const [gift] = await db.insert(gifts).values(giftData).returning();

    // Get gift type to calculate value
    const [giftType] = await db.select().from(giftTypes).where(eq(giftTypes.id, giftData.giftTypeId));

    if (giftType) {
      const quantity = giftData.quantity || 1;
      const totalValue = giftType.usdValue * quantity;
      const creatorEarnings = totalValue * 0.6; // 60% goes to creator

      // Update recipient earnings
      await db
        .update(users)
        .set({ totalEarnings: sql`${users.totalEarnings} + ${creatorEarnings}` })
        .where(eq(users.id, giftData.recipientId));

      // Create transaction for recipient
      await this.createTransaction({
        userId: giftData.recipientId,
        type: "gift_received",
        amount: creatorEarnings,
        description: `Received ${quantity} ${giftType.name}(s)`,
        status: "completed",
      });
    }

    return gift;
  }

  async getGiftsByRecipient(recipientId: string): Promise<Gift[]> {
    return await db
      .select()
      .from(gifts)
      .where(eq(gifts.recipientId, recipientId))
      .orderBy(desc(gifts.createdAt));
  }

  // Credit operations
  async getCreditPackages(): Promise<CreditPackage[]> {
    return await db.select().from(creditPackages);
  }

  async updateUserCredits(userId: string, amount: number): Promise<void> {
    await db
      .update(users)
      .set({ creditBalance: sql`${users.creditBalance} + ${amount}` })
      .where(eq(users.id, userId));
  }

  async updateUserEarnings(userId: string, amount: number): Promise<void> {
    await db
      .update(users)
      .set({ totalEarnings: sql`${users.totalEarnings} + ${amount}` })
      .where(eq(users.id, userId));
  }

  // Transaction operations
  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(transactionData).returning();
    return transaction;
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async updateTransactionStatus(paymentProviderId: string, status: string): Promise<void> {
    await db
      .update(transactions)
      .set({ status })
      .where(eq(transactions.paymentProvider, paymentProviderId));
  }

  // Dashboard operations
  async getDashboardStats(userId: string): Promise<any> {
    // Get user videos
    const userVideos = await this.getVideosByCreator(userId);

    // Calculate totals
    const totalViews = userVideos.reduce((sum, v) => sum + v.views, 0);
    const totalLikes = userVideos.reduce((sum, v) => sum + v.likes, 0);

    // Get gifts received
    const userGifts = await this.getGiftsByRecipient(userId);

    // Get user
    const user = await this.getUser(userId);

    return {
      totalEarnings: user?.totalEarnings || 0,
      totalViews,
      totalLikes,
      totalVideos: userVideos.length,
      totalGifts: userGifts.length,
      currency: user?.currency || "USD",
      pendingWithdrawal: 0,
    };
  }

  async getCreatorVideosWithStats(userId: string): Promise<any[]> {
    const userVideos = await this.getVideosByCreator(userId);

    // For each video, calculate earnings from gifts
    const videosWithStats = await Promise.all(
      userVideos.map(async (video) => {
        const videoGifts = await db
          .select()
          .from(gifts)
          .where(eq(gifts.videoId, video.id));

        let earnings = 0;
        for (const gift of videoGifts) {
          const [giftType] = await db
            .select()
            .from(giftTypes)
            .where(eq(giftTypes.id, gift.giftTypeId));

          if (giftType) {
            earnings += giftType.usdValue * gift.quantity * 0.6; // 60% to creator
          }
        }

        return {
          ...video,
          earnings,
          giftCount: videoGifts.reduce((sum, g) => sum + g.quantity, 0),
        };
      })
    );

    return videosWithStats;
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // Message operations
  async sendMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }

  async getConversations(userId: string): Promise<any[]> {
    // Get all users this user has messaged with
    const sent = await db
      .select({ otherUserId: messages.recipientId })
      .from(messages)
      .where(eq(messages.senderId, userId))
      .groupBy(messages.recipientId);

    const received = await db
      .select({ otherUserId: messages.senderId })
      .from(messages)
      .where(eq(messages.recipientId, userId))
      .groupBy(messages.senderId);

    const uniqueUserIds = Array.from(
      new Set([...sent.map(s => s.otherUserId), ...received.map(r => r.otherUserId)])
    );

    // Get user details and last message for each conversation
    const conversations = await Promise.all(
      uniqueUserIds.map(async (otherUserId) => {
        const user = await this.getUser(otherUserId);
        
        // Get last message
        const lastMessages = await db
          .select()
          .from(messages)
          .where(
            or(
              and(eq(messages.senderId, userId), eq(messages.recipientId, otherUserId)),
              and(eq(messages.senderId, otherUserId), eq(messages.recipientId, userId))
            )
          )
          .orderBy(desc(messages.createdAt))
          .limit(1);

        const unreadCount = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(
            and(
              eq(messages.senderId, otherUserId),
              eq(messages.recipientId, userId),
              eq(messages.isRead, false)
            )
          );

        return {
          user,
          lastMessage: lastMessages[0],
          unreadCount: unreadCount[0]?.count || 0,
        };
      })
    );

    // Sort by last message time
    return conversations.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }

  async getMessages(userId: string, otherUserId: string, limit: number = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId), eq(messages.recipientId, otherUserId)),
          and(eq(messages.senderId, otherUserId), eq(messages.recipientId, userId))
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  async markMessagesAsRead(recipientId: string, senderId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.recipientId, recipientId),
          eq(messages.senderId, senderId)
        )
      );
  }

  async getUnreadMessagesCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(
        and(
          eq(messages.recipientId, userId),
          eq(messages.isRead, false)
        )
      );
    return result[0]?.count || 0;
  }

  // Share operations
  async getCurrentSharePrice(): Promise<SharePriceHistory | undefined> {
    const [price] = await db
      .select()
      .from(sharePriceHistory)
      .orderBy(desc(sharePriceHistory.createdAt))
      .limit(1);
    return price;
  }

  async getUserShares(userId: string): Promise<Share[]> {
    return await db
      .select()
      .from(shares)
      .where(eq(shares.userId, userId))
      .orderBy(desc(shares.purchasedAt));
  }

  async getTotalUserShares(userId: string): Promise<number> {
    const userShares = await this.getUserShares(userId);
    return userShares.reduce((total, share) => total + share.quantity, 0);
  }

  async createShare(share: InsertShare): Promise<Share> {
    const [newShare] = await db
      .insert(shares)
      .values(share)
      .returning();
    return newShare;
  }

  async createShareTransaction(transaction: InsertShareTransaction): Promise<ShareTransaction> {
    const [newTransaction] = await db
      .insert(shareTransactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async updateShareTransactionStatus(
    transactionId: string,
    status: string,
    stripePaymentIntentId?: string
  ): Promise<void> {
    const updates: any = { status };
    if (stripePaymentIntentId) {
      updates.stripePaymentIntentId = stripePaymentIntentId;
    }
    await db
      .update(shareTransactions)
      .set(updates)
      .where(eq(shareTransactions.id, transactionId));
  }

  async getSharePriceHistory(limit: number = 30): Promise<SharePriceHistory[]> {
    return await db
      .select()
      .from(sharePriceHistory)
      .orderBy(desc(sharePriceHistory.createdAt))
      .limit(limit);
  }

  async getShareStats(): Promise<{
    currentPrice: number;
    totalShares: number;
    platformValue: number;
    totalInvestors: number;
  }> {
    const currentPrice = await this.getCurrentSharePrice();
    
    const totalSharesResult = await db
      .select({ total: sql<number>`COALESCE(SUM(${shares.quantity}), 0)::int` })
      .from(shares);

    const totalInvestorsResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${shares.userId})::int` })
      .from(shares);

    return {
      currentPrice: currentPrice?.priceUsd || 108,
      totalShares: totalSharesResult[0]?.total || 0,
      platformValue: currentPrice?.platformValue || 1080000,
      totalInvestors: totalInvestorsResult[0]?.count || 0,
    };
  }

  async getUserShareTransactions(userId: string): Promise<ShareTransaction[]> {
    return await db
      .select()
      .from(shareTransactions)
      .where(eq(shareTransactions.userId, userId))
      .orderBy(desc(shareTransactions.createdAt));
  }

  async getAllBadgeTypes(): Promise<BadgeType[]> {
    return await db
      .select()
      .from(badgeTypes)
      .orderBy(badgeTypes.order, badgeTypes.tier);
  }

  async getUserBadges(userId: string): Promise<(UserBadge & { badgeType: BadgeType })[]> {
    const badges = await db
      .select({
        id: userBadges.id,
        userId: userBadges.userId,
        badgeTypeId: userBadges.badgeTypeId,
        earnedAt: userBadges.earnedAt,
        badgeType: badgeTypes,
      })
      .from(userBadges)
      .innerJoin(badgeTypes, eq(userBadges.badgeTypeId, badgeTypes.id))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt));
    
    return badges as (UserBadge & { badgeType: BadgeType })[];
  }

  async awardBadge(userId: string, badgeTypeId: string): Promise<UserBadge> {
    const existingBadge = await db
      .select()
      .from(userBadges)
      .where(and(
        eq(userBadges.userId, userId),
        eq(userBadges.badgeTypeId, badgeTypeId)
      ))
      .limit(1);

    if (existingBadge.length > 0) {
      return existingBadge[0];
    }

    const [newBadge] = await db
      .insert(userBadges)
      .values({ userId, badgeTypeId })
      .returning();
    
    return newBadge;
  }

  async hasBadge(userId: string, badgeTypeId: string): Promise<boolean> {
    const badge = await db
      .select()
      .from(userBadges)
      .where(and(
        eq(userBadges.userId, userId),
        eq(userBadges.badgeTypeId, badgeTypeId)
      ))
      .limit(1);
    
    return badge.length > 0;
  }

  async checkAndAwardBadges(userId: string): Promise<UserBadge[]> {
    const newBadges: UserBadge[] = [];
    
    const stats = await this.getDashboardStats(userId);
    const allBadgeTypes = await this.getAllBadgeTypes();
    const followerCount = await this.getFollowerCount(userId);

    for (const badgeType of allBadgeTypes) {
      const alreadyHas = await this.hasBadge(userId, badgeType.id);
      if (alreadyHas) continue;

      let shouldAward = false;

      switch (badgeType.category) {
        case 'views':
          shouldAward = stats.totalViews >= badgeType.requirement;
          break;
        case 'likes':
          shouldAward = stats.totalLikes >= badgeType.requirement;
          break;
        case 'followers':
          shouldAward = followerCount >= badgeType.requirement;
          break;
        case 'earnings':
          shouldAward = stats.totalEarnings >= badgeType.requirement;
          break;
        case 'videos':
          shouldAward = stats.totalVideos >= badgeType.requirement;
          break;
      }

      if (shouldAward) {
        const badge = await this.awardBadge(userId, badgeType.id);
        newBadges.push(badge);
        
        await this.createNotification({
          userId,
          type: 'badge',
          message: `Félicitations ! Vous avez obtenu le badge "${badgeType.name}"`,
        });
      }
    }

    return newBadges;
  }

  // Referral operations
  async getUserReferralCode(userId: string): Promise<string> {
    const user = await this.getUser(userId);
    
    if (user?.referralCode) {
      return user.referralCode;
    }

    // Generate a new referral code
    const code = this.generateReferralCode(user);
    
    // Update user with the new code
    await db
      .update(users)
      .set({ referralCode: code })
      .where(eq(users.id, userId));
    
    return code;
  }

  private generateReferralCode(user?: User): string {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const namePart = user?.firstName?.substring(0, 3).toUpperCase() || "USR";
    return `${namePart}${randomPart}`;
  }

  async createReferral(referralData: InsertReferral): Promise<Referral> {
    const [referral] = await db
      .insert(referrals)
      .values(referralData)
      .returning();
    
    return referral;
  }

  async getReferralsByReferrer(referrerId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, referrerId))
      .orderBy(desc(referrals.createdAt));
  }

  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    totalBonus: number;
    pendingReferrals: number;
  }> {
    const userReferrals = await this.getReferralsByReferrer(userId);
    
    const totalReferrals = userReferrals.length;
    const totalBonus = userReferrals.reduce((sum, ref) => sum + ref.bonusAwarded, 0);
    const pendingReferrals = userReferrals.filter(ref => ref.status === "pending").length;
    
    return {
      totalReferrals,
      totalBonus,
      pendingReferrals,
    };
  }
}

export const storage = new DatabaseStorage();
