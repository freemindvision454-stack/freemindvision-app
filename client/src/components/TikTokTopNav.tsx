import { Link, useLocation } from "wouter";
import { Radio, Compass, Users, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TikTokSearchBar } from "@/components/TikTokSearchBar";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { useTranslations } from "@/lib/i18n";

export function TikTokTopNav() {
  const [location] = useLocation();
  const t = useTranslations();

  const tabs = [
    { href: "/explore", label: t.nav.explore, icon: Compass, testId: "tab-explorer" },
    { href: "/following", label: t.nav.following, icon: Users, testId: "tab-suivis" },
    { href: "/", label: t.nav.forYou, icon: Flame, testId: "tab-pour-toi" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: LIVE Button (TikTok style) */}
        <Link href="/live" data-testid="button-live-top">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1.5 ${location === "/live" ? "bg-red-500/10 text-red-500" : ""}`}
          >
            <Radio className={`w-4 h-4 ${location === "/live" ? "animate-pulse" : ""}`} />
            <span className="font-semibold text-sm">LIVE</span>
          </Button>
        </Link>

        {/* Center: Tab Navigation */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location === tab.href;

            return (
              <Link key={tab.href} href={tab.href} data-testid={tab.testId}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-1.5 ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">{tab.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Right: Search + Notifications */}
        <div className="flex items-center gap-2">
          <TikTokSearchBar />
          <NotificationsDropdown />
        </div>
      </div>
    </header>
  );
}
