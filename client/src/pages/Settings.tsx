import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  User, 
  Globe, 
  Bell, 
  Shield,
  CreditCard,
  ChevronRight
} from "lucide-react";

export default function Settings() {
  const { user } = useAuth();

  const settingSections = [
    {
      title: "Creator Tools",
      items: [
        {
          icon: LayoutDashboard,
          label: "Creator Dashboard",
          description: "View your earnings, stats, and video performance",
          href: "/dashboard",
          testId: "link-dashboard",
        },
        {
          icon: ShoppingBag,
          label: "Credit Shop",
          description: "Purchase YimiCoins to support creators",
          href: "/shop",
          testId: "link-shop",
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          icon: User,
          label: "Profile",
          description: "Manage your profile and personal information",
          href: `/profile/${user?.id}`,
          testId: "link-profile-settings",
        },
        {
          icon: Globe,
          label: "Language",
          description: "Change app language (Français, English, Wolof, etc.)",
          href: "#language",
          testId: "button-language",
          badge: "Français",
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: Bell,
          label: "Notifications",
          description: "Manage notification preferences",
          href: "#notifications",
          testId: "link-notifications",
          badge: "Coming Soon",
        },
        {
          icon: Shield,
          label: "Privacy & Security",
          description: "Control your privacy and security settings",
          href: "#privacy",
          testId: "link-privacy",
          badge: "Coming Soon",
        },
      ],
    },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-poppins font-bold mb-2">Settings</h1>
          <p className="text-lg text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>

        <div className="space-y-8">
          {settingSections.map((section, idx) => (
            <div key={idx}>
              <h2 className="text-xl font-poppins font-semibold mb-4 text-muted-foreground">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isExternal = item.href.startsWith("#");
                  
                  const content = (
                    <Card className="hover-elevate transition-all cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{item.label}</h3>
                              {item.badge && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  );

                  if (isExternal) {
                    return (
                      <div key={item.href} data-testid={item.testId}>
                        {content}
                      </div>
                    );
                  }

                  return (
                    <Link key={item.href} href={item.href} data-testid={item.testId}>
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="pt-8 border-t">
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your FreeMind Vision account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Account Type</span>
                  <span className="text-sm font-medium">
                    {user?.isCreator ? "Creator" : "User"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">YimiCoins Balance</span>
                  <span className="text-sm font-medium text-primary">
                    {(user?.creditBalance || 0).toLocaleString()}
                  </span>
                </div>
                {user?.isCreator && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Earnings</span>
                    <span className="text-sm font-medium text-primary">
                      ${(user?.totalEarnings || 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout-settings"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
