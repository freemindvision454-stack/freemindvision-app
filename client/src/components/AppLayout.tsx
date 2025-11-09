import { TikTokTopNav } from "@/components/TikTokTopNav";
import { TikTokBottomNav } from "@/components/TikTokBottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* TikTok-style Top Navigation */}
      <TikTokTopNav />

      {/* Main Content - with top padding for fixed header */}
      <main className="flex-1 pt-14">
        {children}
      </main>

      {/* TikTok-style Bottom Navigation (mobile only) */}
      <TikTokBottomNav />
    </div>
  );
}
