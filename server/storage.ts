// Storage implementation with PostgreSQL - references javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  videos,
  comments,
  likes,
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
  type Gift,
  type InsertGift,
  type GiftType,
  type CreditPackage,
  type Transaction,
  type InsertTransaction,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
