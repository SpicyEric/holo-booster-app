import { useEffect } from 'react';
import { Gift, Check, Smartphone, X, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useRewardRedemption } from '@/app/hooks/useRewardRedemption';
import confetti from 'canvas-confetti';

interface Reward {
  id: string;
  title: string;
  description: string | null;
  points_required: number;
  image_url: string | null;
}

interface RewardRedemptionDialogProps {
  reward: Reward | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPoints: number;
  merchantId: string;
  merchantName: string;
  onPointsUpdated: (newPoints: number) => void;
}

export const RewardRedemptionDialog = ({
  reward,
  open,
  onOpenChange,
  userPoints,
  merchantId,
  merchantName,
  onPointsUpdated,
}: RewardRedemptionDialogProps) => {
  const { user } = useAuth();
  
  const {
    isRedeeming,
    isScanning,
    redemptionSuccess,
    error,
    startRedemption,
    cancelRedemption,
    reset,
  } = useRewardRedemption({
    userId: user?.id,
    merchantId,
    merchantName,
    rewardTitle: reward?.title || '',
    onSuccess: (pointsChange) => {
      onPointsUpdated(userPoints + pointsChange);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  if (!reward) return null;

  const canRedeem = userPoints >= reward.points_required;
  const pointsNeeded = reward.points_required - userPoints;

  const handleClose = () => {
    if (isScanning) {
      cancelRedemption();
    }
    onOpenChange(false);
  };

  const handleStartRedemption = () => {
    startRedemption(reward.id, reward.points_required);
  };

  // Success state
  if (redemptionSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm mx-auto">
          <div className="text-center py-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Herzlichen Glückwunsch!
            </h2>
            <p className="text-muted-foreground mb-4">
              Deine Prämie wurde erfolgreich eingelöst.
            </p>
            <div className="bg-muted rounded-lg p-4 mb-4">
              <p className="font-semibold text-foreground">{reward.title}</p>
              <p className="text-sm text-red-600 font-medium mt-1">
                -{reward.points_required} Punkte
              </p>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Zeige diesen Bildschirm dem Mitarbeiter, um deine Prämie zu erhalten.
            </p>
            <Button onClick={handleClose} className="w-full">
              Fertig
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state
  if (error && !isScanning) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm mx-auto">
          <div className="text-center py-6">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Fehler
            </h2>
            <p className="text-muted-foreground mb-6">
              {error}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Abbrechen
              </Button>
              <Button onClick={handleStartRedemption} className="flex-1">
                Erneut versuchen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Scanning state - waiting for NFC
  if (isScanning) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm mx-auto" onPointerDownOutside={(e) => e.preventDefault()}>
          <div className="text-center py-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Smartphone className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Stempel scannen
            </h2>
            <p className="text-muted-foreground mb-4">
              Bitte halte jetzt den NFC-Stempel von <strong>{merchantName}</strong> an dein Handy.
            </p>
            <div className="bg-muted rounded-lg p-4 mb-4">
              <p className="text-sm text-muted-foreground">
                Einzulösende Prämie:
              </p>
              <p className="font-semibold text-foreground">{reward.title}</p>
              <p className="text-sm text-red-600 mt-1">-{reward.points_required} Punkte</p>
            </div>
            <Button variant="outline" onClick={cancelRedemption} className="w-full">
              <X className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Initial state - show reward details
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Prämie</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Reward Image or Icon */}
          <div className="flex justify-center">
            {reward.image_url ? (
              <img 
                src={reward.image_url} 
                alt={reward.title}
                className="w-24 h-24 rounded-xl object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-primary/10 flex items-center justify-center">
                <Gift className="h-12 w-12 text-primary" />
              </div>
            )}
          </div>

          {/* Reward Title */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-foreground">{reward.title}</h3>
            <Badge variant="secondary" className="mt-2">
              {reward.points_required} Punkte
            </Badge>
          </div>

          {/* Description */}
          {reward.description && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">{reward.description}</p>
            </div>
          )}

          {/* Current Points */}
          <div className="text-center text-sm text-muted-foreground">
            Dein Punktestand: <strong className="text-foreground">{userPoints} Punkte</strong>
          </div>

          {/* Redemption Button or Points Needed */}
          {canRedeem ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Zeige dem Mitarbeiter diesen Bildschirm und lasse dir die Prämie abstempeln.
              </p>
              <Button onClick={handleStartRedemption} className="w-full" size="lg">
                Jetzt einlösen
              </Button>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
              <p className="text-orange-700 font-medium">
                Dir fehlen noch {pointsNeeded} Punkte
              </p>
              <p className="text-sm text-orange-600 mt-1">
                Du hast {userPoints} von {reward.points_required} Punkten
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
