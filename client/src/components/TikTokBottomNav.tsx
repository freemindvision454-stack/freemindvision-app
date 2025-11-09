import { Link, useLocation } from "wouter";
import { Home, Users, PlusCircle, MessageCircle, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "@/lib/i18n";

export function TikTokBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const t = useTranslations();

  const navItems = [
    { href: "/", label: t.nav.home, icon: Home, testId: "bottom-accueil" },
    { href: "/following", label: t.nav.following, icon: Users, testId: "bottom-suivis" },
    { href: "/upload", label: "", icon: PlusCircle, testId: "bottom-upload", isCenter: true },
    { href: "/messages", label: t.nav.messages, icon: MessageCircle, testId: "bottom-messages" },
    { href: user?.id ? `/profile/${user.id}` : "/", label: t.nav.profile, icon: User, testId: "bottom-profil" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;

          // Central Upload Button (TikTok style)
          if (item.isCenter) {
            return (
              <Link key={item.href} href={item.href} data-testid={item.testId}>
                <div className="flex flex-col items-center -mt-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-violet-600 rounded-xl blur-sm opacity-75" />
                    <div className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-violet-600 p-3 rounded-xl hover-elevate">
                      <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          }

          return (
            <Link key={item.href} href={item.href} data-testid={item.testId}>
              <div
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? "fill-primary/20" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
