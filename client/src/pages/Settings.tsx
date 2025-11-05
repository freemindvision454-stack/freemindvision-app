import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations, useI18n } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Link } from "wouter";
import { useState } from "react";
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

interface SettingItem {
  icon: any;
  label: string;
  description: string;
  href: string;
  testId: string;
  badge?: string;
  onClick?: () => void;
}

export default function Settings() {
  const { user } = useAuth();
  const t = useTranslations();
  const { currentLanguage } = useI18n();
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);

  const settingSections: Array<{ title: string; items: SettingItem[] }> = [
    {
      title: t.settings.creatorTools,
      items: [
        {
          icon: LayoutDashboard,
          label: t.settings.dashboardTitle,
          description: t.settings.dashboardDesc,
          href: "/dashboard",
          testId: "link-dashboard",
        },
        {
          icon: ShoppingBag,
          label: t.settings.shopTitle,
          description: t.settings.shopDesc,
          href: "/shop",
          testId: "link-shop",
        },
      ],
    },
    {
      title: t.settings.account,
      items: [
        {
          icon: User,
          label: t.settings.profileTitle,
          description: t.settings.profileDesc,
          href: `/profile/${user?.id}`,
          testId: "link-profile-settings",
        },
        {
          icon: Globe,
          label: t.settings.languageTitle,
          description: t.settings.languageDesc,
          href: "#language",
          testId: "button-language",
          badge: currentLanguage.nativeName,
          onClick: () => setLanguageDialogOpen(true),
        },
      ],
    },
    {
      title: t.settings.preferences,
      items: [
        {
          icon: Bell,
          label: t.settings.notificationsTitle,
          description: t.settings.notificationsDesc,
          href: "#notifications",
          testId: "link-notifications",
          badge: t.common.comingSoon,
        },
        {
          icon: Shield,
          label: t.settings.privacyTitle,
          description: t.settings.privacyDesc,
          href: "#privacy",
          testId: "link-privacy",
          badge: t.common.comingSoon,
        },
      ],
    },
  ];

  return (
    <AppLayout>
      <LanguageSelector open={languageDialogOpen} onOpenChange={setLanguageDialogOpen} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-poppins font-bold mb-2">{t.settings.title}</h1>
          <p className="text-lg text-muted-foreground">
            {t.settings.subtitle}
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
                      <div 
                        key={item.href} 
                        data-testid={item.testId}
                        onClick={item.onClick}
                      >
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
                <CardTitle>{t.settings.accountInfo}</CardTitle>
                <CardDescription>{t.settings.accountInfoDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t.settings.email}</span>
                  <span className="text-sm font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t.settings.accountType}</span>
                  <span className="text-sm font-medium">
                    {user?.isCreator ? t.settings.creator : t.settings.user}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t.settings.balance}</span>
                  <span className="text-sm font-medium text-primary">
                    {(user?.creditBalance || 0).toLocaleString()}
                  </span>
                </div>
                {user?.isCreator && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t.settings.totalEarnings}</span>
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
              {t.nav.logout}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
