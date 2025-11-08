// Storage implementation with PostgreSQL - references javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  videos,
  comments,
  likes,
  follows,
  notifications,
  messages,
  giftTypes,
  gifts,
  creditPackages,
  transactions,
  type User,
  type UpsertUser,
  type Video,
  type InsertVideo,
  type Comment,
  type InsertComment,
  type Like,
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
    await db
      .delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)));

    // Decrement video likes count
    await db
      .update(videos)
      .set({ likes: sql`${videos.likes} - 1` })
      .where(eq(videos.id, videoId));
  }

  async isVideoLiked(userId: string, videoId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)))
      .limit(1);

    return result.length > 0;
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
}

export const storage = new DatabaseStorage();
