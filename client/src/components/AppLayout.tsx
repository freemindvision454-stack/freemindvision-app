import { Link, useLocation } from "wouter";
import { Home, Upload as UploadIcon, MessageCircle, Video, Menu, X, Coins, Settings, Search, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import logoUrl from "@assets/1762348677561_1762361963790.jpg";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { TikTokSearchBar } from "@/components/TikTokSearchBar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email?.split("@")[0] || "User";

  const navItems = [
    { href: "/", label: "Home", icon: Home, testId: "nav-home" },
    { href: "/live", label: "Live", icon: Video, testId: "nav-live" },
    { href: "/upload", label: "Upload", icon: UploadIcon, testId: "nav-upload" },
    { href: "/messages", label: "Messages", icon: MessageCircle, testId: "nav-messages" },
    { href: "/analytics", label: "Dashboard", icon: TrendingUp, testId: "nav-dashboard" },
  ];

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileSearchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(mobileSearchQuery.trim())}`);
      setMobileSearchQuery("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4 h-16">
            {/* Logo */}
            <Link href="/" data-testid="link-home">
              <div className="flex items-center gap-3 hover-elevate p-2 rounded-lg transition-all cursor-pointer">
                <img 
                  src={logoUrl} 
                  alt="FreeMind Vision Logo" 
                  className="h-10 w-10 object-contain"
                />
                <div className="text-2xl font-poppins font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent hidden lg:block">
                  FreeMind
                </div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;

                return (
                  <Link key={item.href} href={item.href} data-testid={item.testId}>
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all hover-elevate cursor-pointer ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="hidden md:flex items-center gap-2">
              <TikTokSearchBar />

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Coins className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary" data-testid="text-user-credits">
                  {(user?.creditBalance || 0).toLocaleString()}
                </span>
              </div>

              <NotificationsDropdown />

              <Link href="/settings" data-testid="link-settings">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Settings className="w-5 h-5" />
                </Button>
              </Link>

              <Link href={`/profile/${user?.id}`} data-testid="button-profile">
                <div className="hover-elevate rounded-full cursor-pointer">
                  <Avatar>
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {displayName[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </Link>

              <Button
                variant="outline"
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-logout"
              >
                Logout
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 hover-elevate rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Search Bar - Mobile */}
          <div className="md:hidden pb-3">
            <form onSubmit={handleMobileSearch} className="w-full">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={mobileSearchQuery}
                  onChange={(e) => setMobileSearchQuery(e.target.value)}
                  placeholder="Rechercher des vidéos..."
                  className="pl-10 pr-4"
                  data-testid="input-search-header-mobile"
                />
              </div>
            </form>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t bg-background">
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;

                return (
                  <Link key={item.href} href={item.href} data-testid={`${item.testId}-mobile`}>
                    <div
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all hover-elevate cursor-pointer ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}

              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center gap-3 px-4">
                  <Avatar>
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {displayName[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{displayName}</div>
                    <div className="text-sm text-muted-foreground">
                      {(user?.creditBalance || 0).toLocaleString()} YimiCoins
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = "/api/logout"}
                  data-testid="button-logout-mobile"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden sticky bottom-0 z-50 border-t bg-background">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;

            return (
              <Link key={item.href} href={item.href} data-testid={`${item.testId}-bottom`}>
                <div
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all hover-elevate cursor-pointer ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
