import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TrendingUp, DollarSign, Users, PieChart, ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");

interface ShareStats {
  currentPrice: number;
  totalShares: number;
  platformValue: number;
  totalInvestors: number;
}

function PurchaseForm({ currentPrice, clientSecret }: { currentPrice: number; clientSecret: string }) {
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      toast({
        title: "Erreur",
        description: "Le système de paiement n'est pas prêt",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/shares?success=true`,
      },
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Erreur de paiement",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      <Button
        type="submit"
        className="w-full"
        disabled={isProcessing || !stripe || !elements}
        data-testid="button-purchase-shares"
      >
        {isProcessing ? "Traitement..." : "Confirmer le paiement"}
      </Button>
    </form>
  );
}

function PurchaseFormWrapper({ currentPrice, clientSecret }: { currentPrice: number; clientSecret: string }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PurchaseForm currentPrice={currentPrice} clientSecret={clientSecret} />
    </Elements>
  );
}

export default function Shares() {
  const [location, setLocation] = useLocation();
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const { toast } = useToast();

  const { data: stats } = useQuery<ShareStats>({
    queryKey: ["/api/shares/stats"],
  });

  const { data: myShares } = useQuery<any>({
    queryKey: ["/api/shares/my-shares"],
  });

  const { data: priceHistory } = useQuery<any[]>({
    queryKey: ["/api/shares/price-history"],
  });

  // Handle successful payment redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast({
        title: "Paiement réussi !",
        description: "Vos actions ont été achetées avec succès.",
      });
      // Reset form state
      setShowPurchaseForm(false);
      setClientSecret(null);
      setQuantity(1);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/shares/my-shares"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shares/stats"] });
      // Clean up URL
      setLocation('/shares');
    }
  }, [toast, setLocation]);

  const currentPrice = stats?.currentPrice || 108;
  const totalAmount = quantity * currentPrice;

  const handleStartPurchase = () => {
    setShowPurchaseForm(true);
  };

  const handleCreatePaymentIntent = async () => {
    if (quantity < 1) {
      toast({
        title: "Quantité invalide",
        description: "Vous devez acheter au moins 1 action",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingIntent(true);
    try {
      const response: any = await apiRequest("POST", "/api/shares/purchase", { quantity });
      if (response.clientSecret) {
        setClientSecret(response.clientSecret);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'intention de paiement",
        variant: "destructive",
      });
    } finally {
      setIsCreatingIntent(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-poppins font-bold mb-2 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
            Actions FreeMind Vision
          </h1>
          <p className="text-muted-foreground text-lg">
            Investissez dans l'avenir de la création de contenu
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card data-testid="card-current-price">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prix actuel</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${currentPrice.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">par action</p>
            </CardContent>
          </Card>

          <Card data-testid="card-platform-value">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valeur de la plateforme</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${((stats?.platformValue || 1080000) / 1000).toFixed(0)}K
              </div>
              <p className="text-xs text-muted-foreground">valorisation totale</p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-investors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Investisseurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalInvestors || 0}</div>
              <p className="text-xs text-muted-foreground">actionnaires actifs</p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-shares">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actions émises</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalShares || 0}</div>
              <p className="text-xs text-muted-foreground">actions vendues</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Aperçu</TabsTrigger>
            <TabsTrigger value="purchase" data-testid="tab-purchase">Acheter</TabsTrigger>
            <TabsTrigger value="portfolio" data-testid="tab-portfolio">Mon portefeuille</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pourquoi investir dans FreeMind Vision ?</CardTitle>
                <CardDescription>
                  Une opportunité unique d'investir dans la prochaine génération de création de contenu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h3 className="font-semibold mb-2">Marché en croissance</h3>
                    <p className="text-sm text-muted-foreground">
                      La création de contenu vidéo explose, particulièrement en Afrique et dans les marchés émergents.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h3 className="font-semibold mb-2">Modèle unique 60/40</h3>
                    <p className="text-sm text-muted-foreground">
                      Notre partage des revenus favorise les créateurs, créant une communauté loyale et engagée.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h3 className="font-semibold mb-2">Technologie innovante</h3>
                    <p className="text-sm text-muted-foreground">
                      Plateforme moderne avec 20 filtres vidéo, messagerie, notifications et analytics avancés.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h3 className="font-semibold mb-2">Potentiel de croissance</h3>
                    <p className="text-sm text-muted-foreground">
                      Support multi-devises, paiements mobiles et expansion internationale programmée.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price History */}
            {priceHistory && priceHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Historique des prix</CardTitle>
                  <CardDescription>Évolution du prix de l'action</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {priceHistory.slice(0, 5).map((price: any, index: number) => (
                      <div
                        key={price.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted"
                        data-testid={`price-history-${index}`}
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(price.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-lg font-semibold">${price.priceUsd.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Purchase Tab */}
          <TabsContent value="purchase">
            <Card>
              <CardHeader>
                <CardTitle>Acheter des actions</CardTitle>
                <CardDescription>
                  Investissez dans FreeMind Vision dès aujourd'hui
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clientSecret ? (
                  <PurchaseFormWrapper currentPrice={currentPrice} clientSecret={clientSecret} />
                ) : showPurchaseForm ? (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-primary mb-2">
                        ${currentPrice.toFixed(2)}
                      </div>
                      <p className="text-sm text-muted-foreground">par action</p>
                    </div>

                    <div>
                      <Label htmlFor="quantity">Nombre d'actions</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="mt-2"
                        data-testid="input-share-quantity"
                      />
                    </div>

                    <div className="p-4 rounded-lg bg-muted">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Prix par action</span>
                        <span className="font-medium">${currentPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Quantité</span>
                        <span className="font-medium">{quantity}</span>
                      </div>
                      <div className="border-t pt-2 mt-2 flex justify-between items-center">
                        <span className="font-semibold">Total</span>
                        <span className="text-2xl font-bold text-primary">
                          ${totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={handleCreatePaymentIntent}
                      className="w-full"
                      disabled={isCreatingIntent}
                      data-testid="button-proceed-to-payment"
                    >
                      {isCreatingIntent ? "Préparation..." : "Continuer vers le paiement"}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <div className="text-6xl font-bold text-primary mb-4">
                      ${currentPrice.toFixed(2)}
                    </div>
                    <p className="text-lg text-muted-foreground mb-6">par action</p>
                    <Button
                      onClick={handleStartPurchase}
                      size="lg"
                      className="px-8"
                      data-testid="button-start-purchase"
                    >
                      Commencer l'achat
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-6">
            {myShares?.summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card data-testid="card-total-shares-owned">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total d'actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{myShares.summary.totalShares}</div>
                  </CardContent>
                </Card>

                <Card data-testid="card-current-value">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Valeur actuelle</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${myShares.summary.currentValue.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-profit-loss">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Gain/Perte</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold flex items-center gap-2 ${
                      myShares.summary.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {myShares.summary.profitLoss >= 0 ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5" />
                      )}
                      ${Math.abs(myShares.summary.profitLoss).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {myShares.summary.profitLossPercentage >= 0 ? '+' : ''}
                      {myShares.summary.profitLossPercentage.toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Share Holdings */}
            {myShares?.shares && myShares.shares.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Mes achats</CardTitle>
                  <CardDescription>Historique de vos acquisitions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {myShares.shares.map((share: any, index: number) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted"
                        data-testid={`share-holding-${index}`}
                      >
                        <div>
                          <div className="font-semibold">{share.quantity} actions</div>
                          <div className="text-sm text-muted-foreground">
                            Acheté le {new Date(share.purchasedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${share.totalCost.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            @ ${share.purchasePrice.toFixed(2)}/action
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    Vous ne possédez pas encore d'actions
                  </p>
                  <Button onClick={() => document.querySelector<HTMLElement>('[data-testid="tab-purchase"]')?.click()}>
                    Acheter des actions
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
