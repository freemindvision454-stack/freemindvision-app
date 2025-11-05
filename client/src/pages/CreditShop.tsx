import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, CreditCard, Smartphone, Banknote, Sparkles, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CreditPackage } from "@shared/schema";
import { useEffect, useState } from "react";
import { PaymentMethodModal } from "@/components/PaymentMethodModal";

export default function CreditShop() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: packages } = useQuery<CreditPackage[]>({
    queryKey: ["/api/credit-packages"],
    enabled: isAuthenticated,
  });

  const handleBuyClick = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setShowPaymentModal(true);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading shop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">YimiCoins Shop</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-poppins font-bold mb-4">
            Get YimiCoins
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Support your favorite creators with virtual gifts. Every YimiCoin you send helps creators earn real money.
          </p>

          {/* Current Balance */}
          <Card className="max-w-md mx-auto mt-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-muted-foreground">Your Balance</div>
                    <div className="text-2xl font-poppins font-bold" data-testid="text-credit-balance">
                      {(user.creditBalance || 0).toLocaleString()} YimiCoins
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Credit Packages */}
        <div className="mb-12">
          <h2 className="text-2xl font-poppins font-bold mb-6">Choose Your Package</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages?.map((pkg) => (
              <Card
                key={pkg.id}
                className={`relative overflow-hidden hover-elevate transition-all ${
                  pkg.isPopular ? "border-primary ring-2 ring-primary/20" : ""
                }`}
                data-testid={`package-${pkg.id}`}
              >
                {pkg.isPopular && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground font-poppins">
                      Popular
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4">
                    <Coins className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="font-poppins text-2xl">{pkg.name}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <div className="text-4xl font-poppins font-bold mb-1">
                      {pkg.credits.toLocaleString()}
                      {pkg.bonus > 0 && (
                        <span className="text-lg text-primary ml-2">
                          +{pkg.bonus}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">YimiCoins</div>
                  </div>

                  {pkg.bonus > 0 && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-medium">Bonus {pkg.bonus} coins included!</span>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <div className="text-3xl font-poppins font-bold mb-4">
                      ${pkg.priceUsd.toFixed(2)} USD
                    </div>
                    <Button
                      className="w-full font-poppins font-semibold"
                      size="lg"
                      onClick={() => handleBuyClick(pkg)}
                      data-testid={`button-buy-${pkg.id}`}
                    >
                      Acheter maintenant
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="font-poppins text-xl">Accepted Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-card hover-elevate">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">Credit/Debit Cards</div>
                  <div className="text-xs text-muted-foreground">Visa, Mastercard</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-card hover-elevate">
                <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5 text-chart-3" />
                </div>
                <div>
                  <div className="font-medium">Mobile Money</div>
                  <div className="text-xs text-muted-foreground">Orange, MTN, Wave</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-card hover-elevate">
                <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center flex-shrink-0">
                  <Banknote className="w-5 h-5 text-chart-4" />
                </div>
                <div>
                  <div className="font-medium">PayPal</div>
                  <div className="text-xs text-muted-foreground">Secure & Fast</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-card hover-elevate">
                <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-chart-2" />
                </div>
                <div>
                  <div className="font-medium">Bank Transfer</div>
                  <div className="text-xs text-muted-foreground">All major banks</div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Secure Payments:</strong> All transactions are encrypted and secure. Your payment information is never stored on our servers.
              </p>
            </div>
          </CardContent>
        </Card>

        <PaymentMethodModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          selectedPackage={selectedPackage}
        />
      </div>
    </div>
  );
}
