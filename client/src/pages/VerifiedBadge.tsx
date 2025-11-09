import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, Shield, Upload, Clock, XCircle, AlertCircle } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

interface BadgePurchase {
  id: string;
  userId: string;
  priceUsd: string;
  priceFcfa: string;
  stripePaymentIntentId: string | null;
  status: "pending" | "completed" | "approved" | "rejected";
  submittedDocuments: string[] | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string;
}

function CheckoutForm({ documentUrls, onSuccess }: { documentUrls: string[]; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/verified-badge/purchase", {
        submittedDocuments: documentUrls,
      });
      const data = await response.json();
      return data as { purchase: BadgePurchase; clientSecret: string };
    },
    onSuccess: async (data) => {
      if (!stripe || !elements) {
        toast({
          title: "Erreur",
          description: "Stripe n'est pas configuré",
          variant: "destructive",
        });
        return;
      }

      setIsProcessing(true);

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        toast({
          title: "Erreur",
          description: "Élément de carte introuvable",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: cardElement },
      });

      setIsProcessing(false);

      if (confirmError) {
        toast({
          title: "Échec du paiement",
          description: confirmError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Paiement réussi !",
          description: "Votre demande de badge vérifié est en attente d'approbation.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/verified-badge/status"] });
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la demande",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    purchaseMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border rounded-lg bg-card">
        <Label className="mb-2 block">Informations de carte de crédit</Label>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "hsl(var(--foreground))",
                "::placeholder": {
                  color: "hsl(var(--muted-foreground))",
                },
              },
            },
          }}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!stripe || isProcessing || purchaseMutation.isPending}
        data-testid="button-purchase-badge"
      >
        {isProcessing || purchaseMutation.isPending ? "Traitement..." : "Acheter le Badge Vérifié"}
      </Button>
    </form>
  );
}

export default function VerifiedBadge() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [documentUrls, setDocumentUrls] = useState<string[]>(["", ""]);

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

  const { data: purchase, isLoading: purchaseLoading, refetch } = useQuery<BadgePurchase | null>({
    queryKey: ["/api/verified-badge/status"],
    enabled: isAuthenticated,
  });

  const handleDocumentUrlChange = (index: number, value: string) => {
    const newUrls = [...documentUrls];
    newUrls[index] = value;
    setDocumentUrls(newUrls);
  };

  const addDocumentUrl = () => {
    setDocumentUrls([...documentUrls, ""]);
  };

  const removeDocumentUrl = (index: number) => {
    setDocumentUrls(documentUrls.filter((_, i) => i !== index));
  };

  const validDocumentUrls = documentUrls.filter(url => url.trim().length > 0);

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

  // Already verified
  if (user.isVerified) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Card className="text-center" data-testid="already-verified">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-primary" />
                </div>
              </div>
              <CardTitle className="font-poppins text-2xl">Déjà Vérifié !</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Votre compte est déjà vérifié. Le badge vérifié apparaît sur votre profil.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Purchase exists - show status
  if (purchase) {
    const statusConfig = {
      pending: {
        icon: Clock,
        color: "text-yellow-600",
        bg: "bg-yellow-50 dark:bg-yellow-950",
        title: "En Attente de Paiement",
        description: "Votre demande est en attente de paiement.",
      },
      completed: {
        icon: Clock,
        color: "text-blue-600",
        bg: "bg-blue-50 dark:bg-blue-950",
        title: "En Attente d'Approbation",
        description: "Paiement reçu. Votre demande est en cours de vérification par notre équipe.",
      },
      approved: {
        icon: CheckCircle,
        color: "text-green-600",
        bg: "bg-green-50 dark:bg-green-950",
        title: "Approuvé !",
        description: "Votre badge vérifié a été approuvé et activé sur votre profil.",
      },
      rejected: {
        icon: XCircle,
        color: "text-red-600",
        bg: "bg-red-50 dark:bg-red-950",
        title: "Rejeté",
        description: purchase.rejectionReason || "Votre demande a été rejetée.",
      },
    };

    const config = statusConfig[purchase.status as keyof typeof statusConfig];
    const StatusIcon = config.icon;

    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Card className="text-center" data-testid={`status-${purchase.status}`}>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${config.bg}`}>
                  <StatusIcon className={`w-12 h-12 ${config.color}`} />
                </div>
              </div>
              <CardTitle className="font-poppins text-2xl">{config.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{config.description}</p>
              
              {purchase.submittedDocuments && purchase.submittedDocuments.length > 0 && (
                <div className="text-left" data-testid="submitted-documents">
                  <Label className="mb-2 block">Documents soumis :</Label>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {purchase.submittedDocuments.map((url, index) => (
                      <li key={index}>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Document {index + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {purchase.status === "rejected" && (
                <Button onClick={() => window.location.reload()} variant="outline" data-testid="button-retry">
                  Réessayer
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // No purchase - show purchase form
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-12 h-12 text-white" />
            </div>
          </div>
          <Badge variant="outline" className="mb-4" data-testid="badge-verified-label">
            Badge Vérifié
          </Badge>
          <h1 className="text-4xl md:text-5xl font-poppins font-bold mb-4">
            Obtenez votre Badge Vérifié
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Augmentez votre crédibilité et démarquez-vous avec le badge vérifié officiel de FreeMind Vision.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Benefits */}
          <Card>
            <CardHeader>
              <CardTitle className="font-poppins">Avantages du Badge</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3" data-testid="benefits-list">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Crédibilité accrue auprès de votre audience</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Distinction visuelle sur votre profil</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Accès prioritaire au support</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Badge permanent (paiement unique)</span>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="font-poppins">Tarification</CardTitle>
            </CardHeader>
            <CardContent data-testid="pricing-info">
              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-poppins font-bold" data-testid="price-usd">
                    $50
                  </span>
                  <span className="text-muted-foreground">USD</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1" data-testid="price-fcfa">
                  ou 30,000 FCFA
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Paiement unique • Vérification manuelle sous 48h
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Purchase Form */}
        <Card>
          <CardHeader>
            <CardTitle className="font-poppins">Formulaire de Demande</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document URLs */}
            <div>
              <Label className="mb-2 block">
                Documents de vérification
                <span className="text-xs text-muted-foreground ml-2">
                  (Minimum 1 document requis)
                </span>
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                Téléchargez vos documents (pièce d'identité, certificat d'entreprise, etc.) sur Google Drive, Dropbox ou autre, puis collez les URLs ci-dessous.
              </p>
              <div className="space-y-3">
                {documentUrls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={url}
                      onChange={(e) => handleDocumentUrlChange(index, e.target.value)}
                      data-testid={`input-document-url-${index}`}
                    />
                    {documentUrls.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDocumentUrl(index)}
                        data-testid={`button-remove-document-${index}`}
                      >
                        <XCircle className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDocumentUrl}
                className="mt-3"
                data-testid="button-add-document"
              >
                <Upload className="w-4 h-4 mr-2" />
                Ajouter un document
              </Button>
            </div>

            {/* Stripe Checkout */}
            {stripePromise && validDocumentUrls.length > 0 ? (
              <Elements stripe={stripePromise}>
                <CheckoutForm
                  documentUrls={validDocumentUrls}
                  onSuccess={() => refetch()}
                />
              </Elements>
            ) : validDocumentUrls.length === 0 ? (
              <div className="p-4 bg-muted rounded-lg text-center" data-testid="missing-documents-warning">
                <p className="text-sm text-muted-foreground">
                  Veuillez ajouter au moins un document pour continuer.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-destructive/10 rounded-lg text-center" data-testid="stripe-not-configured">
                <p className="text-sm text-destructive">
                  Le paiement Stripe n'est pas configuré. Contactez l'administrateur.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
