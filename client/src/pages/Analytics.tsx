import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Eye, Heart, MessageSquare, DollarSign } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoStats {
  id: string;
  title: string;
  views: number;
  likes: number;
  commentCount: number;
  createdAt: string;
}

interface DashboardStats {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalVideos: number;
  totalEarnings: number;
}

export default function Analytics() {
  const { data: dashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: videos, isLoading: videosLoading } = useQuery<VideoStats[]>({
    queryKey: ["/api/dashboard/videos"],
  });

  if (statsLoading || videosLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const sortedVideos = videos ? [...videos].sort((a, b) => b.views - a.views) : [];
  const topVideos = sortedVideos.slice(0, 10);

  const viewsChartData = topVideos.map(v => ({
    name: v.title.substring(0, 20) + (v.title.length > 20 ? '...' : ''),
    vues: v.views,
    likes: v.likes,
  }));

  const timelineData = videos ? 
    [...videos].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(v => ({
        date: new Date(v.createdAt).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
        vues: v.views,
      })) : [];

  const stats = [
    {
      title: "Vues totales",
      value: dashboardStats?.totalViews || 0,
      icon: Eye,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Likes totaux",
      value: dashboardStats?.totalLikes || 0,
      icon: Heart,
      color: "text-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-950",
    },
    {
      title: "Commentaires",
      value: dashboardStats?.totalComments || 0,
      icon: MessageSquare,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: "Revenus",
      value: `$${(dashboardStats?.totalEarnings || 0).toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-poppins font-bold" data-testid="heading-analytics">
          Analytics de créateur
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} data-testid={`card-stat-${i}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-stat-value-${i}`}>
                {stat.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-views-chart">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Vues par vidéo (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={viewsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="vues" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="card-engagement-chart">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-600" />
              Engagement (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={viewsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="likes" fill="#ec4899" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {timelineData.length > 0 && (
        <Card data-testid="card-timeline-chart">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Évolution des vues dans le temps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="vues" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-top-videos">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Top vidéos par performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topVideos.slice(0, 5).map((video, i) => (
              <div
                key={video.id}
                className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                data-testid={`item-top-video-${i}`}
              >
                <div className="flex-1">
                  <div className="font-medium" data-testid={`text-video-title-${i}`}>
                    {i + 1}. {video.title}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(video.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span className="font-medium" data-testid={`text-video-views-${i}`}>
                      {video.views.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-600" />
                    <span className="font-medium" data-testid={`text-video-likes-${i}`}>
                      {video.likes.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    <span className="font-medium" data-testid={`text-video-comments-${i}`}>
                      {video.commentCount}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
