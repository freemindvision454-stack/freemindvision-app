import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Heart, Video as VideoIcon, Gift, UserPlus, UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User, Video } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserBadges } from "@/components/UserBadges";

interface ProfileData {
  user: User;
  videos: Video[];
  stats: {
    totalViews: number;
    totalLikes: number;
    followers: number;
  };
}

export default function Profile() {
  const [, params] = useRoute("/profile/:userId");
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const userId = params?.userId;

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/profile", userId],
    enabled: !!userId,
  });

  const { data: followStats } = useQuery<{ followerCount: number; followingCount: number }>({
    queryKey: ["/api/users", userId, "follow-stats"],
    enabled: !!userId,
  });

  const { data: followStatus } = useQuery<{ isFollowing: boolean }>({
    queryKey: ["/api/users", userId, "is-following"],
    enabled: !!userId && !!currentUser && currentUser.id !== userId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("No user ID");
      return await apiRequest("POST", `/api/users/${userId}/follow`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "is-following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "follow-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/following"] });
      toast({
        title: "Success!",
        description: "You are now following this creator",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to follow user",
        variant: "destructive",
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("No user ID");
      return await apiRequest("DELETE", `/api/users/${userId}/follow`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "is-following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "follow-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/following"] });
      toast({
        title: "Success",
        description: "You unfollowed this creator",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unfollow user",
        variant: "destructive",
      });
    },
  });

  const handleFollowToggle = () => {
    if (followStatus?.isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-12 text-center max-w-md">
          <h2 className="text-2xl font-poppins font-bold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground">
            This user doesn't exist or has been removed.
          </p>
        </Card>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.user.id;
  const displayName = profile.user.firstName && profile.user.lastName
    ? `${profile.user.firstName} ${profile.user.lastName}`
    : profile.user.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-background">
      {/* Profile Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background border-b">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <Avatar className="w-32 h-32 border-4 border-background ring-4 ring-primary/20">
              <AvatarImage src={profile.user.profileImageUrl || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-poppins">
                {displayName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-poppins font-bold mb-2">{displayName}</h1>
              {profile.user.isCreator && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
                  <VideoIcon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Creator</span>
                </div>
              )}

              {profile.user.bio && (
                <p className="text-muted-foreground mb-4 max-w-2xl">
                  {profile.user.bio}
                </p>
              )}

              <div className="flex flex-wrap gap-6 justify-center md:justify-start text-sm mb-4">
                <div className="text-center" data-testid="stat-videos">
                  <div className="text-2xl font-poppins font-bold">{profile.videos.length}</div>
                  <div className="text-muted-foreground">Videos</div>
                </div>
                <div className="text-center" data-testid="stat-views">
                  <div className="text-2xl font-poppins font-bold">
                    {profile.stats.totalViews.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground">Views</div>
                </div>
                <div className="text-center" data-testid="stat-likes">
                  <div className="text-2xl font-poppins font-bold">
                    {profile.stats.totalLikes.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground">Likes</div>
                </div>
                <div className="text-center" data-testid="stat-followers">
                  <div className="text-2xl font-poppins font-bold">
                    {followStats?.followerCount?.toLocaleString() || 0}
                  </div>
                  <div className="text-muted-foreground">Followers</div>
                </div>
                <div className="text-center" data-testid="stat-following">
                  <div className="text-2xl font-poppins font-bold">
                    {followStats?.followingCount?.toLocaleString() || 0}
                  </div>
                  <div className="text-muted-foreground">Following</div>
                </div>
              </div>

              {!isOwnProfile && currentUser && (
                <div className="flex gap-3">
                  <Button 
                    size="lg" 
                    variant={followStatus?.isFollowing ? "outline" : "default"}
                    className="font-poppins font-semibold" 
                    data-testid="button-follow"
                    onClick={handleFollowToggle}
                    disabled={followMutation.isPending || unfollowMutation.isPending}
                  >
                    {followStatus?.isFollowing ? (
                      <>
                        <UserMinus className="w-5 h-5 mr-2" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                  <Button size="lg" variant="outline" className="font-poppins font-semibold" data-testid="button-send-gift">
                    <Gift className="w-5 h-5 mr-2" />
                    Send Gift
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      {userId && (
        <div className="max-w-5xl mx-auto px-4 py-8 border-b">
          <UserBadges userId={userId} />
        </div>
      )}

      {/* Videos Grid */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-poppins font-bold mb-6">Videos</h2>

        {profile.videos.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <VideoIcon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-poppins font-semibold mb-2">No videos yet</h3>
            <p className="text-muted-foreground">
              {isOwnProfile
                ? "Upload your first video to get started!"
                : "This creator hasn't uploaded any videos yet."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {profile.videos.map((video) => (
              <Card
                key={video.id}
                className="group overflow-hidden hover-elevate cursor-pointer transition-all"
                data-testid={`video-card-${video.id}`}
              >
                <div className="relative aspect-[9/16] bg-card-foreground/5 overflow-hidden">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoIcon className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <div className="text-white w-full">
                      <h3 className="font-poppins font-semibold text-sm line-clamp-2 mb-2">
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {video.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {video.likes.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
