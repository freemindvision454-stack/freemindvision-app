import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Users, DollarSign, Clock, Gift, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";

interface ReferralStats {
  totalReferrals: number;
  totalBonus: number;
  pendingReferrals: number;
}

interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  referralCode: string;
  bonusAwarded: number;
  status: string;
  createdAt: string;
}

export default function Referral() {
  const { toast } = useToast();
  const [codeInput, setCodeInput] = useState("");

  const { data: codeData, isLoading: codeLoading } = useQuery<{ code: string }>({
    queryKey: ["/api/referral/code"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ReferralStats>({
    queryKey: ["/api/referral/stats"],
  });

  const { data: referrals = [], isLoading: referralsLoading } = useQuery<Referral[]>({
    queryKey: ["/api/referral/list"],
  });

  const applyCodeMutation = useMutation({
    mutationFn: async (referralCode: string) => {
      return await apiRequest("POST", "/api/referral/apply", { referralCode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referral/list"] });
      setCodeInput("");
      toast({
        title: "Succès !",
        description: "Code de parrainage appliqué avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Code de parrainage invalide",
        variant: "destructive",
      });
    },
  });

  const referralCode = codeData?.code || "";
  const referralUrl = referralCode ? `${window.location.origin}?ref=${referralCode}` : "";

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: "Copié !",
      description: "Code de parrainage copié dans le presse-papiers",
    });
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(referralUrl);
    toast({
      title: "Copié !",
      description: "Lien de parrainage copié dans le presse-papiers",
    });
  };

  const shareReferral = () => {
    if (navigator.share) {
      navigator.share({
        title: "Rejoignez FreeMind Vision",
        text: `Utilisez mon code de parrainage ${referralCode} et gagnez des YimiCoins !`,
        url: referralUrl,
      });
    } else {
      copyUrl();
    }
  };

  if (codeLoading || statsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Gift className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-poppins font-bold" data-testid="heading-referral">
          Programme de parrainage
        </h1>
      </div>

      {/* Referral Code Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20" data-testid="card-referral-code">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Votre code de parrainage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="bg-background border-2 border-primary/30 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Code de parrainage</p>
                <p className="text-3xl font-poppins font-bold text-primary" data-testid="text-referral-code">
                  {referralCode}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={copyCode} variant="outline" data-testid="button-copy-code">
                <Copy className="w-4 h-4 mr-2" />
                Copier le code
              </Button>
              <Button onClick={copyUrl} variant="outline" data-testid="button-copy-url">
                <Copy className="w-4 h-4 mr-2" />
                Copier le lien
              </Button>
              <Button onClick={shareReferral} variant="default" data-testid="button-share">
                <Share2 className="w-4 h-4 mr-2" />
                Partager
              </Button>
            </div>
          </div>

          <div className="bg-background/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Comment ça marche ?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">1.</span>
                Partagez votre code de parrainage avec vos amis
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">2.</span>
                Ils s'inscrivent en utilisant votre code
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">3.</span>
                Vous recevez 100 YimiCoins par parrainage réussi
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Use Referral Code Card */}
      <Card data-testid="card-use-code">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Utiliser un code de parrainage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="text"
              placeholder="Entrez un code de parrainage"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              className="flex-1"
              data-testid="input-referral-code"
            />
            <Button 
              onClick={() => applyCodeMutation.mutate(codeInput)}
              disabled={!codeInput || applyCodeMutation.isPending}
              data-testid="button-apply-code"
            >
              {applyCodeMutation.isPending ? "Application..." : "Appliquer"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Vous avez reçu un code de parrainage ? Entrez-le ici pour commencer !
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-referrals">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total parrainages
            </CardTitle>
            <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded-lg">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-referrals">
              {stats?.totalReferrals || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Personnes parrainées
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-bonus">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Bonus gagnés
            </CardTitle>
            <div className="bg-green-50 dark:bg-green-950 p-2 rounded-lg">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-bonus">
              {stats?.totalBonus || 0} YimiCoins
            </div>
            <p className="text-xs text-muted-foreground">
              Total des récompenses
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-referrals">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              En attente
            </CardTitle>
            <div className="bg-orange-50 dark:bg-orange-950 p-2 rounded-lg">
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-referrals">
              {stats?.pendingReferrals || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Parrainages en cours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referrals List */}
      <Card data-testid="card-referrals-list">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Historique des parrainages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {referralsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun parrainage pour le moment</p>
              <p className="text-sm mt-1">
                Commencez à partager votre code pour gagner des bonus !
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral, index) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                  data-testid={`referral-item-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Parrainage #{index + 1}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(referral.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      +{referral.bonusAwarded} YimiCoins
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {referral.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
