import { useEffect } from 'react';
import { Gift, Check, MapPin, Smartphone, Navigation, X, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useNewCustomerOfferRedemption } from '@/app/hooks/useNewCustomerOfferRedemption';
import { NfcPermissionDialog } from '@/app/components/NfcPermissionDialog';
import confetti from 'canvas-confetti';

interface NewCustomerOffer {
  id: string;
  title: string;
  description: string | null;
  bonus_stamps: number;
  merchant_customer_id: string;
}

interface MerchantInfo {
  name: string;
  company_name: string | null;
  logo_url: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface NewCustomerOfferDialogProps {
  offer: NewCustomerOffer | null;
  merchant: MerchantInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRedemptionComplete: () => void;
}

export const NewCustomerOfferDialog = ({
  offer,
  merchant,
  open,
  onOpenChange,
  onRedemptionComplete,
}: NewCustomerOfferDialogProps) => {
  const { user } = useAuth();
  
  const {
    isRedeeming,
    isScanning,
    redemptionSuccess,
    error,
    showPermissionDialog,
    permissionDialogType,
    startRedemption,
    cancelRedemption,
    reset,
    retryAfterPermission,
    closePermissionDialog,
  } = useNewCustomerOfferRedemption({
    userId: user?.id,
    merchantId: offer?.merchant_customer_id || '',
    merchantName: merchant?.company_name || merchant?.name || '',
    bonusStamps: offer?.bonus_stamps || 0,
    onSuccess: () => {
      onRedemptionComplete();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  if (!offer || !merchant) return null;

  const merchantName = merchant.company_name || merchant.name;
  const streetWithNumber = [merchant.street, merchant.house_number].filter(Boolean).join(' ');
  const address = [streetWithNumber, merchant.postal_code, merchant.city].filter(Boolean).join(', ');

  const openInMaps = () => {
    if (merchant.latitude && merchant.longitude) {
      window.open(`https://maps.google.com/?q=${merchant.latitude},${merchant.longitude}`, '_blank');
    } else if (address) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
    }
  };

  const handleClose = () => {
    if (isScanning) {
      cancelRedemption();
    }
    onOpenChange(false);
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
              Willkommen!
            </h2>
            <p className="text-muted-foreground mb-4">
              Deine Neukundenprämie wurde erfolgreich eingelöst.
            </p>
            <div className="bg-muted rounded-lg p-4 mb-4">
              <p className="font-semibold text-foreground">{offer.title}</p>
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
              <Button onClick={startRedemption} className="flex-1">
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
                Neukundenprämie:
              </p>
              <p className="font-semibold text-foreground">{offer.title}</p>
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

  // Initial state - show offer details
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Neukundenprämie</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Merchant Logo */}
          <div className="flex justify-center">
            {merchant.logo_url ? (
              <img 
                src={merchant.logo_url} 
                alt={merchantName}
                className="w-20 h-20 rounded-full object-cover border-4 border-primary/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {merchantName.charAt(0)}
              </div>
            )}
          </div>

          {/* Merchant Name & Offer */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-foreground">{merchantName}</h3>
            <p className="text-xl font-bold text-primary mt-2">{offer.title}</p>
          </div>

          {/* Description */}
          {offer.description && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">{offer.description}</p>
            </div>
          )}

          {/* Address */}
          {address && (
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Adresse</p>
                  <p className="text-sm text-muted-foreground">{address}</p>
                </div>
                <Button variant="outline" size="sm" onClick={openInMaps}>
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Redemption Instructions */}
          <div className="space-y-3">
            <p className="text-sm text-center text-muted-foreground">
              Besuche das Geschäft, zeige dem Mitarbeiter diesen Bildschirm und lasse dir deinen ersten Stempel geben.
            </p>
            <Button onClick={startRedemption} className="w-full" size="lg">
              Jetzt einlösen
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* NFC Permission Fallback Dialog */}
      <NfcPermissionDialog
        open={showPermissionDialog}
        onOpenChange={closePermissionDialog}
        onRetry={retryAfterPermission}
        type={permissionDialogType}
      />
    </Dialog>
  );
};
