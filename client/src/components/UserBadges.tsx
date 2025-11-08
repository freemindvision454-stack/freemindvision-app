import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Video, 
  Eye, 
  Heart, 
  Users, 
  DollarSign,
  LucideIcon
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BadgeType {
  id: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
  category: string;
  requirement: number;
  tier: string;
  order: number;
}

interface UserBadge {
  id: string;
  userId: string;
  badgeTypeId: string;
  earnedAt: string;
  badgeType: BadgeType;
}

interface UserBadgesProps {
  userId: string;
}

const iconMap: Record<string, LucideIcon> = {
  Video,
  VideoIcon: Video,
  Eye,
  Heart,
  Users,
  DollarSign,
  Trophy,
};

const tierColors: Record<string, string> = {
  bronze: "bg-amber-700/20 text-amber-800 dark:text-amber-300 border-amber-700/50",
  silver: "bg-slate-300/20 text-slate-700 dark:text-slate-300 border-slate-400",
  gold: "bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 border-yellow-600",
  platinum: "bg-gray-400/20 text-gray-700 dark:text-gray-200 border-gray-500",
  diamond: "bg-blue-400/20 text-blue-700 dark:text-blue-300 border-blue-600",
};

export function UserBadges({ userId }: UserBadgesProps) {
  const { data: userBadges = [], isLoading } = useQuery<UserBadge[]>({
    queryKey: ["/api/users", userId, "badges"],
  });

  const { data: allBadgeTypes = [] } = useQuery<BadgeType[]>({
    queryKey: ["/api/badges/types"],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-badges-loading">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userBadges.length === 0) {
    return (
      <Card data-testid="card-no-badges">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            Badges et réalisations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun badge pour le moment</p>
            <p className="text-sm mt-1">
              Continuez à créer du contenu pour débloquer des badges !
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const earnedBadgeIds = new Set(userBadges.map(b => b.badgeTypeId));

  return (
    <Card data-testid="card-badges">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-600" />
          Badges et réalisations ({userBadges.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {userBadges.map((userBadge, index) => {
            const badgeType = userBadge.badgeType;
            const IconComponent = iconMap[badgeType.iconName] || Trophy;
            const tierColor = tierColors[badgeType.tier] || tierColors.bronze;

            return (
              <div
                key={userBadge.id}
                className="flex flex-col items-center p-4 rounded-lg border hover-elevate transition-all"
                data-testid={`badge-${index}`}
                title={badgeType.description}
              >
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${tierColor}`}
                >
                  <IconComponent 
                    className="w-8 h-8" 
                    style={{ color: badgeType.color }}
                  />
                </div>
                <h4 
                  className="text-sm font-semibold text-center"
                  data-testid={`badge-name-${index}`}
                >
                  {badgeType.name}
                </h4>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {badgeType.description}
                </p>
                <Badge 
                  variant="outline" 
                  className={`mt-2 text-xs ${tierColor}`}
                  data-testid={`badge-tier-${index}`}
                >
                  {badgeType.tier.charAt(0).toUpperCase() + badgeType.tier.slice(1)}
                </Badge>
              </div>
            );
          })}
        </div>

        {allBadgeTypes.length > userBadges.length && (
          <div className="mt-6 p-4 rounded-lg bg-muted/50">
            <h4 className="text-sm font-semibold mb-2">Badges à débloquer</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {allBadgeTypes
                .filter(bt => !earnedBadgeIds.has(bt.id))
                .slice(0, 8)
                .map((badgeType, index) => {
                  const IconComponent = iconMap[badgeType.iconName] || Trophy;
                  return (
                    <div
                      key={badgeType.id}
                      className="flex flex-col items-center p-3 rounded-lg opacity-40"
                      title={`${badgeType.description} (Requis: ${badgeType.requirement})`}
                    >
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-1">
                        <IconComponent className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        {badgeType.name}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
