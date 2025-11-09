import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Rocket, Check, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface SubscriptionPlan {
  id: string;
  name: string;
  tier: "basic" | "pro" | "enterprise";
  priceUsd: string;
  priceFcfa: string;
  interval: "month" | "year";
  features: string[];
  isPopular: boolean;
}

const planIcons = {
  basic: Crown,
  pro: Zap,
  enterprise: Rocket,
};

const planColors = {
  basic: "from-blue-500 to-cyan-500",
  pro: "from-purple-500 to-pink-500",
  enterprise: "from-orange-500 to-red-500",
};

export default function Subscription() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Non autorisé",
        description: "Vous devez être connecté. Redirection...",
        variant: "destructive",
      });
      setTimeout(() => {
        // Full-page redirect to backend OAuth endpoint - required for OAuth flow
        // Cannot use wouter navigation as /api/login is a backend route that initiates OAuth
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscriptions/plans"],
    enabled: isAuthenticated,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest("POST", "/api/subscriptions/checkout", { planId });
      const data = await response.json();
      return data as { url: string };
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la session de paiement",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (planId: string) => {
    checkoutMutation.mutate(planId);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="loading-state">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Plans Premium</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-poppins font-bold mb-4">
            Débloquez Votre Potentiel Créatif
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Accédez à des fonctionnalités exclusives, des analyses avancées et des outils de monétisation pour faire passer votre création de contenu au niveau supérieur.
          </p>
        </div>

        {/* Subscription Plans */}
        {plansLoading ? (
          <div className="flex justify-center py-12" data-testid="plans-loading">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {plans?.map((plan) => {
              const Icon = planIcons[plan.tier];
              const gradientColor = planColors[plan.tier];

              return (
                <Card
                  key={plan.id}
                  className={`relative overflow-hidden hover-elevate transition-all ${
                    plan.isPopular ? "border-primary ring-2 ring-primary/20 scale-105" : ""
                  }`}
                  data-testid={`plan-${plan.tier}`}
                >
                  {plan.isPopular && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-primary text-primary-foreground font-poppins">
                        Populaire
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradientColor} flex items-center justify-center mb-4`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="font-poppins text-2xl capitalize">
                      {plan.name}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Pricing */}
                    <div data-testid={`pricing-${plan.tier}`}>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-poppins font-bold" data-testid={`price-usd-${plan.tier}`}>
                          ${plan.priceUsd}
                        </span>
                        <span className="text-muted-foreground">/{plan.interval === "month" ? "mois" : "an"}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1" data-testid={`price-fcfa-${plan.tier}`}>
                        ou {parseInt(plan.priceFcfa).toLocaleString()} FCFA/{plan.interval === "month" ? "mois" : "an"}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-3" data-testid={`features-${plan.tier}`}>
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-3" data-testid={`feature-${plan.tier}-${index}`}>
                          <div className="mt-0.5">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-primary" />
                            </div>
                          </div>
                          <span className="text-sm text-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Subscribe Button */}
                    <Button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={checkoutMutation.isPending}
                      className="w-full h-12 font-poppins font-semibold"
                      variant={plan.isPopular ? "default" : "outline"}
                      data-testid={`button-subscribe-${plan.tier}`}
                    >
                      {checkoutMutation.isPending ? "Traitement..." : "S'abonner Maintenant"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* FAQ or Additional Info */}
        <div className="max-w-3xl mx-auto mt-16" data-testid="faq-section">
          <Card>
            <CardHeader>
              <CardTitle className="font-poppins">Questions Fréquentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div data-testid="faq-cancel">
                <h3 className="font-semibold mb-2">Puis-je annuler à tout moment ?</h3>
                <p className="text-sm text-muted-foreground">
                  Oui, vous pouvez annuler votre abonnement à tout moment. Votre accès continuera jusqu'à la fin de votre période de facturation actuelle.
                </p>
              </div>
              <div data-testid="faq-change-plan">
                <h3 className="font-semibold mb-2">Puis-je changer de plan ?</h3>
                <p className="text-sm text-muted-foreground">
                  Absolument ! Vous pouvez passer à un plan supérieur ou inférieur à tout moment. Les changements prendront effet immédiatement.
                </p>
              </div>
              <div data-testid="faq-payment-methods">
                <h3 className="font-semibold mb-2">Quels modes de paiement acceptez-vous ?</h3>
                <p className="text-sm text-muted-foreground">
                  Nous acceptons les cartes de crédit/débit via Stripe. Les paiements sont sécurisés et vos informations sont protégées.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
