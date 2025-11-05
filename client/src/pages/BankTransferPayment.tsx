import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { CreditPackage } from "@shared/schema";
import { ArrowLeft, Building2, Copy, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BankTransferPayment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [packageId, setPackageId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pkgId = params.get("package");
    
    if (!pkgId) {
      setLocation("/shop");
      return;
    }
    
    setPackageId(pkgId);
  }, [setLocation]);

  const { data: packages } = useQuery<CreditPackage[]>({
    queryKey: ["/api/credit-packages"],
  });

  const selectedPackage = packages?.find((p) => p.id === packageId);

  const bankDetails = {
    bankName: "ECO BANQUE",
    accountName: "FREEMIND VISION SARL",
    accountNumber: "BJ123-456-789-0123456",
    swiftCode: "ECOBBJBJ",
    reference: `YIMI-${packageId?.slice(0, 8).toUpperCase()}`,
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: "Copié!",
      description: `${field} copié dans le presse-papiers`,
    });
    setTimeout(() => setCopiedField(null), 2000);
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
            <div className="w-16 h-16 rounded-lg bg-green-500 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-poppins">
              Virement bancaire
            </CardTitle>
            <p className="text-muted-foreground">
              {selectedPackage.name} - ${selectedPackage.priceUsd.toFixed(2)} USD ({(selectedPackage.priceUsd * 655).toFixed(0)} FCFA)
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription>
                Effectuez un virement bancaire vers le compte ci-dessous. Vos YimiCoins seront ajoutés après confirmation du paiement (1-3 jours ouvrables).
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="font-medium">Coordonnées bancaires</h3>

              <div className="space-y-3">
                {[
                  { label: "Banque", value: bankDetails.bankName, field: "bank" },
                  { label: "Titulaire du compte", value: bankDetails.accountName, field: "name" },
                  { label: "Numéro de compte", value: bankDetails.accountNumber, field: "account" },
                  { label: "Code SWIFT/BIC", value: bankDetails.swiftCode, field: "swift" },
                  { label: "Référence (IMPORTANT)", value: bankDetails.reference, field: "reference" },
                ].map((item) => (
                  <div key={item.field} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                    <div>
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                      <div className="font-mono font-medium">{item.value}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(item.value, item.label)}
                      data-testid={`button-copy-${item.field}`}
                    >
                      {copiedField === item.label ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border">
              <h3 className="font-medium mb-2">Montant à transférer</h3>
              <div className="text-3xl font-poppins font-bold">
                {(selectedPackage.priceUsd * 655).toFixed(0)} FCFA
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                (${selectedPackage.priceUsd.toFixed(2)} USD)
              </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                Instructions importantes
              </h3>
              <ul className="text-sm text-amber-900/80 dark:text-amber-100/80 space-y-1 list-disc list-inside">
                <li>Incluez TOUJOURS la référence <strong>{bankDetails.reference}</strong> dans le motif du virement</li>
                <li>Le traitement peut prendre 1 à 3 jours ouvrables</li>
                <li>Vous recevrez une notification par email une fois les YimiCoins ajoutés</li>
                <li>Conservez votre reçu de virement comme preuve de paiement</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setLocation("/shop")}
                className="flex-1"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la boutique
              </Button>
              <Button
                onClick={() => {
                  toast({
                    title: "Instructions envoyées",
                    description: "Les coordonnées bancaires ont été envoyées par email",
                  });
                  setLocation("/shop");
                }}
                className="flex-1"
                data-testid="button-confirm"
              >
                J'ai effectué le virement
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Support:</strong> Si vous avez des questions ou si votre paiement n'est pas validé après 3 jours, contactez notre support avec votre référence de virement.
          </p>
        </div>
      </div>
    </div>
  );
}
