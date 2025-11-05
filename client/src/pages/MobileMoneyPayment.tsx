import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CreditPackage } from "@shared/schema";
import { ArrowLeft, Smartphone, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type MobileMoneyProvider = "orange_money" | "mtn_money" | "wave";

const providerInfo = {
  orange_money: {
    name: "Orange Money",
    color: "bg-orange-500",
    instructions: "Composez *144# puis suivez les instructions pour valider le paiement",
    phoneFormat: "+225 XX XX XX XX XX",
  },
  mtn_money: {
    name: "MTN Money",
    color: "bg-yellow-500",
    instructions: "Composez *133# puis suivez les instructions pour valider le paiement",
    phoneFormat: "+225 XX XX XX XX XX",
  },
  wave: {
    name: "Wave",
    color: "bg-blue-500",
    instructions: "Vous recevrez une notification Wave pour valider le paiement",
    phoneFormat: "+225 XX XX XX XX XX",
  },
};

export default function MobileMoneyPayment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [provider, setProvider] = useState<MobileMoneyProvider>("orange_money");
  const [packageId, setPackageId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pkgId = params.get("package");
    const pathProvider = window.location.pathname.split("/").pop() as MobileMoneyProvider;
    
    if (!pkgId) {
      setLocation("/shop");
      return;
    }
    
    setPackageId(pkgId);
    if (providerInfo[pathProvider]) {
      setProvider(pathProvider);
    }
  }, [setLocation]);

  const { data: packages } = useQuery<CreditPackage[]>({
    queryKey: ["/api/credit-packages"],
  });

  const selectedPackage = packages?.find((p) => p.id === packageId);

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!packageId) throw new Error("No package selected");
      
      // Initiate Mobile Money payment
      return await apiRequest("POST", "/api/mobile-money/initiate", {
        packageId,
        provider,
        phoneNumber,
      });
    },
    onSuccess: () => {
      toast({
        title: "Paiement en cours",
        description: "Vérifiez votre téléphone pour valider le paiement",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setTimeout(() => {
        setLocation("/shop");
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur de paiement",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Numéro invalide",
        description: "Veuillez entrer un numéro de téléphone valide",
        variant: "destructive",
      });
      return;
    }

    paymentMutation.mutate();
  };

  if (!selectedPackage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <div className={`w-16 h-16 rounded-lg ${providerInfo[provider].color} flex items-center justify-center mb-4`}>
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-poppins">
              Paiement {providerInfo[provider].name}
            </CardTitle>
            <p className="text-muted-foreground">
              {selectedPackage.name} - ${selectedPackage.priceUsd.toFixed(2)} USD ({(selectedPackage.priceUsd * 655).toFixed(0)} FCFA)
            </p>
          </CardHeader>

          <CardContent>
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {providerInfo[provider].instructions}
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone {providerInfo[provider].name}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={providerInfo[provider].phoneFormat}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  data-testid="input-phone-number"
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  Le numéro doit être actif avec un solde suffisant
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border">
                <h3 className="font-medium mb-2">Détails du paiement</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Package:</span>
                    <span className="font-medium">{selectedPackage.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">YimiCoins:</span>
                    <span className="font-medium">{selectedPackage.credits + selectedPackage.bonus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant:</span>
                    <span className="font-medium">{(selectedPackage.priceUsd * 655).toFixed(0)} FCFA</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/shop")}
                  className="flex-1"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <Button
                  type="submit"
                  disabled={paymentMutation.isPending}
                  className="flex-1"
                  data-testid="button-confirm-payment"
                >
                  {paymentMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Traitement...
                    </>
                  ) : (
                    "Confirmer le paiement"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Paiement sécurisé:</strong> Votre paiement est traité directement par {providerInfo[provider].name}. Aucune information bancaire n'est stockée sur nos serveurs.
          </p>
        </div>
      </div>
    </div>
  );
}
