import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Eye, Heart, Video, Gift, Download, CheckCircle2, XCircle, Users } from "lucide-react";
import type { User, Video as VideoType } from "@shared/schema";

interface DashboardStats {
  totalEarnings: number;
  totalViews: number;
  totalLikes: number;
  totalVideos: number;
  totalGifts: number;
  currency: string;
  pendingWithdrawal: number;
}

interface VideoWithStats extends VideoType {
  earnings: number;
  giftCount: number;
}

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
  });

  const { data: videos } = useQuery<VideoWithStats[]>({
    queryKey: ["/api/dashboard/videos"],
    enabled: isAuthenticated,
  });

  // Currency conversion (simplified - will enhance in backend)
  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "FCFA" || currency === "XOF") {
      return `${(amount * 655).toLocaleString()} FCFA`;
    }
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const currency = user.currency || "USD";
  const displayEarnings = stats?.totalEarnings 
    ? (typeof stats.totalEarnings === 'string' ? parseFloat(stats.totalEarnings) : stats.totalEarnings)
    : (user.totalEarnings ? (typeof user.totalEarnings === 'string' ? parseFloat(user.totalEarnings) : user.totalEarnings) : 0);
  const viewEarnings = user.viewEarnings ? parseFloat(user.viewEarnings as string) : 0;
  const followerCount = user.followerCount || 0;
  const isMonetized = user.isMonetized || false;
  const monetizationThreshold = 7000;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-poppins font-bold mb-2">
              Creator Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {user.firstName || user.email?.split("@")[0] || "Creator"}!
            </p>
          </div>
          <Button size="lg" className="font-poppins font-semibold" data-testid="button-withdraw">
            <Download className="w-5 h-5 mr-2" />
            Withdraw Earnings
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <Card className="hover-elevate transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Earnings
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-poppins font-bold text-primary" data-testid="text-total-earnings">
                {formatCurrency(displayEarnings, currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                60% of all gifts received
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Views
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-chart-3" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-poppins font-bold" data-testid="text-total-views">
                {(stats?.totalViews || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all videos
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Likes
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-poppins font-bold" data-testid="text-total-likes">
                {(stats?.totalLikes || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                People love your content
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gifts Received
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-chart-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-poppins font-bold" data-testid="text-total-gifts">
                {(stats?.totalGifts || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From your supporters
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                View Earnings
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-poppins font-bold text-blue-600" data-testid="text-view-earnings">
                {formatCurrency(viewEarnings, "FCFA")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                0.1 FCFA per view
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monetization Status */}
        <Card className={isMonetized ? "border-green-500/30" : "border-yellow-500/30"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-poppins text-xl">Statut Monétisation</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Auto-activée à {monetizationThreshold.toLocaleString()} abonnés
                </p>
              </div>
              {isMonetized ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <XCircle className="w-8 h-8 text-yellow-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Followers Progress */}
              <div className="space-y-2" data-testid="monetization-progress">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="font-medium">Abonnés</span>
                  </div>
                  <span className="font-poppins font-bold" data-testid="text-follower-count">
                    {followerCount.toLocaleString()} / {monetizationThreshold.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isMonetized ? "bg-green-500" : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.min((followerCount / monetizationThreshold) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Status Message */}
              <div
                className={`p-4 rounded-lg ${
                  isMonetized
                    ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
                    : "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900"
                }`}
                data-testid="monetization-status-message"
              >
                {isMonetized ? (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
                        Monétisation Active
                      </div>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Vous gagnez <strong>0.1 FCFA par vue</strong> sur vos vidéos. Les earnings sont calculés automatiquement et ajoutés à votre compte.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                        Pas Encore Monétisé
                      </div>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Atteignez <strong>{(monetizationThreshold - followerCount).toLocaleString()} abonnés supplémentaires</strong> pour activer la monétisation automatique et commencer à gagner 0.1 FCFA par vue.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-poppins text-xl">Revenue Breakdown</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  You keep 60% of all earnings
                </p>
              </div>
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-card hover-elevate">
                <div>
                  <div className="font-medium">Your Share (60%)</div>
                  <div className="text-sm text-muted-foreground">Direct to your account</div>
                </div>
                <div className="text-xl font-poppins font-bold text-primary">
                  {formatCurrency(displayEarnings, currency)}
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-card">
                <div>
                  <div className="font-medium">Platform Fee (40%)</div>
                  <div className="text-sm text-muted-foreground">Infrastructure & support</div>
                </div>
                <div className="text-xl font-poppins font-bold text-muted-foreground">
                  {formatCurrency(displayEarnings * 0.67, currency)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Videos */}
        <Card>
          <CardHeader>
            <CardTitle className="font-poppins text-xl">Your Videos</CardTitle>
          </CardHeader>
          <CardContent>
            {!videos || videos.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-poppins font-semibold mb-2">No videos yet</h3>
                <p className="text-muted-foreground mb-6">
                  Upload your first video to start earning!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center gap-4 p-4 rounded-lg hover-elevate transition-all"
                    data-testid={`video-${video.id}`}
                  >
                    <div className="w-24 h-24 rounded-lg bg-card-foreground/5 flex-shrink-0 overflow-hidden">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-poppins font-semibold truncate mb-1">
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {video.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {video.likes.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Gift className="w-4 h-4" />
                          {video.giftCount || 0}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-poppins font-bold text-primary">
                        {formatCurrency(video.earnings || 0, currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">Earned</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
