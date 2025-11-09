import { useQuery } from "@tanstack/react-query";
import { Video as VideoType } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useTranslations } from "@/lib/i18n";

export default function Following() {
  const t = useTranslations();
  
  const { data: videos, isLoading } = useQuery<VideoType[]>({
    queryKey: ["/api/videos/following"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-14rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loader-following" />
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-14rem)] px-4 text-center">
        <p className="text-lg font-medium text-muted-foreground" data-testid="text-no-following">
          {t.common.comingSoon}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Follow creators to see their content here
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6" data-testid="page-following">
      <h1 className="text-2xl font-bold mb-6">{t.nav.following}</h1>
      <div className="space-y-4">
        <p className="text-muted-foreground">{t.common.comingSoon}</p>
      </div>
    </div>
  );
}
