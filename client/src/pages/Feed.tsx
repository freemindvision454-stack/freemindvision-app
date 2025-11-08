import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Share2, Gift, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Video, User } from "@shared/schema";
import { GiftModal } from "@/components/GiftModal";
import { ShareModal } from "@/components/ShareModal";
import { useAuth } from "@/hooks/useAuth";

interface VideoWithCreator extends Video {
  creator: User;
  isLiked?: boolean;
  commentCount?: number;
}

export default function Feed() {
  const { user: currentUser } = useAuth();
  const [feedType, setFeedType] = useState<"for-you" | "following">("for-you");

  const { data: forYouVideos, isLoading: forYouLoading } = useQuery<VideoWithCreator[]>({
    queryKey: ["/api/videos"],
    enabled: feedType === "for-you",
  });

  const { data: followingVideos, isLoading: followingLoading } = useQuery<VideoWithCreator[]>({
    queryKey: ["/api/videos/following"],
    enabled: feedType === "following" && !!currentUser,
  });

  const videos = feedType === "for-you" ? forYouVideos : followingVideos;
  const isLoading = feedType === "for-you" ? forYouLoading : followingLoading;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [videoToShare, setVideoToShare] = useState<VideoWithCreator | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  // Handle scroll snapping
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const windowHeight = window.innerHeight;
      const newIndex = Math.round(scrollTop / windowHeight);
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [currentIndex]);

  // Auto-play current video
  useEffect(() => {
    const currentVideo = videoRefs.current.get(currentIndex);
    if (currentVideo && isPlaying) {
      currentVideo.play().catch(() => {});
    }

    // Pause all other videos
    videoRefs.current.forEach((video, index) => {
      if (index !== currentIndex) {
        video.pause();
      }
    });
  }, [currentIndex, isPlaying]);

  const handleLike = async (videoId: string) => {
    // Will implement in integration phase
    console.log("Like video:", videoId);
  };

  const handleComment = (videoId: string) => {
    // Will implement in integration phase
    console.log("Comment on video:", videoId);
  };

  const handleShare = (videoId: string) => {
    const video = videos?.find(v => v.id === videoId);
    if (video) {
      setVideoToShare(video);
      setShowShareModal(true);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading amazing content...</p>
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="h-screen bg-background flex flex-col">
        {currentUser && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
            <div className="flex items-center justify-center py-2">
              <Tabs value={feedType} onValueChange={(v) => setFeedType(v as "for-you" | "following")} className="w-auto">
                <TabsList className="bg-background border">
                  <TabsTrigger value="for-you" data-testid="tab-for-you" className="font-poppins font-semibold">
                    For You
                  </TabsTrigger>
                  <TabsTrigger value="following" data-testid="tab-following" className="font-poppins font-semibold">
                    Following
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        )}
        <div className={`flex-1 flex items-center justify-center ${currentUser ? 'mt-16' : ''}`}>
          <Card className="p-12 text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Play className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-poppins font-bold mb-2">
              {feedType === "following" ? "No Videos from Followed Creators" : "No Videos Yet"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {feedType === "following" 
                ? "Follow some creators to see their videos here!" 
                : "Be the first to share your creativity! Upload a video to get started."}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];

  return (
    <>
      {/* Feed Type Tabs */}
      {currentUser && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-center py-2">
            <Tabs value={feedType} onValueChange={(v) => setFeedType(v as "for-you" | "following")} className="w-auto">
              <TabsList className="bg-background border">
                <TabsTrigger value="for-you" data-testid="tab-for-you" className="font-poppins font-semibold">
                  For You
                </TabsTrigger>
                <TabsTrigger value="following" data-testid="tab-following" className="font-poppins font-semibold">
                  Following
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

      <div 
        ref={containerRef}
        className={`h-screen overflow-y-scroll snap-y snap-mandatory bg-background scroll-smooth ${currentUser ? 'pt-14' : ''}`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>

        {videos.map((video, index) => (
        <div
          key={video.id}
          className="h-screen snap-start snap-always relative flex items-center justify-center bg-black"
        >
          {/* Video Player */}
          <video
            ref={(el) => {
              if (el) videoRefs.current.set(index, el);
            }}
            src={video.videoUrl}
            className="w-full h-full object-cover"
            loop
            muted={isMuted}
            playsInline
            onClick={() => setIsPlaying(!isPlaying)}
          />

          {/* Overlay Gradient for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-sm font-medium">
                For You
              </div>
            </div>
          </div>

          {/* Bottom Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 z-10">
            <div className="flex items-end gap-4">
              {/* Creator Info & Caption */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-12 h-12 border-2 border-white ring-2 ring-white/20">
                    <AvatarImage src={video.creator.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {video.creator.firstName?.[0] || video.creator.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-poppins font-semibold text-white drop-shadow-lg">
                      {video.creator.firstName && video.creator.lastName
                        ? `${video.creator.firstName} ${video.creator.lastName}`
                        : video.creator.email?.split("@")[0] || "Creator"}
                    </div>
                    {video.creator.isCreator && (
                      <div className="text-xs text-white/80">Creator</div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-poppins font-semibold text-lg text-white drop-shadow-lg line-clamp-2">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="text-sm text-white/90 drop-shadow-lg line-clamp-2">
                      {video.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-3 text-white/80 text-sm">
                  <div className="flex items-center gap-1">
                    <Play className="w-4 h-4" />
                    <span>{video.views.toLocaleString()} views</span>
                  </div>
                </div>
              </div>

              {/* Interaction Buttons */}
              <div className="flex flex-col gap-4 items-center">
                <button
                  onClick={() => handleLike(video.id)}
                  className="flex flex-col items-center gap-1 hover-elevate active-elevate-2 p-2 rounded-lg transition-all"
                  data-testid={`button-like-${video.id}`}
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Heart
                      className={`w-6 h-6 ${video.isLiked ? "fill-primary text-primary" : "text-white"}`}
                    />
                  </div>
                  <span className="text-xs text-white font-medium drop-shadow">
                    {video.likes.toLocaleString()}
                  </span>
                </button>

                <button
                  onClick={() => handleComment(video.id)}
                  className="flex flex-col items-center gap-1 hover-elevate active-elevate-2 p-2 rounded-lg transition-all"
                  data-testid={`button-comment-${video.id}`}
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs text-white font-medium drop-shadow">
                    {video.commentCount || 0}
                  </span>
                </button>

                <button
                  onClick={() => handleShare(video.id)}
                  className="flex flex-col items-center gap-1 hover-elevate active-elevate-2 p-2 rounded-lg transition-all"
                  data-testid={`button-share-${video.id}`}
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs text-white font-medium drop-shadow">
                    Share
                  </span>
                </button>

                <button
                  onClick={() => setShowGiftModal(true)}
                  className="flex flex-col items-center gap-1 hover-elevate active-elevate-2 p-2 rounded-lg transition-all"
                  data-testid={`button-gift-${video.id}`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs text-white font-medium drop-shadow">
                    Gift
                  </span>
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="flex flex-col items-center gap-1 hover-elevate active-elevate-2 p-2 rounded-lg transition-all"
                  data-testid="button-mute"
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    {isMuted ? (
                      <VolumeX className="w-6 h-6 text-white" />
                    ) : (
                      <Volume2 className="w-6 h-6 text-white" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Play/Pause Indicator */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <Pause className="w-10 h-10 text-white" />
              </div>
            </div>
          )}
        </div>
      ))}
      </div>

      {/* Gift Modal */}
      {showGiftModal && currentVideo && (
        <GiftModal
          isOpen={showGiftModal}
          onClose={() => setShowGiftModal(false)}
          recipientId={currentVideo.creatorId}
          videoId={currentVideo.id}
        />
      )}

      {/* Share Modal */}
      {videoToShare && (
        <ShareModal
          open={showShareModal}
          onOpenChange={setShowShareModal}
          videoUrl={videoToShare.videoUrl}
          videoTitle={videoToShare.title}
          videoCreator={
            videoToShare.creator.firstName && videoToShare.creator.lastName
              ? `${videoToShare.creator.firstName} ${videoToShare.creator.lastName}`
              : videoToShare.creator.email?.split("@")[0] || "Creator"
          }
        />
      )}
    </>
  );
}
