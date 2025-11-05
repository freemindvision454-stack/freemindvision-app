import { useStripe, useElements, PaymentElement, Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard } from "lucide-react";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.warn("VITE_STRIPE_PUBLIC_KEY not set - Stripe payments will not work");
}

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

function CheckoutForm({ packageName, amount }: { packageName: string; amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/shop?payment=success`,
      },
    });

    if (error) {
      toast({
        title: "Paiement échoué",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setLocation("/shop")}
          className="flex-1"
          data-testid="button-back-to-shop"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1"
          data-testid="button-confirm-payment"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Traitement...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Payer ${amount.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState("");
  const [packageInfo, setPackageInfo] = useState<{ name: string; amount: number } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const packageId = params.get("package");

    if (!packageId) {
      setLocation("/shop");
      return;
    }

    apiRequest("POST", "/api/create-payment-intent", { packageId })
      .then((data: any) => {
        setClientSecret(data.clientSecret);
        setPackageInfo({ name: data.packageName || "Package", amount: data.amount || 0 });
      })
      .catch(() => {
        setLocation("/shop");
      });
  }, [setLocation]);

  if (!stripePromise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Configuration requise</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Les paiements Stripe ne sont pas encore configurés. L'administrateur doit ajouter les clés API Stripe.
            </p>
            <Button onClick={() => setLocation("/shop")} className="w-full">
              Retour à la boutique
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Initialisation du paiement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-poppins">
              Finaliser votre achat
            </CardTitle>
            {packageInfo && (
              <p className="text-muted-foreground">
                {packageInfo.name} - ${packageInfo.amount.toFixed(2)} USD
              </p>
            )}
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm 
                packageName={packageInfo?.name || "Package"} 
                amount={packageInfo?.amount || 0} 
              />
            </Elements>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Paiement sécurisé:</strong> Vos informations de paiement sont cryptées et sécurisées par Stripe. Nous ne stockons jamais vos données bancaires.
          </p>
        </div>
      </div>
    </div>
  );
}
