import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Heart, Star, Crown, Gem, Zap, Trophy, Gift as GiftIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { GiftType } from "@shared/schema";

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  videoId?: string;
}

const iconMap: Record<string, any> = {
  Heart,
  Star,
  Crown,
  Gem,
  Zap,
  Trophy,
  GiftIcon,
};

export function GiftModal({ isOpen, onClose, recipientId, videoId }: GiftModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: giftTypes } = useQuery<GiftType[]>({
    queryKey: ["/api/gift-types"],
    enabled: isOpen,
  });

  const sendGiftMutation = useMutation({
    mutationFn: async (data: { giftTypeId: string; quantity: number }) => {
      return await apiRequest("POST", "/api/gifts/send", {
        giftTypeId: data.giftTypeId,
        recipientId,
        videoId,
        quantity: data.quantity,
      });
    },
    onSuccess: () => {
      toast({
        title: "Gift Sent!",
        description: `You sent ${quantity} ${selectedGift?.name}${quantity > 1 ? "s" : ""}!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setSelectedGift(null);
      setQuantity(1);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Gift",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendGift = () => {
    if (!selectedGift) return;

    const totalCost = selectedGift.creditCost * quantity;
    const userBalance = user?.creditBalance || 0;

    if (totalCost > userBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough YimiCoins. Visit the shop to buy more!",
        variant: "destructive",
      });
      return;
    }

    sendGiftMutation.mutate({
      giftTypeId: selectedGift.id,
      quantity,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-poppins text-2xl">Send a Gift</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="w-4 h-4 text-primary" />
            <span>Your balance: <strong className="text-foreground">{(user?.creditBalance || 0).toLocaleString()} YimiCoins</strong></span>
          </div>
        </DialogHeader>

        {/* Gift Selection */}
        <div className="space-y-6 mt-4">
          <div>
            <h3 className="text-sm font-medium mb-3">Choose a gift</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {giftTypes?.map((gift) => {
                const IconComponent = iconMap[gift.iconName] || GiftIcon;
                const isSelected = selectedGift?.id === gift.id;

                return (
                  <button
                    key={gift.id}
                    onClick={() => {
                      setSelectedGift(gift);
                      setQuantity(1);
                    }}
                    className={`p-4 rounded-lg border-2 transition-all hover-elevate ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    data-testid={`gift-${gift.id}`}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                      style={{ backgroundColor: gift.color || "#e91e63" }}
                    >
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-sm font-poppins font-semibold mb-1">{gift.name}</div>
                    <div className="flex items-center justify-center gap-1 text-xs text-primary">
                      <Coins className="w-3 h-3" />
                      <span>{gift.creditCost}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Selection */}
          {selectedGift && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Quantity</h3>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  data-testid="button-decrease-quantity"
                >
                  -
                </Button>
                <div className="flex-1 text-center">
                  <div className="text-2xl font-poppins font-bold">{quantity}</div>
                  <div className="text-xs text-muted-foreground">
                    {(selectedGift.creditCost * quantity).toLocaleString()} YimiCoins
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  data-testid="button-increase-quantity"
                >
                  +
                </Button>
              </div>

              {/* Quick Quantities */}
              <div className="flex gap-2 justify-center">
                {[1, 5, 10, 25].map((num) => (
                  <Button
                    key={num}
                    variant={quantity === num ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuantity(num)}
                    data-testid={`button-quantity-${num}`}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedGift && (
            <div className="p-4 rounded-lg bg-card space-y-3">
              <h3 className="text-sm font-medium">Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gift</span>
                  <span className="font-medium">{selectedGift.name} × {quantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="font-medium text-primary">
                    {(selectedGift.creditCost * quantity).toLocaleString()} YimiCoins
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Creator Receives</span>
                  <span className="font-poppins font-bold text-primary">
                    ${((selectedGift.usdValue * quantity) * 0.6).toFixed(2)} USD (60%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              className="flex-1 font-poppins font-semibold"
              size="lg"
              onClick={handleSendGift}
              disabled={!selectedGift || sendGiftMutation.isPending}
              data-testid="button-send-gift"
            >
              {sendGiftMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <GiftIcon className="w-5 h-5 mr-2" />
                  Send Gift
                </>
              )}
            </Button>
            <Button variant="outline" size="lg" onClick={onClose} data-testid="button-cancel-gift">
              Cancel
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Gifts support creators directly. 60% goes to the creator, 40% supports platform infrastructure.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
