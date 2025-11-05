import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Building2,
  Check,
  ArrowRight
} from "lucide-react";
import type { CreditPackage } from "@shared/schema";

interface PaymentMethodModalProps {
  open: boolean;
  onClose: () => void;
  selectedPackage: CreditPackage | null;
}

type PaymentMethod = "stripe" | "orange_money" | "mtn_money" | "wave" | "bank_transfer";

const paymentMethods = [
  {
    id: "stripe" as PaymentMethod,
    name: "Carte bancaire",
    description: "Visa, Mastercard, American Express",
    icon: CreditCard,
    color: "bg-primary/10 text-primary",
    available: true,
    recommended: true,
  },
  {
    id: "orange_money" as PaymentMethod,
    name: "Orange Money",
    description: "Paiement mobile Money",
    icon: Smartphone,
    color: "bg-orange-500/10 text-orange-600",
    available: true,
    comingSoon: false,
  },
  {
    id: "mtn_money" as PaymentMethod,
    name: "MTN Money",
    description: "Mobile Money MTN",
    icon: Smartphone,
    color: "bg-yellow-500/10 text-yellow-600",
    available: true,
    comingSoon: false,
  },
  {
    id: "wave" as PaymentMethod,
    name: "Wave",
    description: "Paiement Wave instantané",
    icon: Smartphone,
    color: "bg-blue-500/10 text-blue-600",
    available: true,
    comingSoon: false,
  },
  {
    id: "bank_transfer" as PaymentMethod,
    name: "Virement bancaire",
    description: "ECO BANQUE et autres banques",
    icon: Building2,
    color: "bg-green-500/10 text-green-600",
    available: true,
    comingSoon: false,
  },
];

export function PaymentMethodModal({ open, onClose, selectedPackage }: PaymentMethodModalProps) {
  const [, setLocation] = useLocation();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const handleProceed = () => {
    if (!selectedMethod || !selectedPackage) return;

    if (selectedMethod === "stripe") {
      setLocation(`/checkout?package=${selectedPackage.id}`);
    } else {
      setLocation(`/payment/${selectedMethod}?package=${selectedPackage.id}`);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-poppins">
            Choisir votre méthode de paiement
          </DialogTitle>
          {selectedPackage && (
            <p className="text-muted-foreground">
              {selectedPackage.name} - ${selectedPackage.priceUsd.toFixed(2)} USD
            </p>
          )}
        </DialogHeader>

        <div className="space-y-3 py-4">
          {paymentMethods.map((method) => (
            <Card
              key={method.id}
              className={`p-4 cursor-pointer transition-all hover-elevate ${
                selectedMethod === method.id
                  ? "border-primary ring-2 ring-primary/20"
                  : ""
              } ${!method.available ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => method.available && setSelectedMethod(method.id)}
              data-testid={`payment-method-${method.id}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${method.color}`}>
                  <method.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{method.name}</h3>
                    {method.recommended && (
                      <Badge variant="default" className="text-xs">
                        Recommandé
                      </Badge>
                    )}
                    {method.comingSoon && (
                      <Badge variant="secondary" className="text-xs">
                        Bientôt
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{method.description}</p>
                </div>
                {selectedMethod === method.id && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            data-testid="button-cancel-payment"
          >
            Annuler
          </Button>
          <Button
            onClick={handleProceed}
            disabled={!selectedMethod}
            className="flex-1"
            data-testid="button-proceed-payment"
          >
            Continuer
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Paiements sécurisés:</strong> Toutes les transactions sont cryptées et sécurisées. Vos informations de paiement ne sont jamais stockées sur nos serveurs.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
